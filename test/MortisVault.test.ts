import { expect }         from "chai";
import { ethers }         from "hardhat";
import { time }           from "@nomicfoundation/hardhat-network-helpers";
import { MortisVault }    from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

/**
 * MortisVault test suite
 *
 * NOTE: These tests run on Hardhat's local network with a MOCK fhEVM.
 * Encrypted operations are simulated — no actual FHE computation happens here.
 * Real FHE behaviour is only active on Sepolia with the Zama KMS.
 *
 * Run: npx hardhat test
 */
describe("MortisVault", function () {
  const ONE_ETH     = ethers.parseEther("1");
  const HALF_ETH    = ethers.parseEther("0.5");
  const TRIGGER_WINDOW = 180 * 24 * 60 * 60; // 180 days in seconds

  let vault        : MortisVault;
  let owner        : HardhatEthersSigner;
  let beneficiary  : HardhatEthersSigner;
  let randomPerson : HardhatEthersSigner;

  beforeEach(async function () {
    [owner, beneficiary, randomPerson] = await ethers.getSigners();

    const Factory = await ethers.getContractFactory("MortisVault");
    vault = await Factory.connect(owner).deploy(
      beneficiary.address,
      TRIGGER_WINDOW,
      { value: ONE_ETH }
    ) as MortisVault;

    await vault.waitForDeployment();
  });

  // ── Deployment ────────────────────────────────────────────────────
  describe("Deployment", () => {
    it("sets owner, beneficiary, triggerWindow correctly", async () => {
      expect(await vault.owner()).to.equal(owner.address);
      expect(await vault.beneficiary()).to.equal(beneficiary.address);
      expect(await vault.triggerWindow()).to.equal(TRIGGER_WINDOW);
    });

    it("holds initial ETH deposit", async () => {
      const balance = await ethers.provider.getBalance(await vault.getAddress());
      expect(balance).to.equal(ONE_ETH);
    });

    it("starts with triggered=false, inherited=false", async () => {
      expect(await vault.triggered()).to.equal(false);
      expect(await vault.inherited()).to.equal(false);
    });

    it("reverts with zero beneficiary", async () => {
      const Factory = await ethers.getContractFactory("MortisVault");
      await expect(
        Factory.deploy(ethers.ZeroAddress, TRIGGER_WINDOW)
      ).to.be.revertedWithCustomError(vault, "ZeroBeneficiary");
    });

    it("reverts with window under 1 day", async () => {
      const Factory = await ethers.getContractFactory("MortisVault");
      await expect(
        Factory.deploy(beneficiary.address, 3600) // 1 hour — too short
      ).to.be.revertedWithCustomError(vault, "WindowTooShort");
    });
  });

  // ── Ping (proof of life) ──────────────────────────────────────────
  describe("ping()", () => {
    it("resets the countdown", async () => {
      // Advance time by 90 days
      await time.increase(90 * 24 * 60 * 60);

      const before = await vault.lastPing();
      await vault.connect(owner).ping();
      const after = await vault.lastPing();

      expect(after).to.be.gt(before);
    });

    it("emits Pinged event", async () => {
      await expect(vault.connect(owner).ping())
        .to.emit(vault, "Pinged")
        .withArgs(owner.address, await time.latest() + 1, TRIGGER_WINDOW);
    });

    it("reverts if called by non-owner", async () => {
      await expect(
        vault.connect(randomPerson).ping()
      ).to.be.revertedWithCustomError(vault, "NotOwner");
    });

    it("secondsUntilTrigger is positive after ping", async () => {
      await time.increase(170 * 24 * 60 * 60); // near expiry
      await vault.connect(owner).ping();        // reset
      const secs = await vault.secondsUntilTrigger();
      expect(secs).to.be.approximately(Number(TRIGGER_WINDOW), 5);
    });
  });

  // ── Deposit ───────────────────────────────────────────────────────
  describe("deposit()", () => {
    it("increases contract ETH balance", async () => {
      const before = await ethers.provider.getBalance(await vault.getAddress());
      await vault.connect(owner).deposit({ value: HALF_ETH });
      const after = await ethers.provider.getBalance(await vault.getAddress());
      expect(after - before).to.equal(HALF_ETH);
    });

    it("emits Deposited event", async () => {
      await expect(vault.connect(owner).deposit({ value: HALF_ETH }))
        .to.emit(vault, "Deposited")
        .withArgs(owner.address, HALF_ETH);
    });

    it("reverts on zero deposit", async () => {
      await expect(
        vault.connect(owner).deposit({ value: 0 })
      ).to.be.revertedWithCustomError(vault, "ZeroDeposit");
    });

    it("reverts if not owner", async () => {
      await expect(
        vault.connect(randomPerson).deposit({ value: HALF_ETH })
      ).to.be.revertedWithCustomError(vault, "NotOwner");
    });
  });

  // ── requestTrigger (dead man's switch) ───────────────────────────
  describe("requestTrigger()", () => {
    it("reverts if timer has not expired", async () => {
      await time.increase(100 * 24 * 60 * 60); // only 100 days
      await expect(
        vault.connect(randomPerson).requestTrigger()
      ).to.be.revertedWithCustomError(vault, "TimerNotExpired");
    });

    it("reverts if timer has not expired (1 second early)", async () => {
      await time.increase(TRIGGER_WINDOW - 2);
      await expect(
        vault.connect(randomPerson).requestTrigger()
      ).to.be.revertedWithCustomError(vault, "TimerNotExpired");
    });

    it("succeeds once timer expires — emits TriggerRequested", async () => {
      await time.increase(TRIGGER_WINDOW + 1);
      await expect(vault.connect(randomPerson).requestTrigger())
        .to.emit(vault, "TriggerRequested");
    });

    it("sets triggered=true and decryptionPending=true", async () => {
      await time.increase(TRIGGER_WINDOW + 1);
      await vault.connect(randomPerson).requestTrigger();
      expect(await vault.triggered()).to.equal(true);
      expect(await vault.decryptionPending()).to.equal(true);
    });

    it("reverts if already triggered", async () => {
      await time.increase(TRIGGER_WINDOW + 1);
      await vault.connect(randomPerson).requestTrigger();
      await expect(
        vault.connect(randomPerson).requestTrigger()
      ).to.be.revertedWithCustomError(vault, "AlreadyTriggered");
    });

    it("can be called by anyone — not just owner or beneficiary", async () => {
      await time.increase(TRIGGER_WINDOW + 1);
      // randomPerson (unrelated address) calls it — should succeed
      await expect(vault.connect(randomPerson).requestTrigger())
        .to.emit(vault, "TriggerRequested");
    });
  });

  // ── secondsUntilTrigger ───────────────────────────────────────────
  describe("secondsUntilTrigger()", () => {
    it("decreases over time", async () => {
      const t1 = await vault.secondsUntilTrigger();
      await time.increase(30 * 24 * 60 * 60);
      const t2 = await vault.secondsUntilTrigger();
      expect(t2).to.be.lt(t1);
    });

    it("returns 0 once expired", async () => {
      await time.increase(TRIGGER_WINDOW + 100);
      expect(await vault.secondsUntilTrigger()).to.equal(0);
    });
  });

  // ── vaultStatus ───────────────────────────────────────────────────
  describe("vaultStatus()", () => {
    it("returns all fields correctly", async () => {
      const status = await vault.vaultStatus();
      expect(status._owner).to.equal(owner.address);
      expect(status._beneficiary).to.equal(beneficiary.address);
      expect(status._triggered).to.equal(false);
      expect(status._ethHeld).to.equal(ONE_ETH);
    });
  });

  // ── Owner withdraw (mock — real flow needs KMS callback) ──────────
  describe("requestWithdraw()", () => {
    it("reverts if called by non-owner", async () => {
      await expect(
        vault.connect(randomPerson).requestWithdraw()
      ).to.be.revertedWithCustomError(vault, "NotOwner");
    });

    it("reverts if decryption already pending", async () => {
      // First call sets pending=true
      await vault.connect(owner).requestWithdraw();
      // Second call should revert
      await expect(
        vault.connect(owner).requestWithdraw()
      ).to.be.revertedWithCustomError(vault, "DecryptionAlreadyPending");
    });

    it("reverts if vault is triggered", async () => {
      await time.increase(TRIGGER_WINDOW + 1);
      await vault.connect(randomPerson).requestTrigger();
      await expect(
        vault.connect(owner).requestWithdraw()
      ).to.be.revertedWithCustomError(vault, "AlreadyTriggered");
    });
  });
});
