"use client";

import { useEffect, useRef, useState } from "react";
import { Download, WifiOff, X } from "lucide-react";

type PwaPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function PwaRuntime() {
  const deferredPrompt = useRef<PwaPrompt | null>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [online, setOnline] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setOnline(navigator.onLine);
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    const onInstallAvailable = (event: Event) => {
      event.preventDefault();
      deferredPrompt.current = event as PwaPrompt;
      setCanInstall(true);
    };
    const onInstalled = () => {
      deferredPrompt.current = null;
      setCanInstall(false);
      setDismissed(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("beforeinstallprompt", onInstallAvailable);
    window.addEventListener("appinstalled", onInstalled);
    if ("serviceWorker" in navigator && (window.isSecureContext || location.hostname === "localhost")) {
      void navigator.serviceWorker.register("/sw.js", { scope: "/" })
        .catch((err: unknown) => console.warn("[pwa] Registro indisponível:", err));
    }
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("beforeinstallprompt", onInstallAvailable);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const prompt = deferredPrompt.current;
    if (!prompt) return;
    deferredPrompt.current = null;
    setCanInstall(false);
    await prompt.prompt();
    await prompt.userChoice.catch(() => null);
  }

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex max-w-[calc(100%-2rem)] flex-col items-end gap-2">
      {!online && (
        <div role="status" className="pointer-events-auto flex max-w-xs items-center gap-2 rounded-xl border border-amber-200 bg-white px-4 py-3 text-sm font-medium text-amber-900 shadow-lg">
          <WifiOff className="h-4 w-4 shrink-0"/>
          Você está sem conexão. As informações do CRM precisam de internet.
        </div>
      )}
      {online && canInstall && !dismissed && (
        <div className="pointer-events-auto flex max-w-xs items-center gap-2 rounded-2xl border bg-card px-3 py-2 shadow-xl">
          <button type="button" onClick={() => void install()} className="flex items-center gap-2 text-sm font-semibold">
            <Download className="h-4 w-4 text-brand" />
            Instalar PAINEL NOVAGENTE
          </button>
          <button type="button" aria-label="Fechar sugestão de instalação" onClick={() => setDismissed(true)} className="rounded-md p-2 text-text-3 hover:bg-subtle">
            <X className="h-4 w-4"/>
          </button>
        </div>
      )}
    </div>
  );
}
