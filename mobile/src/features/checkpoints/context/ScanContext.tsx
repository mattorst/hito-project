import {
  createContext,
  useContext,
  useMemo,
  useState,
  ReactNode,
} from "react";

interface ScanContextValue {
  scannedQr: string | null;
  setScannedQr: (value: string | null) => void;
}

const ScanContext = createContext<ScanContextValue | undefined>(
  undefined,
);

export function ScanProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [scannedQr, setScannedQr] = useState<string | null>(
    null,
  );

  const value = useMemo(
    () => ({
      scannedQr,
      setScannedQr,
    }),
    [scannedQr],
  );

  return (
    <ScanContext.Provider value={value}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const context = useContext(ScanContext);

  if (!context) {
    throw new Error(
      "useScan debe utilizarse dentro de ScanProvider",
    );
  }

  return context;
}