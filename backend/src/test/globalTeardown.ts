import { teardownTestEnvironment } from '../setup';

export default async (): Promise<void> => {
  console.log('Running global teardown...');
  
  try {
    await teardownTestEnvironment();
  } catch (error) {
    console.error('Error in global teardown:', error);
  }
  
  // Force exit after a short delay to ensure all resources are cleaned up
  setTimeout(() => {
    console.log('Forcing process exit...');
    process.exit(0);
  }, 1000);
};


