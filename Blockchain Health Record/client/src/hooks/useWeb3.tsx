import { useState, useEffect } from "react";
import { ethers } from "ethers";
import Web3 from "web3";

export interface Web3State {
  isMetaMaskInstalled: boolean;
  isConnected: boolean;
  address: string | null;
  connectWallet: () => Promise<string>;
  getSignature: (message: string) => Promise<string>;
}

export const useWeb3 = (): Web3State => {
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [address, setAddress] = useState<string | null>(null);

  // Check if MetaMask is installed
  useEffect(() => {
    if (typeof window !== "undefined") {
      const { ethereum } = window as any;
      setIsMetaMaskInstalled(!!ethereum && !!ethereum.isMetaMask);
    }
  }, []);

  // Connect to MetaMask wallet
  const connectWallet = async (): Promise<string> => {
    try {
      if (!isMetaMaskInstalled) {
        throw new Error("MetaMask is not installed");
      }

      const { ethereum } = window as any;
      
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      
      const userAddress = accounts[0];
      setAddress(userAddress);
      setIsConnected(true);
      
      return userAddress;
    } catch (error) {
      console.error("Error connecting to MetaMask:", error);
      throw error;
    }
  };

  // Get signature for authentication
  const getSignature = async (message: string): Promise<string> => {
    try {
      if (!isMetaMaskInstalled || !isConnected || !address) {
        throw new Error("MetaMask is not connected");
      }

      const { ethereum } = window as any;
      const provider = new ethers.BrowserProvider(ethereum);
      const signer = await provider.getSigner();
      
      // Sign the message
      const signature = await signer.signMessage(message);
      return signature;
    } catch (error) {
      console.error("Error signing message:", error);
      throw error;
    }
  };

  return {
    isMetaMaskInstalled,
    isConnected,
    address,
    connectWallet,
    getSignature,
  };
};
