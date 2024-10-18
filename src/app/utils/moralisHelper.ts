import Moralis from 'moralis';

// Flag to track if Moralis has already been initialized
let isInitialized = false;

// Initialize Moralis once
export const initializeMoralis = async (): Promise<void> => {
  if (!isInitialized) {
    try {
      await Moralis.start({
        apiKey: process.env.NEXT_PUBLIC_MORALIS_API_KEY as string, // Use the API key from environment variables
      });
      isInitialized = true;
    } catch (error) {
      console.error('Error initializing Moralis:', error);
      throw new Error('Moralis initialization failed.');
    }
  }
};

export default Moralis;
