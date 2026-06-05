"use client";

import { Download, MonitorDown, Share, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIosSafariLike() {
  if (typeof window === "undefined") {
    return false;
  }

  const userAgent = window.navigator.userAgent.toLowerCase();
  const isIos = /iphone|ipad|ipod/.test(userAgent);
  const isWebKit = /safari/.test(userAgent);
  const isOtherIosBrowser = /crios|fxios|edgios/.test(userAgent);
  return isIos && isWebKit && !isOtherIosBrowser;
}

export function PwaInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  const canUseNativePrompt = Boolean(installPrompt);
  const shouldShow = isVisible && !isInstalled && (canUseNativePrompt || isIos);

  const copy = useMemo(
    () =>
      isIos
        ? {
            title: "Agregá el Prode al inicio",
            body: "Abrí Compartir y elegí Agregar a inicio para entrar como app.",
            primary: "Listo",
          }
        : {
            title: "Instalá el Prode",
            body: "Sumalo al escritorio para entrar más rápido durante el Mundial.",
            primary: "Instalar",
          },
    [isIos],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // La app sigue funcionando si el navegador bloquea el service worker.
      });
    }

    const updateInstalledState = () => {
      const nextIsInstalled = isStandaloneDisplay();
      setIsInstalled(nextIsInstalled);
      if (nextIsInstalled) {
        setIsVisible(false);
      }
    };

    const currentIsIos = isIosSafariLike();
    const currentIsInstalled = isStandaloneDisplay();
    const wasClosedThisSession = window.sessionStorage.getItem("prode-pwa-install-closed") === "true";
    const initialFrame = window.requestAnimationFrame(() => {
      setIsIos(currentIsIos);
      setIsInstalled(currentIsInstalled);
      if (!wasClosedThisSession && currentIsIos && !currentIsInstalled) {
        setIsVisible(true);
      }
    });

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      if (isStandaloneDisplay()) {
        return;
      }

      setInstallPrompt(event as BeforeInstallPromptEvent);
      if (window.sessionStorage.getItem("prode-pwa-install-closed") !== "true") {
        setIsVisible(true);
      }
    };

    const handleAppInstalled = () => {
      window.localStorage.setItem("prode-pwa-installed", "true");
      setIsInstalled(true);
      setIsVisible(false);
      setInstallPrompt(null);
    };

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    standaloneQuery.addEventListener("change", updateInstalledState);
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.cancelAnimationFrame(initialFrame);
      standaloneQuery.removeEventListener("change", updateInstalledState);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (isIos) {
      window.sessionStorage.setItem("prode-pwa-install-closed", "true");
      setIsVisible(false);
      return;
    }

    if (!installPrompt) {
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === "accepted") {
      window.localStorage.setItem("prode-pwa-installed", "true");
    }
    window.sessionStorage.setItem("prode-pwa-install-closed", "true");
    setInstallPrompt(null);
    setIsVisible(false);
  }

  function handleClose() {
    window.sessionStorage.setItem("prode-pwa-install-closed", "true");
    setIsVisible(false);
  }

  if (!shouldShow) {
    return null;
  }

  return (
    <aside
      className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border-2 border-[#1d2430] bg-[#fffdf5] p-3 shadow-[5px_5px_0_#1d2430] sm:bottom-4 sm:p-4"
      aria-label="Instalar aplicación"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border-2 border-[#1d2430] bg-[#ffd447] text-[#1d2430]">
          {isIos ? <Share size={20} strokeWidth={2.2} /> : <MonitorDown size={21} strokeWidth={2.2} />}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold text-[#1d2430]">{copy.title}</p>
          <p className="mt-0.5 text-xs leading-5 text-[#4c5564] sm:text-sm">{copy.body}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button type="button" onClick={handleInstall} className="btn-primary inline-flex items-center gap-2 px-3 py-2 text-xs">
              <Download size={15} strokeWidth={2.3} />
              {copy.primary}
            </button>
            <button type="button" onClick={handleClose} className="btn-ghost px-3 py-2 text-xs">
              Ahora no
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#4c5564] transition hover:bg-[#fff0be] hover:text-[#1d2430]"
          aria-label="Cerrar aviso de instalación"
          title="Cerrar"
        >
          <X size={18} strokeWidth={2.2} />
        </button>
      </div>
    </aside>
  );
}
