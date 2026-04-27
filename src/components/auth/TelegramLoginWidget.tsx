import { useEffect, useRef, useState } from "react";

export interface TelegramWidgetUser {
  id: number | string;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number | string;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botUsername: string;
  onAuth: (user: TelegramWidgetUser) => void | Promise<void>;
}

declare global {
  interface Window {
    __tmTelegramAuth?: (user: TelegramWidgetUser) => void;
  }
}

export default function TelegramLoginWidget({
  botUsername,
  onAuth,
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setLoadError(null);
    container.innerHTML = "";

    window.__tmTelegramAuth = (user: TelegramWidgetUser) => {
      void onAuth(user);
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "12");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "__tmTelegramAuth(user)");
    script.onerror = () => {
      setLoadError("Telegram butonu yüklenemedi. Sayfayı yenileyip tekrar deneyin.");
    };

    container.appendChild(script);

    return () => {
      delete window.__tmTelegramAuth;
      container.innerHTML = "";
    };
  }, [botUsername, onAuth]);

  return (
    <div className="space-y-3">
      <div
        className="flex min-h-14 items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 px-4 py-4"
        ref={containerRef}
      />
      {loadError ? (
        <p className="text-center text-sm text-red-600">{loadError}</p>
      ) : null}
    </div>
  );
}
