"use client";

import { useEffect, useRef } from "react";
import { TURNSTILE_SITE_KEY } from "@/lib/constants";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id?: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
// Cloudflare's always-pass test key, so the widget works on localhost.
const TEST_KEY = "1x00000000000000000000AA";

let loading: Promise<void> | null = null;
function loadScript() {
  if (window.turnstile) return Promise.resolve();
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("Turnstile failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

/**
 * Bot check. Renders a hidden `cf-turnstile-response` input inside the surrounding form.
 * Tokens are single use: call resetTurnstile(form) after each submit.
 */
export function Turnstile() {
  const el = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let id: string | undefined;
    let cancelled = false;
    const host = location.hostname;
    const sitekey = host === "localhost" || host === "127.0.0.1" ? TEST_KEY : TURNSTILE_SITE_KEY;
    loadScript()
      .then(() => {
        if (cancelled || !el.current || !window.turnstile) return;
        id = window.turnstile.render(el.current, { sitekey, theme: "light", size: "flexible", appearance: "interaction-only" });
        el.current.dataset.widgetId = id;
      })
      .catch((e) => console.error(e));
    return () => {
      cancelled = true;
      if (id && window.turnstile) window.turnstile.remove(id);
    };
  }, []);
  return <div ref={el} data-turnstile className="min-h-0 empty:hidden" />;
}

export function turnstileToken(form: HTMLFormElement) {
  return String(new FormData(form).get("cf-turnstile-response") ?? "");
}

export function resetTurnstile(form: HTMLFormElement | null) {
  const id = form?.querySelector<HTMLElement>("[data-turnstile]")?.dataset.widgetId;
  if (id && window.turnstile) window.turnstile.reset(id);
}
