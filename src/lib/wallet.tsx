"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { ethers } from "ethers";
import { FUJI_CHAIN_ID, FUJI_RPC_URL, getFujiProvider } from "./web3";

interface WalletContextType {
  address: string | null;
  balance: string;
  isJudgeMode: boolean;
  connecting: boolean;
  faucetLoading: boolean;
  connectMetamask: () => Promise<void>;
  activateJudgeMode: () => Promise<void>;
  disconnect: () => void;
  refreshBalance: () => Promise<void>;
  getSigner: () => Promise<ethers.Signer | null>;
}

const WalletContext = createContext<WalletContextType>({
  address: null,
  balance: "0.0",
  isJudgeMode: false,
  connecting: false,
  faucetLoading: false,
  connectMetamask: async () => {},
  activateJudgeMode: async () => {},
  disconnect: () => {},
  refreshBalance: async () => {},
  getSigner: async () => null,
});

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState("0.0");
  const [isJudgeMode, setIsJudgeMode] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [faucetLoading, setFaucetLoading] = useState(false);
  const [burnerKey, setBurnerKey] = useState<string | null>(null);

  // Check saved session on mount
  useEffect(() => {
    const savedBurner = sessionStorage.getItem("tastechain_burner_key");
    if (savedBurner) {
      try {
        const provider = getFujiProvider();
        const wallet = new ethers.Wallet(savedBurner, provider);
        setBurnerKey(savedBurner);
        setAddress(wallet.address);
        setIsJudgeMode(true);
        fetchBalance(wallet.address);
      } catch (err) {
        console.error("Failed to restore burner wallet", err);
      }
    }
  }, []);

  const fetchBalance = async (addr: string) => {
    try {
      const provider = getFujiProvider();
      const bal = await provider.getBalance(addr);
      setBalance(parseFloat(ethers.formatEther(bal)).toFixed(3));
    } catch (err) {
      console.warn("Could not fetch balance:", err);
    }
  };

  const refreshBalance = async () => {
    if (address) {
      await fetchBalance(address);
    }
  };

  // 1. Connect MetaMask / Core Wallet
  const connectMetamask = async () => {
    if (typeof window === "undefined" || !(window as any).ethereum) {
      alert("ไม่พบกระเป๋า Web3 (เช่น MetaMask หรือ Core Wallet) ในเบราว์เซอร์ของคุณ\nคุณสามารถคลิกปุ่ม '⚡ 1-Click Judge Mode' เพื่อทดสอบได้ทันทีโดยไม่ต้องลง Extension!");
      return;
    }

    setConnecting(true);
    try {
      const provider = new ethers.BrowserProvider((window as any).ethereum);

      // Request network switch to Avalanche Fuji
      try {
        await provider.send("wallet_switchEthereumChain", [
          { chainId: "0x" + FUJI_CHAIN_ID.toString(16) },
        ]);
      } catch (switchError: any) {
        // Chain not added, request add
        if (switchError.code === 4902) {
          await provider.send("wallet_addEthereumChain", [
            {
              chainId: "0x" + FUJI_CHAIN_ID.toString(16),
              chainName: "Avalanche Fuji Testnet",
              nativeCurrency: { name: "AVAX", symbol: "AVAX", decimals: 18 },
              rpcUrls: [FUJI_RPC_URL],
              blockExplorerUrls: ["https://testnet.snowtrace.io/"],
            },
          ]);
        }
      }

      const signer = await provider.getSigner();
      const addr = await signer.getAddress();
      setAddress(addr);
      setIsJudgeMode(false);
      setBurnerKey(null);
      sessionStorage.removeItem("tastechain_burner_key");
      await fetchBalance(addr);
    } catch (err: any) {
      console.error("Connect wallet error:", err);
    } finally {
      setConnecting(false);
    }
  };

  // 2. Activate ⚡ 1-Click Judge Demo Mode (Burner Wallet + Auto Faucet)
  const activateJudgeMode = async () => {
    setFaucetLoading(true);
    try {
      const provider = getFujiProvider();
      // Generate new burner wallet
      const newWallet = ethers.Wallet.createRandom().connect(provider);
      setBurnerKey(newWallet.privateKey);
      setAddress(newWallet.address);
      setIsJudgeMode(true);
      sessionStorage.setItem("tastechain_burner_key", newWallet.privateKey);

      // Call Faucet API to request 0.1 Fuji AVAX
      try {
        const res = await fetch("/api/faucet", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: newWallet.address }),
        });
        const data = await res.json();
        if (data.success) {
          console.log("Faucet drip success:", data.txHash);
          // Wait briefly for transaction to be mined
          setTimeout(() => {
            fetchBalance(newWallet.address);
          }, 3000);
        } else {
          console.warn("Faucet response:", data.error);
        }
      } catch (faucetErr) {
        console.warn("Faucet call failed:", faucetErr);
      }

      await fetchBalance(newWallet.address);
    } catch (err: any) {
      console.error("Judge mode error:", err);
    } finally {
      setFaucetLoading(false);
    }
  };

  const disconnect = () => {
    setAddress(null);
    setBalance("0.0");
    setIsJudgeMode(false);
    setBurnerKey(null);
    sessionStorage.removeItem("tastechain_burner_key");
  };

  const getSigner = async (): Promise<ethers.Signer | null> => {
    if (isJudgeMode && burnerKey) {
      const provider = getFujiProvider();
      return new ethers.Wallet(burnerKey, provider);
    }

    if (typeof window !== "undefined" && (window as any).ethereum) {
      const provider = new ethers.BrowserProvider((window as any).ethereum);
      return await provider.getSigner();
    }

    return null;
  };

  return (
    <WalletContext.Provider
      value={{
        address,
        balance,
        isJudgeMode,
        connecting,
        faucetLoading,
        connectMetamask,
        activateJudgeMode,
        disconnect,
        refreshBalance,
        getSigner,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  return useContext(WalletContext);
}
