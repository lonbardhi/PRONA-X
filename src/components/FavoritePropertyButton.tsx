"use client";

import { useSyncExternalStore } from "react";
import { Heart } from "lucide-react";

const STORAGE_KEY = "prona-x.saved-properties";
const STORAGE_EVENT = "prona-x:saved-properties";

type FavoritePropertyButtonProps = {
  propertyId: string;
  title: string;
};

function readSavedProperties() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    const parsed = value ? JSON.parse(value) : [];

    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function getSavedSnapshot() {
  return readSavedProperties().join("|");
}

function getServerSnapshot() {
  return "";
}

function subscribeToSavedProperties(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(STORAGE_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(STORAGE_EVENT, callback);
  };
}

export function FavoritePropertyButton({
  propertyId,
  title,
}: FavoritePropertyButtonProps) {
  const savedSnapshot = useSyncExternalStore(
    subscribeToSavedProperties,
    getSavedSnapshot,
    getServerSnapshot,
  );
  const isSaved = savedSnapshot.split("|").includes(propertyId);

  function toggleSaved() {
    const saved = new Set(readSavedProperties());

    if (saved.has(propertyId)) {
      saved.delete(propertyId);
    } else {
      saved.add(propertyId);
    }

    const nextSaved = Array.from(saved);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSaved));
    window.dispatchEvent(new Event(STORAGE_EVENT));
  }

  return (
    <button
      aria-pressed={isSaved}
      aria-label={`${isSaved ? "Unsave" : "Save"} ${title}`}
      className={`flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition hover:scale-105 ${
        isSaved
          ? "border-rose-200 text-rose-600"
          : "border-white/80 text-slate-600 hover:text-rose-600"
      }`}
      onClick={toggleSaved}
      title={isSaved ? "Saved locally" : "Save locally"}
      type="button"
    >
      <Heart className={`h-4 w-4 ${isSaved ? "fill-current" : ""}`} />
    </button>
  );
}
