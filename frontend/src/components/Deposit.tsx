import React, { useState } from "react";

interface Props {
  loading:   boolean;
  error:     string;
  txHash:    string;
  onDeposit: (amount: string) => void;
  onBack:    () => void;
}

export default function Deposit({ loading, error, txHash, onDeposit, onBack }: Props) {
  const [amount, setAmount] = useState("");

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    onDeposit(amount);
  };

  return (
    <div style={styles.container}>
      <button style={styles.back} onClick={onBack}>← BACK</button>

      <div style={styles.title}>DEPOSIT ETH</div>
      <div style={styles.subtitle}>
        Your deposit is stored as an encrypted <code>euint64</code> on-chain.
        The balance is invisible to everyone except you.
      </div>

      <div style={styles.card}>
        <div style={styles.fieldLabel}>AMOUNT (ETH)</div>
        <input
          style={styles.input}
          type="number"
          placeholder="0.0"
          min="0"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
        />
        <div style={styles.note}>Max per deposit: 18.4 ETH (euint64 limit)</div>

        <button
          style={{ ...styles.btn, opacity: loading || !amount ? 0.6 : 1 }}
          onClick={handleSubmit}
          disabled={loading || !amount}
        >
          {loading ? "DEPOSITING..." : "DEPOSIT INTO VAULT"}
        </button>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {txHash && (
        <div style={styles.txBox}>
          ✓ Deposit confirmed —{" "}
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#00c2ff" }}
          >
            View on Etherscan ↗
          </a>
        </div>
      )}

      <div style={styles.fheNote}>
        <div style={styles.fheNoteTitle}>// How FHE protects your deposit</div>
        <div style={styles.fheNoteText}>
          When you deposit, the ETH amount is converted to an encrypted{" "}
          <code>euint64</code> using Zama's fhEVM. The contract adds it to your
          encrypted balance using <code>FHE.add()</code> — arithmetic on
          ciphertext. No one on-chain can read your balance. Only you, with
          your wallet's decryption key, can see it.
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 560,
    margin: "0 auto",
    padding: "0 24px",
  },
  back: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    background: "none",
    border: "none",
    color: "#4a6080",
    cursor: "pointer",
    marginBottom: 32,
    padding: 0,
  },
  title: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 40,
    letterSpacing: 3,
    color: "#fff",
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    color: "#4a6080",
    lineHeight: 1.7,
    marginBottom: 32,
  },
  card: {
    border: "1px solid #1a2840",
    background: "#0b1220",
    padding: 32,
    marginBottom: 24,
  },
  fieldLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    letterSpacing: 3,
    color: "#4a6080",
    marginBottom: 8,
  },
  input: {
    width: "100%",
    background: "#070c14",
    border: "1px solid #1a2840",
    color: "#c8d8f0",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 24,
    padding: "16px",
    outline: "none",
    boxSizing: "border-box",
    marginBottom: 8,
  },
  note: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "#2a4060",
    marginBottom: 24,
  },
  btn: {
    width: "100%",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 3,
    background: "#00c2ff",
    color: "#030508",
    border: "none",
    padding: "16px",
    cursor: "pointer",
  },
  error: {
    padding: "12px 16px",
    border: "1px solid rgba(255,61,110,0.3)",
    background: "rgba(255,61,110,0.05)",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#ff3d6e",
    marginBottom: 16,
    wordBreak: "break-word",
  },
  txBox: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#00ff9d",
    marginBottom: 24,
  },
  fheNote: {
    border: "1px solid #1a2840",
    padding: 20,
    marginTop: 8,
  },
  fheNoteTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "#00c2ff",
    letterSpacing: 2,
    marginBottom: 8,
  },
  fheNoteText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#4a6080",
    lineHeight: 1.7,
  },
};
