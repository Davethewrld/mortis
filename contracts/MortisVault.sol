// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import { FHE, euint64, externalEuint64 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title  MortisVault
 * @notice Trustless, encrypted digital inheritance using FHE (Zama Protocol).
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  WHAT THIS CONTRACT DOES                                            │
 * │                                                                     │
 * │  1. Owner deposits ETH. Balance stored as encrypted euint64.        │
 * │     No one — not validators, not Zama — can read it on-chain.       │
 * │                                                                     │
 * │  2. Owner calls ping() periodically to prove they are alive.        │
 * │     Missing the window for `triggerWindow` seconds arms the switch. │
 * │                                                                     │
 * │  3. Anyone calls requestTrigger(). The contract fires an async      │
 * │     decryption request to the Zama KMS coprocessor network.         │
 * │                                                                     │
 * │  4. KMS decrypts off-chain, calls inheritanceCallback() on-chain    │
 * │     with cleartext + proof. Contract transfers ETH to beneficiary.  │
 * └─────────────────────────────────────────────────────────────────────┘
 *
 * FHE primitives used:
 *   euint64                – encrypted balance (private state)
 *   FHE.add                – encrypted arithmetic on deposits
 *   FHE.allowThis          – lets contract operate on ciphertext
 *   FHE.allow              – access-controlled decryption per address
 *   FHE.requestDecryption  – async KMS decryption request
 *   FHE.checkSignatures    – verify KMS MPC proof in callback
 */
