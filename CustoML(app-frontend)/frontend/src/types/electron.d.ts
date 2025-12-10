export {};

declare global {
  interface Window {
    electronAPI: {
      openFile: () => Promise<string | null>;
      openFolder: () => Promise<string | null>;
      pickDatasetPath: (inputType: string) => Promise<string | null>; // if you added this
      //openFile: (inputType: string) => Promise<string | null>; // if you added this
      //openFolder: (inputType: string) => Promise<string | null>; // if you added this
      pickSaveLocation: () => Promise<string | null>;
      openFile: () => Promise<string | null>;    // returns selected file path or null
      openFolder: () => Promise<string | null>;  // returns selected folder path or null
      parseCSVFeatures: (filePath: string) => Promise<string[]>;
      trainModel: (config: any) => void;
      onTrainLog: (callback: (data: { type: string; message: string; path?: string }) => void) => void;
        readConfig: (modelPath: string) => Promise<Config>;
        runInference: (params: { modelPath: string; inputs: any }) => Promise<string>;
    };
  }
}

declare module '*.png' {
  const value: string;
  export default value;
}

declare module '*.jpg' {
  const value: string;
  export default value;
}

declare module '*.jpeg' {
  const value: string;
  export default value;
}

declare module '*.svg' {
  const value: string;
  export default value;
}

