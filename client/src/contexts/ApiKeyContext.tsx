/** Signal Atelier: API credentials are visible as local-state instrumentation, never remote configuration. */
import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "gugopro_gemini_api_key";
type ApiKeyContextValue = { apiKey: string; hasApiKey: boolean; setApiKey: (key: string) => void; clearApiKey: () => void; };
const ApiKeyContext = createContext<ApiKeyContextValue | null>(null);

export function ApiKeyProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKeyState] = useState("");
  useEffect(() => { setApiKeyState(localStorage.getItem(STORAGE_KEY) ?? ""); }, []);
  const value = useMemo<ApiKeyContextValue>(() => ({
    apiKey,
    hasApiKey: Boolean(apiKey.trim()),
    setApiKey: (key) => { const cleaned = key.trim(); localStorage.setItem(STORAGE_KEY, cleaned); setApiKeyState(cleaned); },
    clearApiKey: () => { localStorage.removeItem(STORAGE_KEY); setApiKeyState(""); },
  }), [apiKey]);
  return <ApiKeyContext.Provider value={value}>{children}</ApiKeyContext.Provider>;
}

export function useApiKey() {
  const context = useContext(ApiKeyContext);
  if (!context) throw new Error("useApiKey must be used within ApiKeyProvider");
  return context;
}

