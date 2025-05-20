/**
 * This file contains utilities for simulating blockchain operations
 * In a real application, this would interact with a real blockchain
 * For this demo, we're simulating the blockchain behavior
 */

// Simulates a blockchain transaction with progress updates
export const simulateBlockchainTransaction = (
  progressCallback: (progress: number) => void,
  onComplete: () => void
) => {
  let progress = 0;
  const interval = setInterval(() => {
    progress += Math.floor(Math.random() * 10) + 5; // Random progress between 5-15%
    
    if (progress >= 100) {
      progress = 100;
      progressCallback(progress);
      clearInterval(interval);
      
      // Simulate blockchain confirmation
      setTimeout(() => {
        onComplete();
      }, 500);
    } else {
      progressCallback(progress);
    }
  }, 500);
  
  return () => clearInterval(interval); // Return cleanup function
};

// Simulates uploading a health record to the blockchain
export const simulateBlockchainUpload = (
  progressCallback: (progress: number) => void,
  onComplete: () => void
) => {
  return simulateBlockchainTransaction(progressCallback, onComplete);
};

// Generate a fake transaction hash
export const generateTransactionHash = (): string => {
  const chars = "0123456789abcdef";
  let hash = "0x";
  
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return hash;
};

// Generate a fake blockchain address if needed
export const generateBlockchainAddress = (): string => {
  const chars = "0123456789abcdef";
  let address = "0x";
  
  for (let i = 0; i < 40; i++) {
    address += chars[Math.floor(Math.random() * chars.length)];
  }
  
  return address;
};

// Simulate verifying a document hash on the blockchain
export const verifyDocumentHash = async (hash: string): Promise<boolean> => {
  // In a real application, this would check the blockchain
  // For this demo, we'll just return true after a delay
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 1000);
  });
};
