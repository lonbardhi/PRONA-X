"use client";

import { useEffect } from "react";

const SESSION_TIMEOUT_MS = 45 * 60 * 1000;
const TIMEOUT_PATH =
  "/auth/clear-session?next=/login&message=Sesioni%20ka%20skaduar.%20Hyr%20perseri%20per%20te%20vazhduar.";

export function SessionTimeout() {
  useEffect(() => {
    let timeoutId: number | undefined;

    function scheduleTimeout() {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      timeoutId = window.setTimeout(() => {
        window.location.assign(TIMEOUT_PATH);
      }, SESSION_TIMEOUT_MS);
    }

    const activityEvents = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
    ] as const;

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, scheduleTimeout, { passive: true });
    });

    scheduleTimeout();

    return () => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, scheduleTimeout);
      });
    };
  }, []);

  return null;
}
