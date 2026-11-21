"use client";

import { useEffect } from "react";

const IDLE_MS = 10 * 60 * 1000; // 10 minutes of no interaction

const Events = ["pointerdown", "keydown", "mousedown", "touchstart", "scroll", "visibilitychange"] as const;

export default function IdleLogout() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (timer) clearTimeout(timer);
      if (document.visibilityState !== "visible") return;
      timer = setTimeout(() => {
        void fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => {});
        window.location.replace("/login?idle=1");
      }, IDLE_MS);
    };

    const onActivity = () => schedule();

    Events.forEach((name) => window.addEventListener(name, onActivity, { passive: true }));
    if (document.visibilityState === "visible") schedule();

    return () => {
      Events.forEach((name) => window.removeEventListener(name, onActivity));
      if (timer) clearTimeout(timer);
    };
  }, []);

  return null;
}
