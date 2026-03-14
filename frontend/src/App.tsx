import React, { useState } from "react";
import { useMortis } from "./hooks/useMortis";
import Dashboard from "./components/Dashboard";
import Deposit from "./components/Deposit";
import { CONTRACT_ADDRESS } from "./config";

type Screen = "home" | "dashboard" | "deposit";

export default function App() {
  const [screen, setScreen] = useState<Screen>("home");

  const {
    account,
    vaultStatus,
    loading,
    error,
    txHash,
    connectWallet,
    ping,
    deposit,
    requestTrigger,
    requestWithdraw,
  } = useMortis();

  const isConnected = !!account;
  const isVaultDeployed = CONTRACT_ADDRESS.length > 0;
  return (
    <div style={styles.app}>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Bebas+Neue&family=DM+Sans:wght@300;400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #030508; color: #c8d8f0; }
        code { font-family: 'Share Tech Mono', monospace; color: #00c2ff; }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button { -webkit-appearance: none; }
      `}</style>

      {/* NAV */}
      <nav style={styles.nav}>
        <div style={styles.logo} onClick={() => setScreen("home")}>
          MORT<span style={{ color: "#ff3d6e" }}>IS</span>
          <span style={styles.logoSub}>// ENCRYPTED INHERITANCE</span>
        </div>

        <div style={styles.navRight}>
          {isConnected ? (
            <div style={styles.connected}>
              <div style={styles.dot} />
              {account.slice(0, 6)}...{account.slice(-4)}
            </div>
          ) : (
            <button
              style={styles.connectBtn}
              onClick={connectWallet}
              disabled={loading}
            >
              {loading ? "CONNECTING..." : "CONNECT WALLET"}
            </button>
          )}
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <main style={styles.main}>
        {/* ── HOME SCREEN ─────────────────────────────────── */}
        {screen === "home" && (
          <div style={styles.home}>
            <div style={styles.heroLabel}>
              <span style={styles.heroLabelLine} />
              ERC-4337 · FHEVM · ETHEREUM SEPOLIA
            </div>

            <h1 style={styles.heroTitle}>
              YOUR CRYPTO
              <br />
              <span style={styles.heroOutline}>DIES WITH YOU.</span>
              <br />
              IT DOESN'T
              <br />
              HAVE TO.
            </h1>

            <p style={styles.heroSub}>
              The first trustless, FHE-encrypted digital inheritance protocol.
              Your vault balance is hidden from everyone — visible only when the
              dead man's switch fires.
            </p>

            <div style={styles.heroActions}>
              {!isConnected ? (
                <button
                  style={styles.btnPrimary}
                  onClick={connectWallet}
                  disabled={loading}
                >
                  {loading ? "CONNECTING..." : "CONNECT WALLET"}
                </button>
              ) : !isVaultDeployed ? (
                <div style={styles.deployNotice}>
                  <div style={styles.deployNoticeTitle}>
                    // VAULT NOT DEPLOYED YET
                  </div>
                  <div style={styles.deployNoticeText}>
                    Deploy <code>MortisVault.sol</code> to Sepolia and update{" "}
                    <code>CONTRACT_ADDRESS</code> in <code>src/config.ts</code>
                  </div>
                  <div style={styles.deployCmd}>
                    cd .. && npx hardhat run scripts/deploy.ts --network sepolia
                  </div>
                </div>
              ) : (
                <button
                  style={styles.btnPrimary}
                  onClick={() => setScreen("dashboard")}
                >
                  OPEN MY VAULT →
                </button>
              )}
            </div>

            {/* How it works */}
            <div style={styles.steps}>
              {[
                {
                  n: "01",
                  title: "DEPLOY VAULT",
                  body: "Set your beneficiary and trigger window. Your vault is a smart contract only you control.",
                },
                {
                  n: "02",
                  title: "DEPOSIT ETH",
                  body: "Your balance is stored as an encrypted euint64. No one on-chain can read it.",
                },
                {
                  n: "03",
                  title: "PING EVERY 180 DAYS",
                  body: "One transaction proves you're alive and resets the countdown to zero.",
                },
                {
                  n: "04",
                  title: "AUTOMATIC TRANSFER",
                  body: "If you miss the window, anyone can trigger inheritance. The KMS decrypts and transfers trustlessly.",
                },
              ].map((step) => (
                <div key={step.n} style={styles.step}>
                  <div style={styles.stepNum}>{step.n}</div>
                  <div style={styles.stepTitle}>{step.title}</div>
                  <div style={styles.stepBody}>{step.body}</div>
                </div>
              ))}
            </div>

            {/* FHE badge */}
            <div style={styles.fheBadge}>
              <div style={styles.fheBadgeTitle}>POWERED BY ZAMA fhEVM</div>
              <div style={styles.fheBadgeTags}>
                {[
                  "euint64",
                  "FHE.add()",
                  "FHE.allow()",
                  "FHE.requestDecryption()",
                  "KMS Coprocessor",
                ].map((t) => (
                  <span key={t} style={styles.tag}>
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── DASHBOARD SCREEN ────────────────────────────── */}
        {screen === "dashboard" && isConnected && vaultStatus && (
          <Dashboard
            account={account}
            vaultStatus={vaultStatus}
            loading={loading}
            error={error}
            txHash={txHash}
            onPing={ping}
            onDeposit={() => setScreen("deposit")}
            onWithdraw={requestWithdraw}
            onTrigger={requestTrigger}
          />
        )}

        {screen === "dashboard" && isConnected && !vaultStatus && (
          <div style={styles.loading}>
            <div style={styles.loadingText}>LOADING VAULT...</div>
          </div>
        )}

        {/* ── DEPOSIT SCREEN ──────────────────────────────── */}
        {screen === "deposit" && (
          <Deposit
            loading={loading}
            error={error}
            txHash={txHash}
            onDeposit={async (amt) => {
              await deposit(amt);
              setScreen("dashboard");
            }}
            onBack={() => setScreen("dashboard")}
          />
        )}
      </main>

      {/* FOOTER */}
      <footer style={styles.footer}>
        <span style={styles.footerLogo}>
          MORT<span style={{ color: "#ff3d6e" }}>IS</span>
        </span>
        <span style={styles.footerText}>
          Built on Zama Protocol · Sepolia Testnet
        </span>
        <a
          href="https://github.com"
          target="_blank"
          rel="noreferrer"
          style={styles.footerLink}
        >
          GitHub ↗
        </a>
      </footer>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  app: {
    minHeight: "100vh",
    background: "#030508",
    fontFamily: "'DM Sans', sans-serif",
    display: "flex",
    flexDirection: "column",
  },
  nav: {
    position: "fixed",
    top: 0,
    width: "100%",
    padding: "20px 48px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #1a2840",
    background: "rgba(3,5,8,0.9)",
    backdropFilter: "blur(12px)",
    zIndex: 100,
    boxSizing: "border-box",
  },
  logo: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 24,
    letterSpacing: 5,
    color: "#fff",
    cursor: "pointer",
  },
  logoSub: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 9,
    color: "#4a6080",
    letterSpacing: 2,
    display: "block",
    marginTop: -4,
  },
  navRight: {
    display: "flex",
    alignItems: "center",
  },
  connected: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    color: "#c8d8f0",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: "50%",
    background: "#00ff9d",
    boxShadow: "0 0 6px #00ff9d",
  },
  connectBtn: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    border: "1px solid #00c2ff",
    color: "#00c2ff",
    background: "transparent",
    padding: "10px 20px",
    cursor: "pointer",
  },
  main: {
    flex: 1,
    paddingTop: 100,
    paddingBottom: 80,
  },
  home: {
    maxWidth: 800,
    margin: "0 auto",
    padding: "60px 24px 0",
  },
  heroLabel: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 4,
    color: "#ff3d6e",
    marginBottom: 24,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  heroLabelLine: {
    display: "inline-block",
    width: 32,
    height: 1,
    background: "#ff3d6e",
  },
  heroTitle: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: "clamp(52px, 10vw, 100px)",
    lineHeight: 0.95,
    letterSpacing: 2,
    color: "#fff",
    marginBottom: 32,
  },
  heroOutline: {
    color: "transparent",
    WebkitTextStroke: "1px #00c2ff",
  },
  heroSub: {
    fontSize: 16,
    fontWeight: 300,
    color: "#4a6080",
    lineHeight: 1.7,
    maxWidth: 480,
    marginBottom: 40,
  },
  heroActions: {
    marginBottom: 60,
  },
  btnPrimary: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 3,
    background: "#ff3d6e",
    color: "#fff",
    border: "none",
    padding: "18px 36px",
    cursor: "pointer",
    clipPath:
      "polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px))",
  },
  deployNotice: {
    border: "1px solid #1a2840",
    background: "#0b1220",
    padding: 24,
    maxWidth: 480,
  },
  deployNoticeTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "#00c2ff",
    letterSpacing: 2,
    marginBottom: 8,
  },
  deployNoticeText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#4a6080",
    lineHeight: 1.7,
    marginBottom: 12,
  },
  deployCmd: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    color: "#00ff9d",
    background: "#070c14",
    padding: "10px 14px",
    border: "1px solid #1a2840",
  },
  steps: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 1,
    background: "#1a2840",
    border: "1px solid #1a2840",
    marginBottom: 40,
  },
  step: {
    background: "#0b1220",
    padding: "28px 24px",
  },
  stepNum: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 48,
    color: "#1a2840",
    lineHeight: 1,
    marginBottom: 8,
  },
  stepTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 11,
    letterSpacing: 2,
    color: "#00c2ff",
    marginBottom: 8,
  },
  stepBody: {
    fontSize: 13,
    fontWeight: 300,
    color: "#4a6080",
    lineHeight: 1.6,
  },
  fheBadge: {
    border: "1px solid #1a2840",
    padding: "20px 24px",
    marginBottom: 40,
  },
  fheBadgeTitle: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    letterSpacing: 3,
    color: "#4a6080",
    marginBottom: 12,
  },
  fheBadgeTags: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap",
  },
  tag: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    letterSpacing: 1,
    color: "#00c2ff",
    border: "1px solid rgba(0,194,255,0.3)",
    padding: "4px 10px",
  },
  loading: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    height: 200,
  },
  loadingText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 12,
    letterSpacing: 3,
    color: "#4a6080",
  },
  footer: {
    borderTop: "1px solid #1a2840",
    padding: "24px 48px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLogo: {
    fontFamily: "'Bebas Neue', cursive",
    fontSize: 18,
    letterSpacing: 4,
    color: "#4a6080",
  },
  footerText: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "#2a4060",
    letterSpacing: 1,
  },
  footerLink: {
    fontFamily: "'Share Tech Mono', monospace",
    fontSize: 10,
    color: "#4a6080",
    textDecoration: "none",
    letterSpacing: 1,
  },
};
