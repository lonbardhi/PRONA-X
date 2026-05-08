"use client";

import { useEffect } from "react";

const SESSION_TIMEOUT_MS = 45 * 60 * 1000;
const TIMEOUT_PATH =
  "/auth/clear-session?next=/login&message=Session%20timed%20out.%20Sign%20in%20again%20to%20continue.";

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
