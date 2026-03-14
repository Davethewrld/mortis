import React, { useState, useEffect } from "react";
import { VaultStatus } from "../hooks/useMortis";

interface Props {
  account:        string;
  vaultStatus:    VaultStatus;
  loading:        boolean;
  error:          string;
  txHash:         string;
  onPing:         () => void;
  onDeposit:      () => void;
  onWithdraw:     () => void;
  onTrigger:      () => void;
}

function formatCountdown(seconds: number): string {
  if (seconds <= 0) return "EXPIRED";
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${d}d ${h}h ${m}m ${s}s`;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

export default function Dashboard({
  account, vaultStatus, loading, error, txHash,
  onPing, onDeposit, onWithdraw, onTrigger,
}: Props) {
  const [liveSeconds, setLiveSeconds] = useState(vaultStatus.secondsLeft);

  // Live countdown tick
  useEffect(() => {
    setLiveSeconds(vaultStatus.secondsLeft);
    const interval = setInterval(() => {
      setLiveSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [vaultStatus.secondsLeft]);

  const isOwner       = account.toLowerCase() === vaultStatus.owner.toLowerCase();
  const isBeneficiary = account.toLowerCase() === vaultStatus.beneficiary.toLowerCase();
  const isExpired     = liveSeconds === 0;
  const progressPct   = vaultStatus.triggerWindow > 0
    ? Math.min(100, ((vaultStatus.triggerWindow - liveSeconds) / vaultStatus.triggerWindow) * 100)
    : 100;

  const statusColor = vaultStatus.inherited
    ? "#00ff9d"
    : vaultStatus.triggered
    ? "#ff3d6e"
    : isExpired
    ? "#ff3d6e"
    : liveSeconds < 7 * 86400
    ? "#ffaa00"
    : "#00c2ff";

  return (
    <div style={styles.container}>

      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.vaultLabel}>// MORTIS VAULT</div>
          <div style={styles.address}>{vaultStatus.owner.slice(0,6)}...{vaultStatus.owner.slice(-4)}</div>
        </div>
        <div style={{ ...styles.statusBadge, borderColor: statusColor, color: statusColor }}>
          {vaultStatus.inherited ? "INHERITED" :
           vaultStatus.triggered ? "TRIGGERED" :
           vaultStatus.decryptionPending ? "PENDING KMS" :
           isExpired ? "EXPIRED" : "● ACTIVE"}
        </div>
      </div>

      {/* Countdown */}
      <div style={styles.countdownCard}>
        <div style={styles.countdownLabel}>TIME UNTIL DEAD MAN'S SWITCH FIRES</div>
        <div style={{ ...styles.countdown, color: statusColor }}>
          {vaultStatus.inherited ? "INHERITANCE COMPLETE" :
           vaultStatus.triggered ? "AWAITING KMS DECRYPTION" :
           formatCountdown(liveSeconds)}
        </div>

        {/* Progress bar */}
        <div style={styles.progressBg}>
          <div style={{ ...styles.progressFill, width: `${progressPct}%`, background: statusColor }} />
        </div>
        <div style={styles.progressLabels}>
          <span>Last ping: {formatDate(vaultStatus.lastPing)}</span>
          <span>{Math.round(progressPct)}% elapsed</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>VAULT BALANCE</div>
          <div style={styles.statValue}>{vaultStatus.ethHeld} ETH</div>
          <div style={styles.statSub}>encrypted on-chain</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>TRIGGER WINDOW</div>
          <div style={styles.statValue}>{Math.round(vaultStatus.triggerWindow / 86400)}d</div>
          <div style={styles.statSub}>without ping</div>
        </div>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>BENEFICIARY</div>
          <div style={styles.statValue}>{vaultStatus.beneficiary.slice(0,6)}...{vaultStatus.beneficiary.slice(-4)}</div>
          <div style={styles.statSub}>{isBeneficiary ? "← you" : ""}</div>
        </div>
      </div>

      {/* Actions */}
      {isOwner && !vaultStatus.triggered && (
        <div style={styles.actions}>
          <button
            style={{ ...styles.btnPrimary, opacity: loading ? 0.6 : 1 }}
            onClick={onPing}
            disabled={loading}
          >
            {loading ? "SENDING..." : "⬡ PING — I'M ALIVE"}
          </button>
          <button
            style={{ ...styles.btnSecondary, opacity: loading ? 0.6 : 1 }}
            onClick={onDeposit}
            disabled={loading}
          >
            + DEPOSIT ETH
          </button>
          <button
            style={{ ...styles.btnGhost, opacity: loading ? 0.6 : 1 }}
            onClick={onWithdraw}
            disabled={loading}
          >
            WITHDRAW
          </button>
        </div>
      )}

      {/* Anyone can trigger once expired */}
      {isExpired && !vaultStatus.triggered && (
        <div style={styles.triggerSection}>
          <div style={styles.triggerWarning}>
            ⚠ Timer has expired. The dead man's switch can now be activated.
          </div>
          <button
            style={{ ...styles.btnDanger, opacity: loading ? 0.6 : 1 }}
            onClick={onTrigger}
            disabled={loading}
          >
            {loading ? "TRIGGERING..." : "ACTIVATE INHERITANCE"}
          </button>
        </div>
      )}

      {/* Pending KMS */}
      {vaultStatus.decryptionPending && (
        <div style={styles.pendingBox}>
          <div style={styles.pendingDot} />
          <span>Awaiting Zama KMS decryption... The inheritance transfer will execute automatically.</span>
        </div>
      )}

      {/* Inherited */}
      {vaultStatus.inherited && (
        <div style={styles.successBox}>
          ✓ Inheritance complete. Funds transferred to {vaultStatus.beneficiary.slice(0,6)}...{vaultStatus.beneficiary.slice(-4)}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={styles.errorBox}>{error}</div>
      )}

      {/* Tx hash */}
      {txHash && (
        <div style={styles.txBox}>
          <span>Tx: </span>
          <a
            href={`https://sepolia.etherscan.io/tx/${txHash}`}
            target="_blank"
            rel="noreferrer"
            style={{ color: "#00c2ff" }}
          >
            {txHash.slice(0,10)}...{txHash.slice(-6)} ↗
          </a>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 720,
    margin: "0 auto",
    padding: "0 24px",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 32,
  },
  vaultLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 3,
    color: "#4a6080",
    marginBottom: 4,
  },
  address: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 14,
    color: "#c8d8f0",
  },
  statusBadge: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    border: "1px solid",
    padding: "6px 12px",
  },
  countdownCard: {
    border: "1px solid #1a2840",
    background: "#0b1220",
    padding: 32,
    marginBottom: 24,
  },
  countdownLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 9,
    letterSpacing: 3,
    color: "#4a6080",
    marginBottom: 12,
  },
  countdown: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 52,
    letterSpacing: 4,
    lineHeight: 1,
    marginBottom: 20,
  },
  progressBg: {
    height: 3,
    background: "#1a2840",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    transition: "width 1s linear",
  },
  progressLabels: {
    display: "flex",
    justifyContent: "space-between",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "#4a6080",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 1,
    background: "#1a2840",
    border: "1px solid #1a2840",
    marginBottom: 24,
  },
  statCard: {
    background: "#0b1220",
    padding: "20px 16px",
  },
  statLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 9,
    letterSpacing: 2,
    color: "#4a6080",
    marginBottom: 8,
  },
  statValue: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 16,
    color: "#c8d8f0",
    marginBottom: 4,
    wordBreak: "break-all",
  },
  statSub: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 9,
    color: "#2a4060",
  },
  actions: {
    display: "flex",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  btnPrimary: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 2,
    background: "#00c2ff",
    color: "#030508",
    border: "none",
    padding: "14px 24px",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 2,
    background: "transparent",
    color: "#c8d8f0",
    border: "1px solid #1a2840",
    padding: "14px 24px",
    cursor: "pointer",
  },
  btnGhost: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 2,
    background: "transparent",
    color: "#4a6080",
    border: "1px solid #1a2840",
    padding: "14px 24px",
    cursor: "pointer",
  },
  btnDanger: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 2,
    background: "#ff3d6e",
    color: "#fff",
    border: "none",
    padding: "14px 32px",
    cursor: "pointer",
  },
  triggerSection: {
    marginBottom: 24,
  },
  triggerWarning: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#ff3d6e",
    marginBottom: 12,
    padding: "12px 16px",
    border: "1px solid rgba(255,61,110,0.3)",
    background: "rgba(255,61,110,0.05)",
  },
  pendingBox: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    padding: "16px",
    border: "1px solid rgba(0,194,255,0.3)",
    background: "rgba(0,194,255,0.05)",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#00c2ff",
    marginBottom: 16,
  },
  pendingDot: {
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#00c2ff",
    flexShrink: 0,
    animation: "pulse 1.5s infinite",
  },
  successBox: {
    padding: "16px",
    border: "1px solid rgba(0,255,157,0.3)",
    background: "rgba(0,255,157,0.05)",
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#00ff9d",
    marginBottom: 16,
  },
  errorBox: {
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
    color: "#4a6080",
  },
};
