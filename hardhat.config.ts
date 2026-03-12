import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import "dotenv/config";

const SEPOLIA_RPC  = process.env.SEPOLIA_RPC_URL  || "";
const PRIVATE_KEY  = process.env.PRIVATE_KEY      || "0x" + "0".repeat(64);
const ETHERSCAN_KEY = process.env.ETHERSCAN_API_KEY || "";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },

  networks: {
    // ── Local dev (mock fhEVM for unit tests) ──────────────────────
    hardhat: {
      chainId: 31337,
    },

    // ── Sepolia testnet (real Zama KMS) ────────────────────────────
    sepolia: {
      url: SEPOLIA_RPC,
      chainId: 11155111,
      accounts: PRIVATE_KEY !== "0x" + "0".repeat(64) ? [PRIVATE_KEY] : [],
      gasPrice: "auto",
    },
  },

  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_KEY,
    },
  },

  typechain: {
    outDir: "typechain-types",
    target: "ethers-v6",
  },

  paths: {
    sources:   "./contracts",
    tests:     "./test",
    cache:     "./cache",
    artifacts: "./artifacts",
  },
};

export default config;
