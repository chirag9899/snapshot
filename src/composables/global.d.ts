// global.d.ts
declare global {
  interface Window {
    ethereum: {
      on: (event: string, callback: (...args: any[]) => void) => void;
      // Add other methods and properties as needed
    };
  }
}

export {};
