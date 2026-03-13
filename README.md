# MORTIS — Encrypted Digital Inheritance Protocol

> _"The first trustless, FHE-encrypted dead man's switch on Ethereum."_

![Status](https://img.shields.io/badge/status-live-brightgreen)
![Network](https://img.shields.io/badge/network-Sepolia-blue)
![Protocol](https://img.shields.io/badge/protocol-Zama%20fhEVM-purple)

---

## The Problem

Over **$140 billion** in cryptocurrency has been permanently lost because owners passed away without sharing their private keys. Traditional solutions require either:

- Trusting a lawyer or third party with your seed phrase
- Exposing parts of your private key to family members
- Using centralized custodial services that can be hacked or shut down

None of these are acceptable for a trustless, decentralized world.

---

## The Solution

MORTIS is a **cryptographic dead man's switch** — a smart contract that holds your encrypted vault balance and automatically transfers it to your designated beneficiary if you stop proving you're alive.

- **No lawyers.** No third parties. No seed phrase exposure.
- **Fully automated.** The contract executes itself.
- **Mathematically secure.** Powered by Zama's Fully Homomorphic Encryption.

---

## How It Works

```
1. DEPLOY     →  Set your beneficiary address and trigger window (180 days)
2. DEPOSIT    →  ETH stored as encrypted euint64 — invisible on-chain
3. PING       →  Call ping() every 180 days to prove you're alive
4. TRIGGER    →  Miss the window → anyone calls requestTrigger()
5. INHERIT    →  Zama KMS decrypts balance → ETH transfers to beneficiary
```

---

## FHE Technology Used

This project uses the **Zama fhEVM** (Fully Homomorphic Encryption Virtual Machine) to keep vault balances private on-chain.

### Why FHE?

Standard Ethereum smart contracts store all state publicly. Anyone can see your wallet balance. MORTIS uses FHE to store the vault balance as an encrypted ciphertext — computations happen on encrypted data without ever revealing the plaintext.

### fhEVM Primitives Used

| Primitive                 | Usage in MORTIS                                          |
| ------------------------- | -------------------------------------------------------- |
| `euint64`                 | Encrypted vault balance — invisible to everyone on-chain |
| `FHE.asEuint64()`         | Convert plaintext deposit amount to ciphertext           |
| `FHE.add()`               | Add deposits to encrypted balance without decrypting     |
| `FHE.allowThis()`         | Grant contract permission to operate on ciphertext       |
| `FHE.allow()`             | Grant owner/beneficiary decryption access                |
| `FHE.requestDecryption()` | Async KMS decryption request on trigger                  |
| `FHE.checkSignatures()`   | Verify MPC decryption proof in callback                  |

### Access Control Switch (The Core Innovation)

The key FHE insight in MORTIS is using the **ACL system as an inheritance switch**:

```solidity
// While alive: only owner can decrypt
FHE.allow(_encryptedBalance, owner);

// On trigger: grant beneficiary decrypt access
FHE.allow(_encryptedBalance, beneficiary);

// Request async decryption from Zama KMS
FHE.requestDecryption(handles, this.inheritanceCallback.selector);
```

When the timer expires, decryption permission flips from owner to beneficiary — trustlessly, on-chain, enforced by cryptography not by law.

---

## Architecture

```
mortis/
├── contracts/
│   └── MortisVault.sol          # Core fhEVM smart contract
├── scripts/
│   └── deploy.ts                # Hardhat deploy to Sepolia
├── test/
│   └── MortisVault.test.ts      # Contract test suite
├── frontend/
│   └── src/
│       ├── App.tsx              # Main React app
│       ├── config.ts            # Contract address + ABI
│       ├── hooks/
│       │   └── useMortis.ts     # Contract interaction hook
│       └── components/
│           ├── Dashboard.tsx    # Live countdown + ping + vault status
│           └── Deposit.tsx      # Encrypted deposit flow
└── README.md
```

---

## Smart Contract

### Deployment

**Network:** Ethereum Sepolia Testnet  
**Contract Address:** `0xBB496Cd39B1609405D0d195C56A196501620Ff9c`  
**Etherscan:** https://sepolia.etherscan.io/address/0xBB496Cd39B1609405D0d195C56A196501620Ff9c

### Key Functions

```solidity
// Prove you are alive — resets the 180-day countdown
function ping() external onlyOwner

// Deposit ETH — stored as encrypted euint64 on-chain
function deposit() external payable onlyOwner

// Arm the dead man's switch — callable by anyone after timer expires
function requestTrigger() external

// KMS callback — receives plaintext balance + proof, transfers to beneficiary
function inheritanceCallback(uint256 requestId, bytes memory cleartexts, bytes memory proof) external

// Returns full vault status in one call
function vaultStatus() external view returns (...)
```

### Security Properties

- **No admin keys.** Once deployed, the contract cannot be modified by anyone including the deployer.
- **Trustless trigger.** Anyone can call `requestTrigger()` — no reliance on a specific keeper.
- **KMS proof verification.** `FHE.checkSignatures()` verifies the decryption result on-chain. No relayer can forge the plaintext balance.
- **Access control enforced by cryptography.** Only permitted addresses can decrypt ciphertexts — enforced by the fhEVM ACL, not by contract logic.

---

## Frontend dApp

### Features

- **Connect Wallet** — MetaMask integration, auto-switches to Sepolia
- **Live Countdown** — Real-time ticker showing seconds until trigger
- **Vault Dashboard** — Balance, beneficiary, trigger window, status
- **Deposit** — Send ETH into the encrypted vault
- **Ping** — One-click proof of life transaction
- **Trigger** — Anyone can activate inheritance once timer expires
- **Etherscan Links** — Every transaction links directly to the block explorer

### Running Locally

```bash
cd frontend
npm install --legacy-peer-deps
npm start
```

Opens at `http://localhost:3000`

---

## Local Development

### Prerequisites

- Node.js v18+
- MetaMask browser extension
- Sepolia test ETH (from sepoliafaucet.com)

### Setup

```bash
# Clone and install
git clone <repo>
cd mortis
npm install

# Configure environment
cp .env.example .env
# Fill in SEPOLIA_RPC_URL, PRIVATE_KEY, BENEFICIARY

# Compile contract
npx hardhat compile

# Deploy to Sepolia
npx hardhat run scripts/deploy.ts --network sepolia

# Start frontend
cd frontend
npm install --legacy-peer-deps
npm start
```

---

## Real-World Use Case

MORTIS solves a real, quantifiable problem:

- **$140B+** in crypto lost to inaccessible wallets
- **3.7M BTC** estimated permanently lost (Chainalysis, 2020)
- Growing problem as crypto adoption increases

Target users: any crypto holder who wants to ensure their assets pass to family without exposing private keys or trusting intermediaries.

---

## Why FHE Makes This Possible

Without FHE, a dead man's switch contract would have to store the vault balance publicly — anyone could see exactly how much ETH is waiting to be inherited, making it a target.

With fhEVM:

- The balance is encrypted on-chain
- Only the owner (while alive) can see their balance
- The beneficiary gains access only when inheritance is triggered
- The Zama KMS decrypts and executes atomically with cryptographic proof

This is a use case that **only becomes possible with FHE** — not achievable with ZK proofs or standard smart contracts alone.

---

## Built With

- [Zama fhEVM](https://github.com/zama-ai/fhevm) — Fully Homomorphic Encryption for EVM
- [Hardhat](https://hardhat.org) — Ethereum development framework
- [React](https://react.dev) — Frontend framework
- [ethers.js](https://ethers.org) — Ethereum JavaScript library
- [Sepolia Testnet](https://sepolia.dev) — Ethereum test network

---

## Submission

**Track:** Builder Track — Zama Developer Program Mainnet Season 1  
**Contact:** Davidclement331@gmail.com  
**GitHub:** github.com/Davethewrld

---

_MORTIS — Because your crypto shouldn't die with you._
