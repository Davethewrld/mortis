// ─────────────────────────────────────────────────────────────
// After deploying MortisVault.sol to Sepolia, paste the
// deployed contract address here.
// ─────────────────────────────────────────────────────────────
export const CONTRACT_ADDRESS = "0xBB496Cd39B1609405D0d195C56A196501620Ff9c";

export const SEPOLIA_CHAIN_ID = 11155111;

export const CONTRACT_ABI = [
  // ── Read ────────────────────────────────────────────────────
  {
    inputs: [],
    name: "owner",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "beneficiary",
    outputs: [{ type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "lastPing",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "triggerWindow",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "triggered",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "inherited",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "decryptionPending",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "secondsUntilTrigger",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "vaultStatus",
    outputs: [
      { name: "_owner", type: "address" },
      { name: "_beneficiary", type: "address" },
      { name: "_triggered", type: "bool" },
      { name: "_inherited", type: "bool" },
      { name: "_decryptionPending", type: "bool" },
      { name: "_lastPing", type: "uint256" },
      { name: "_triggerWindow", type: "uint256" },
      { name: "_secondsLeft", type: "uint256" },
      { name: "_ethHeld", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
  // ── Write ───────────────────────────────────────────────────
  {
    inputs: [],
    name: "ping",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "deposit",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "requestTrigger",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "requestWithdraw",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ── Events ──────────────────────────────────────────────────
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: false, name: "amount", type: "uint256" },
    ],
    name: "Deposited",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "timestamp", type: "uint256" },
      { indexed: false, name: "secondsRemaining", type: "uint256" },
    ],
    name: "Pinged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "requestId", type: "uint256" },
    ],
    name: "TriggerRequested",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "beneficiary", type: "address" },
      { indexed: false, name: "amount", type: "uint64" },
    ],
    name: "Inherited",
    type: "event",
  },
] as const;
