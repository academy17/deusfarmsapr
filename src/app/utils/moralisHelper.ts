import Moralis from 'moralis';

let isInitialized = false;
let pendingInitialization: Promise<void> | null = null;

export const initializeMoralis = async (): Promise<void> => {
  if (isInitialized) return; // Already initialized

  if (pendingInitialization) {
    // If initialization is in progress, wait for it to complete
    await pendingInitialization;
    return;
  }

  try {
    // Set the pending initialization
    pendingInitialization = Moralis.start({
      apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY as string,
    });

    await pendingInitialization;
    isInitialized = true; // Mark as initialized after successful start
  } catch (error) {
    console.error('Error initializing Moralis:', error);
    throw new Error('Moralis initialization failed.');
  } finally {
    pendingInitialization = null; // Reset pending promise
  }
};

export default Moralis;
