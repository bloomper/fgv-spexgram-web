"use client";

import { useEffect, useRef } from "react";
import { useLocale } from "next-intl";
import { TURNSTILE_ORIGIN } from "@/utils/csp";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = `${TURNSTILE_ORIGIN}/turnstile/v0/api.js?render=explicit`;
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) {
    return Promise.resolve(window.turnstile);
  }
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = SCRIPT;
      script.async = true;
      script.onload = () => window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load"));
      script.onerror = () => {
        loading = null;
        reject(new Error("Turnstile did not load"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

/**
 * Cloudflare Turnstile's widget, for visitors' reports. It hands a token to `onToken`, and null when the token runs out
 * or the check fails; the server verifies the token.
 */
export function Turnstile({ siteKey, onToken, onError }: {
  siteKey: string;
  onToken: (token: string | null) => void;
  onError?: () => void
}) {
  const container = useRef<HTMLDivElement>(null);
  const locale = useLocale();
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onToken, onError]);

  useEffect(() => {
    let widgetId: string | null = null;
    let cancelled = false;

    loadTurnstile().then(api => {
      if (cancelled || !container.current) {
        return;
      }
      widgetId = api.render(container.current, {
        sitekey: siteKey,
        language: locale,
        callback: (token: string) => onTokenRef.current(token),
        "expired-callback": () => onTokenRef.current(null),
        "error-callback": () => {
          onTokenRef.current(null);
          onErrorRef.current?.();
        },
      });
    }, () => onErrorRef.current?.());

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        window.turnstile.remove(widgetId);
      }
    };
  }, [siteKey, locale]);

  return <div ref={container} data-testid="turnstile" className="min-h-[65px]" />;
}
