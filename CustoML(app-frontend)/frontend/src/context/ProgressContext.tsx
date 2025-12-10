import { createContext, useContext, useState } from "react";

const ProgressContext = createContext<any>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [progress, setProgress] = useState<Record<string, boolean>>({});

  const markComplete = (key: string) => {
    setProgress((prev) => ({ ...prev, [key]: true }));
  };

  return (
    <ProgressContext.Provider value={{ progress, markComplete }}>
      {children}
    </ProgressContext.Provider>
  );
}

export const useProgress = () => useContext(ProgressContext);
