import { ethers } from "hardhat";

/**
 * deploy.ts — Deploy MortisVault to Sepolia
 *
 * Usage:
 *   npx hardhat run scripts/deploy.ts --network sepolia
 *
 * Required env vars in .env:
 *   SEPOLIA_RPC_URL   — Alchemy / Infura Sepolia endpoint
 *   PRIVATE_KEY       — deployer private key (this becomes the vault owner)
 *   BENEFICIARY       — address that inherits if the switch fires
 *   TRIGGER_DAYS      — (optional) days for trigger window, default 180
 */
async function main() {
  const [deployer] = await ethers.getSigners();

  console.log("\n═══════════════════════════════════════════════");
  console.log("  MORTIS — Deploying to Sepolia");
  console.log("═══════════════════════════════════════════════");
  console.log("  Deployer :", deployer.address);
  console.log("  Balance  :", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");

  // ── Config ─────────────────────────────────────────────────────────
  const beneficiary = process.env.BENEFICIARY;
  if (!beneficiary) throw new Error("Set BENEFICIARY in .env");

  const triggerDays = Number(process.env.TRIGGER_DAYS ?? "180");
  const triggerWindow = BigInt(triggerDays * 24 * 60 * 60); // seconds

  // Optional: send ETH at deploy time
  const initialDepositEth = process.env.INITIAL_DEPOSIT_ETH ?? "0";
  const value = ethers.parseEther(initialDepositEth);

  console.log("\n  Beneficiary    :", beneficiary);
  console.log("  Trigger window :", triggerDays, "days");
  console.log("  Initial deposit:", initialDepositEth, "ETH");
  console.log("───────────────────────────────────────────────");

  // ── Deploy ─────────────────────────────────────────────────────────
  const MortisVault = await ethers.getContractFactory("MortisVault");

  console.log("\n  Deploying...");
  const vault = await MortisVault.deploy(beneficiary, triggerWindow, { value });
  await vault.waitForDeployment();

  const address = await vault.getAddress();
  const txHash  = vault.deploymentTransaction()?.hash;

  console.log("\n═══════════════════════════════════════════════");
  console.log("  ✓ MortisVault deployed!");
  console.log("  Address  :", address);
  console.log("  Tx hash  :", txHash);
  console.log("  Etherscan:", `https://sepolia.etherscan.io/address/${address}`);
  console.log("═══════════════════════════════════════════════\n");

  // ── Verify contract on Etherscan ───────────────────────────────────
  if (process.env.ETHERSCAN_API_KEY) {
    console.log("  Waiting 5 blocks before verification...");
    await vault.deploymentTransaction()?.wait(5);

    try {
      const { run } = await import("hardhat");
      await run("verify:verify", {
        address,
        constructorArguments: [beneficiary, triggerWindow],
      });
      console.log("  ✓ Contract verified on Etherscan");
    } catch (e: any) {
      console.log("  ⚠ Verification failed:", e.message);
    }
  }

  // ── Save deployment info ───────────────────────────────────────────
  const deploymentInfo = {
    network:       "sepolia",
    address,
    txHash,
    deployer:      deployer.address,
    beneficiary,
    triggerWindow: triggerWindow.toString(),
    triggerDays,
    deployedAt:    new Date().toISOString(),
  };

  const fs   = await import("fs");
  const path = await import("path");
  const outPath = path.join(__dirname, "../deployment.json");
  fs.writeFileSync(outPath, JSON.stringify(deploymentInfo, null, 2));
  console.log("  Deployment info saved to deployment.json\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