contract MortisVault is SepoliaConfig {

    // ─────────────────────────────────────────────────────────────────
    //  Immutable config (set once at deploy, never changes)
    // ─────────────────────────────────────────────────────────────────

    /// @notice Address that deployed this vault — the "testator"
    address public immutable owner;

    /// @notice Address that inherits if the switch fires
    address public immutable beneficiary;

    /// @notice Seconds of silence before inheritance can be claimed
    uint256 public immutable triggerWindow;

    // ─────────────────────────────────────────────────────────────────
    //  Private encrypted state (the heart of the FHE usage)
    // ─────────────────────────────────────────────────────────────────

    /// @dev Encrypted vault balance in wei.
    ///      Only `owner` has ACL permission to decrypt this.
    ///      After trigger fires, `beneficiary` is granted access too.
    euint64 private _encryptedBalance;

    // ─────────────────────────────────────────────────────────────────
    //  Public lifecycle state
    // ─────────────────────────────────────────────────────────────────

    /// @notice Timestamp of last proof-of-life ping
    uint256 public lastPing;

    /// @notice True once requestTrigger() has been successfully called
    bool public triggered;

    /// @notice True while waiting for KMS decryption callback
    bool public decryptionPending;

    /// @notice True once the beneficiary has been paid out
    bool public inherited;

    /// @notice The request ID returned by the KMS oracle (for callback matching)
    uint256 public decryptionRequestId;

    /// @notice Cleartext balance at the moment of inheritance (set in callback)
    uint64 public cleartextBalanceAtTrigger;

    // ─────────────────────────────────────────────────────────────────
    //  Events
    // ─────────────────────────────────────────────────────────────────

    event Deposited(address indexed from, uint256 amount);
    event Pinged(address indexed owner, uint256 timestamp, uint256 secondsRemaining);
    event TriggerRequested(address indexed caller, uint256 requestId);
    event Inherited(address indexed beneficiary, uint64 amount);
    event Withdrawn(address indexed owner, uint64 amount);

    // ─────────────────────────────────────────────────────────────────
    //  Custom errors (gas-efficient)
    // ─────────────────────────────────────────────────────────────────

    error NotOwner();
    error AlreadyTriggered();
    error AlreadyInherited();
    error TimerNotExpired();
    error DecryptionAlreadyPending();
    error DecryptionNotPending();
    error WrongRequestId();
    error ZeroDeposit();
    error AmountTooLarge();
    error TransferFailed();
    error NothingToWithdraw();
    error WindowTooShort();
    error ZeroBeneficiary();

    // ─────────────────────────────────────────────────────────────────
    //  Modifiers
    // ─────────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier notTriggered() {
        if (triggered) revert AlreadyTriggered();
        _;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Constructor
    // ─────────────────────────────────────────────────────────────────

    /**
     * @param _beneficiary   Who inherits if the switch fires.
     * @param _triggerWindow Seconds without a ping before inheritance unlocks.
     *                       Minimum 1 day. Recommended: 15552000 (180 days).
     */
    constructor(
        address _beneficiary,
        uint256 _triggerWindow
    ) payable {
        if (_beneficiary == address(0)) revert ZeroBeneficiary();
        if (_triggerWindow < 1 days)    revert WindowTooShort();

        owner         = msg.sender;
        beneficiary   = _beneficiary;
        triggerWindow = _triggerWindow;
        lastPing      = block.timestamp;

        // Initialise encrypted balance to zero and grant ACL
        _encryptedBalance = FHE.asEuint64(0);
        FHE.allowThis(_encryptedBalance);
        FHE.allow(_encryptedBalance, owner);

        // Support ETH sent at deployment time
        if (msg.value > 0) {
            _recordDeposit(uint64(msg.value));
            emit Deposited(msg.sender, msg.value);
        }
    }

    // ─────────────────────────────────────────────────────────────────
    //  Owner actions
    // ─────────────────────────────────────────────────────────────────

    /**
     * @notice Deposit ETH into the vault. Balance stored encrypted on-chain.
     * @dev    Converts msg.value (plaintext, provided by EVM) into an euint64
     *         and adds it to the encrypted running total.
     *
     *         Note: euint64 max is ~18.4 ETH per call. For larger vaults,
     *         call deposit() multiple times or upgrade to euint128.
     */
    function deposit() external payable onlyOwner notTriggered {
        if (msg.value == 0)                 revert ZeroDeposit();
        if (msg.value > type(uint64).max)   revert AmountTooLarge();

        _recordDeposit(uint64(msg.value));
        emit Deposited(msg.sender, msg.value);
    }

    /**
     * @notice Prove you are alive. Resets the countdown to zero.
     * @dev    Single on-chain call, ~21 000 gas. Schedule a reminder
     *         well before the window closes.
     */
    function ping() external onlyOwner notTriggered {
        uint256 remaining = _secondsUntilTrigger();
        lastPing = block.timestamp;
        emit Pinged(msg.sender, block.timestamp, remaining);
    }

    /**
     * @notice Owner withdraws all funds before the timer expires.
     * @dev    Triggers an async decryption — the KMS calls withdrawCallback().
     *         Owner must wait for the callback tx before funds arrive.
     */
    function requestWithdraw() external onlyOwner notTriggered {
        if (decryptionPending) revert DecryptionAlreadyPending();

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_encryptedBalance);

        decryptionPending   = true;
        decryptionRequestId = FHE.requestDecryption(
            handles,
            this.withdrawCallback.selector
        );
    }

    /**
     * @notice KMS callback for owner withdrawal.
     *         Called by the Zama Relayer after off-chain decryption.
     */
    function withdrawCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external returns (bool) {
        if (!decryptionPending)                  revert DecryptionNotPending();
        if (requestId != decryptionRequestId)    revert WrongRequestId();

        // Verify multi-party KMS signatures — reverts if tampered
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint64 amount     = abi.decode(cleartexts, (uint64));
        decryptionPending = false;

        if (amount == 0) revert NothingToWithdraw();

        // Zero out the encrypted balance
        _encryptedBalance = FHE.asEuint64(0);
        FHE.allowThis(_encryptedBalance);
        FHE.allow(_encryptedBalance, owner);

        (bool ok, ) = owner.call{ value: amount }("");
        if (!ok) revert TransferFailed();

        emit Withdrawn(owner, amount);
        return true;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Dead Man's Switch — callable by ANYONE after timer expires
    // ─────────────────────────────────────────────────────────────────

    /**
     * @notice Arm the dead man's switch. Can be called by anyone.
     * @dev    The only gate is the time check. No admin, no multisig, no lawyers.
     *         Fires an async decryption request to the Zama KMS coprocessor.
     *         Actual ETH transfer happens in inheritanceCallback().
     */
    function requestTrigger() external {
        if (triggered)                                          revert AlreadyTriggered();
        if (inherited)                                          revert AlreadyInherited();
        if (decryptionPending)                                  revert DecryptionAlreadyPending();
        if (block.timestamp <= lastPing + triggerWindow)        revert TimerNotExpired();

        triggered = true;
        decryptionPending = true;

        // ← KEY FHE STEP: grant beneficiary decrypt access to the balance
        //   so they can later verify the amount they received
        FHE.allow(_encryptedBalance, beneficiary);

        bytes32[] memory handles = new bytes32[](1);
        handles[0] = FHE.toBytes32(_encryptedBalance);

        decryptionRequestId = FHE.requestDecryption(
            handles,
            this.inheritanceCallback.selector
        );

        emit TriggerRequested(msg.sender, decryptionRequestId);
    }

    /**
     * @notice KMS callback — delivers the plaintext balance + cryptographic proof.
     * @dev    Called by the Zama Relayer after off-chain MPC decryption.
     *         The proof is verified on-chain via FHE.checkSignatures().
     *         No human, no relayer, no Zama employee can forge this result.
     */
    function inheritanceCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external returns (bool) {
        if (!decryptionPending)                  revert DecryptionNotPending();
        if (requestId != decryptionRequestId)    revert WrongRequestId();
        if (inherited)                           revert AlreadyInherited();

        // Verify KMS MPC signatures — this is where the math enforces honesty
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        uint64 amount = abi.decode(cleartexts, (uint64));

        decryptionPending         = false;
        inherited                 = true;
        cleartextBalanceAtTrigger = amount;

        if (amount > 0) {
            (bool ok, ) = beneficiary.call{ value: amount }("");
            if (!ok) revert TransferFailed();
        }

        emit Inherited(beneficiary, amount);
        return true;
    }

    // ─────────────────────────────────────────────────────────────────
    //  View functions
    // ─────────────────────────────────────────────────────────────────

    /**
     * @notice Seconds until the trigger becomes callable. 0 = already expired.
     */
    function secondsUntilTrigger() external view returns (uint256) {
        return _secondsUntilTrigger();
    }

    /**
     * @notice Full vault status in one call — useful for frontends.
     */
    function vaultStatus() external view returns (
        address _owner,
        address _beneficiary,
        bool    _triggered,
        bool    _inherited,
        bool    _decryptionPending,
        uint256 _lastPing,
        uint256 _triggerWindow,
        uint256 _secondsLeft,
        uint256 _ethHeld
    ) {
        return (
            owner,
            beneficiary,
            triggered,
            inherited,
            decryptionPending,
            lastPing,
            triggerWindow,
            _secondsUntilTrigger(),
            address(this).balance
        );
    }

    // ─────────────────────────────────────────────────────────────────
    //  Internal helpers
    // ─────────────────────────────────────────────────────────────────

    function _recordDeposit(uint64 amount) internal {
        euint64 addition  = FHE.asEuint64(amount);
        _encryptedBalance = FHE.add(_encryptedBalance, addition);

        // Always refresh ACL after mutation so contract + owner can operate
        FHE.allowThis(_encryptedBalance);
        FHE.allow(_encryptedBalance, owner);
    }

    function _secondsUntilTrigger() internal view returns (uint256) {
        uint256 deadline = lastPing + triggerWindow;
        if (block.timestamp >= deadline) return 0;
        return deadline - block.timestamp;
    }

    // ─────────────────────────────────────────────────────────────────
    //  Fallback — allow plain ETH deposits from owner
    // ─────────────────────────────────────────────────────────────────

    receive() external payable {
        if (msg.sender == owner && !triggered) {
            if (msg.value == 0)               revert ZeroDeposit();
            if (msg.value > type(uint64).max) revert AmountTooLarge();
            _recordDeposit(uint64(msg.value));
            emit Deposited(msg.sender, msg.value);
        }
    }
}
