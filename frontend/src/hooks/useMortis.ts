import { useState, useEffect, useCallback } from "react";
import { ethers } from "ethers";
import { CONTRACT_ABI, CONTRACT_ADDRESS } from "../config";

export interface VaultStatus {
  owner: string;
  beneficiary: string;
  triggered: boolean;
  inherited: boolean;
  decryptionPending: boolean;
  lastPing: number;
  triggerWindow: number;
  secondsLeft: number;
  ethHeld: string;
}

export function useMortis() {
  const [provider, setProvider]       = useState<ethers.BrowserProvider | null>(null);
  const [signer, setSigner]           = useState<ethers.JsonRpcSigner | null>(null);
  const [contract, setContract]       = useState<ethers.Contract | null>(null);
  const [account, setAccount]         = useState<string>("");
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState("");
  const [txHash, setTxHash]           = useState("");

  // ── Connect wallet ────────────────────────────────────────────
  const connectWallet = useCallback(async () => {
    try {
      if (!window.ethereum) {
        setError("MetaMask not found. Please install MetaMask.");
        return;
      }

      setLoading(true);
      setError("");

      const _provider = new ethers.BrowserProvider(window.ethereum);
      await _provider.send("eth_requestAccounts", []);

      const _signer  = await _provider.getSigner();
      const _account = await _signer.getAddress();

      // Check we're on Sepolia
      const network = await _provider.getNetwork();
      if (network.chainId !== BigInt(11155111)) {
        // Ask MetaMask to switch to Sepolia
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      }

      const _contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, _signer);

      setProvider(_provider);
      setSigner(_signer);
      setAccount(_account);
      setContract(_contract);

    } catch (e: any) {
      setError(e.message || "Failed to connect wallet");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch vault status ────────────────────────────────────────
  const fetchStatus = useCallback(async () => {
    if (!contract) return;
    try {
      const status = await contract.vaultStatus();
      setVaultStatus({
        owner:             status._owner,
        beneficiary:       status._beneficiary,
        triggered:         status._triggered,
        inherited:         status._inherited,
        decryptionPending: status._decryptionPending,
        lastPing:          Number(status._lastPing),
        triggerWindow:     Number(status._triggerWindow),
        secondsLeft:       Number(status._secondsLeft),
        ethHeld:           ethers.formatEther(status._ethHeld),
      });
    } catch (e: any) {
      setError(e.message || "Failed to fetch vault status");
    }
  }, [contract]);

  // Auto-refresh status every 15 seconds
  useEffect(() => {
    if (!contract) return;
    fetchStatus();
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [contract, fetchStatus]);

  // ── Ping (proof of life) ──────────────────────────────────────
  const ping = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      setError("");
      setTxHash("");

      const tx = await contract.ping();
      setTxHash(tx.hash);
      await tx.wait();
      await fetchStatus();

    } catch (e: any) {
      setError(e.message || "Ping failed");
    } finally {
      setLoading(false);
    }
  }, [contract, fetchStatus]);

  // ── Deposit ETH ───────────────────────────────────────────────
  const deposit = useCallback(async (amountEth: string) => {
    if (!contract) return;
    try {
      setLoading(true);
      setError("");
      setTxHash("");

      const value = ethers.parseEther(amountEth);
      const tx    = await contract.deposit({ value });
      setTxHash(tx.hash);
      await tx.wait();
      await fetchStatus();

    } catch (e: any) {
      setError(e.message || "Deposit failed");
    } finally {
      setLoading(false);
    }
  }, [contract, fetchStatus]);

  // ── Request trigger (dead man's switch) ──────────────────────
  const requestTrigger = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      setError("");
      setTxHash("");

      const tx = await contract.requestTrigger();
      setTxHash(tx.hash);
      await tx.wait();
      await fetchStatus();

    } catch (e: any) {
      setError(e.message || "Trigger failed");
    } finally {
      setLoading(false);
    }
  }, [contract, fetchStatus]);

  // ── Request withdraw (owner) ──────────────────────────────────
  const requestWithdraw = useCallback(async () => {
    if (!contract) return;
    try {
      setLoading(true);
      setError("");
      setTxHash("");

      const tx = await contract.requestWithdraw();
      setTxHash(tx.hash);
      await tx.wait();
      await fetchStatus();

    } catch (e: any) {
      setError(e.message || "Withdraw request failed");
    } finally {
      setLoading(false);
    }
  }, [contract, fetchStatus]);

  return {
    account,
    vaultStatus,
    loading,
    error,
    txHash,
    connectWallet,
    fetchStatus,
    ping,
    deposit,
    requestTrigger,
    requestWithdraw,
  };
}
