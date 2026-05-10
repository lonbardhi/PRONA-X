"use client";

import Image from "next/image";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  FileText,
  Loader2,
  RotateCcw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
} from "react";

import { PropertyMediaPreview } from "@/components/PropertyMediaPreview";
import type { PropertyMedia } from "@/lib/properties";
import { getPropertyMediaKindFromUrl } from "@/lib/property-media";
import { defaultLocale, type Locale } from "@/lib/i18n";

type PropertyMediaViewerProps = {
  activeIndex: number;
  locale?: Locale;
  media: PropertyMedia[];
  onActiveIndexChange: (index: number) => void;
  onClose: () => void;
  title: string;
};

type DragState = {
  mode: "pan" | "swipe";
  originOffsetX: number;
  originOffsetY: number;
  startX: number;
  startY: number;
};

function getMediaLabel(item: PropertyMedia, index: number, total: number, title: string) {
  return item.alt_text || `${title} media ${index + 1} of ${total}`;
}

function getWrappedIndex(index: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return (index + total) % total;
}

export function PropertyMediaViewer({
  activeIndex,
  locale = defaultLocale,
  media,
  onActiveIndexChange,
  onClose,
  title,
}: PropertyMediaViewerProps) {
  const activeMedia = media[activeIndex];
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const viewerRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState | null>(null);
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const total = media.length;
  const mediaKind = activeMedia
    ? getPropertyMediaKindFromUrl(activeMedia.public_url)
    : "file";
  const canZoom = mediaKind === "image" && !imageError;
  const isSq = locale === "sq";

  const showPrevious = useCallback(() => {
    onActiveIndexChange(getWrappedIndex(activeIndex - 1, total));
  }, [activeIndex, onActiveIndexChange, total]);

  const showNext = useCallback(() => {
    onActiveIndexChange(getWrappedIndex(activeIndex + 1, total));
  }, [activeIndex, onActiveIndexChange, total]);

  const resetView = useCallback(() => {
    setOffset({ x: 0, y: 0 });
    setScale(1);
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setImageError(false);
      setImageLoading(mediaKind === "image");
      resetView();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [activeIndex, mediaKind, resetView]);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        showNext();
        return;
      }

      if (event.key === "ArrowLeft") {
        event.preventDefault();
        showPrevious();
        return;
      }

      if (event.key !== "Tab" || !viewerRef.current) {
        return;
      }

      const focusable = Array.from(
        viewerRef.current.querySelectorAll<HTMLElement>(
          "a[href], button:not([disabled]), video[controls]",
        ),
      ).filter((element) => !element.hasAttribute("aria-hidden"));

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose, showNext, showPrevious]);

  if (!activeMedia || total === 0) {
    return null;
  }

  function zoomIn() {
    setScale((value) => Math.min(value + 0.25, 3));
  }

  function zoomOut() {
    setScale((value) => {
      const nextValue = Math.max(value - 0.25, 1);
      if (nextValue === 1) {
        setOffset({ x: 0, y: 0 });
      }
      return nextValue;
    });
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    dragStateRef.current = {
      mode: scale > 1 ? "pan" : "swipe",
      originOffsetX: offset.x,
      originOffsetY: offset.y,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.mode !== "pan") {
      return;
    }

    setOffset({
      x: dragState.originOffsetX + event.clientX - dragState.startX,
      y: dragState.originOffsetY + event.clientY - dragState.startY,
    });
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const dragState = dragStateRef.current;
    dragStateRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (!dragState || dragState.mode !== "swipe") {
      return;
    }

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;

    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY)) {
      return;
    }

    if (deltaX < 0) {
      showNext();
    } else {
      showPrevious();
    }
  }

  const mediaLabel = getMediaLabel(activeMedia, activeIndex, total, title);

  return (
    <div
      aria-label={isSq ? "Shikuesi i medias së pronës" : "Property media viewer"}
      aria-modal="true"
      className="fixed inset-0 z-[70] overflow-hidden bg-slate-950/86 px-2 py-3 backdrop-blur-md sm:px-5 sm:py-5"
      onClick={(event) => {
        event.stopPropagation();
        onClose();
      }}
      role="dialog"
    >
      <div
        className="mx-auto grid h-full w-full max-w-7xl min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden rounded-xl border border-white/10 bg-slate-950 text-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        ref={viewerRef}
      >
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-white/10 px-3 py-3 sm:px-4">
          <div className="min-w-0 overflow-hidden">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/50">
              {isSq ? "Inspektim media" : "Media inspection"}
            </p>
            <h2 className="mt-1 line-clamp-2 break-words text-sm font-semibold leading-snug text-white sm:text-base">
              {title}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              {activeIndex + 1} {isSq ? "nga" : "of"} {total}
            </span>
            <button
              aria-label={isSq ? "Mbyll shikuesin e medias" : "Close media viewer"}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white transition hover:bg-white/10"
              onClick={onClose}
              ref={closeButtonRef}
              type="button"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="relative grid min-h-0 min-w-0 p-2 sm:p-4">
          <div className="grid min-h-0 min-w-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
            <div
              className={`relative min-h-0 overflow-hidden rounded-xl bg-black ${
                scale > 1 ? "cursor-grab touch-none" : "cursor-default touch-pan-y"
              }`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerCancel={() => {
                dragStateRef.current = null;
              }}
              onPointerUp={handlePointerUp}
            >
              {mediaKind === "image" && !imageError ? (
                <>
                  {imageLoading ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40">
                      <Loader2 className="h-8 w-8 animate-spin text-white/80" />
                    </div>
                  ) : null}
                  <Image
                    alt={mediaLabel}
                    className="select-none object-contain transition-transform duration-100"
                    draggable={false}
                    fill
                    onError={() => {
                      setImageError(true);
                      setImageLoading(false);
                    }}
                    onLoad={() => setImageLoading(false)}
                    priority
                    sizes="100vw"
                    src={activeMedia.public_url}
                    style={{
                      transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
                    }}
                  />
                </>
              ) : null}

              {mediaKind === "video" ? (
                <video
                  aria-label={mediaLabel}
                  className="h-full min-h-0 w-full bg-black object-contain"
                  controls
                  preload="metadata"
                >
                  <source src={activeMedia.public_url} />
                </video>
              ) : null}

              {mediaKind === "pdf" ? (
                <div className="grid h-full min-h-0 bg-slate-900">
                  <iframe
                    className="h-full w-full"
                    src={activeMedia.public_url}
                    title={mediaLabel}
                  />
                </div>
              ) : null}

              {(mediaKind === "file" || imageError) && mediaKind !== "pdf" ? (
                <div className="flex h-full min-h-0 flex-col items-center justify-center gap-3 p-6 text-center">
                  <AlertTriangle className="h-10 w-10 text-amber-300" />
                  <p className="text-sm font-semibold text-white">
                    {isSq
                      ? "Ky element media nuk mund të shfaqej."
                      : "This media item could not be previewed."}
                  </p>
                  <a
                    className="inline-flex h-10 items-center gap-2 rounded-lg border border-white/15 px-4 text-sm font-semibold text-white transition hover:bg-white/10"
                    href={activeMedia.public_url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {isSq ? "Hap origjinalin" : "Open original"}
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
            </div>

            <div className="grid min-w-0 gap-2 text-xs text-white/65 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
              <span className="min-w-0 break-words">{mediaLabel}</span>
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <button
                  aria-label={isSq ? "Zvogëlo" : "Zoom out"}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canZoom || scale === 1}
                  onClick={zoomOut}
                  type="button"
                >
                  <ZoomOut className="h-4 w-4" />
                  {isSq ? "Zvogëlo" : "Out"}
                </button>
                <button
                  aria-label={isSq ? "Rivendos pamjen" : "Reset media view"}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canZoom || (scale === 1 && offset.x === 0 && offset.y === 0)}
                  onClick={resetView}
                  type="button"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isSq ? "Rivendos" : "Reset"}
                </button>
                <button
                  aria-label={isSq ? "Zmadho" : "Zoom in"}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-white/15 px-3 font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={!canZoom || scale >= 3}
                  onClick={zoomIn}
                  type="button"
                >
                  <ZoomIn className="h-4 w-4" />
                  {isSq ? "Zmadho" : "In"}
                </button>
              </div>
            </div>
          </div>

          <button
            aria-label={isSq ? "Shfaq median e mëparshme" : "Show previous media"}
            className="absolute left-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-white shadow-lg backdrop-blur transition hover:bg-white/15 sm:h-12 sm:w-12"
            onClick={showPrevious}
            type="button"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            aria-label={isSq ? "Shfaq median tjetër" : "Show next media"}
            className="absolute right-3 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/15 bg-slate-950/70 text-white shadow-lg backdrop-blur transition hover:bg-white/15 sm:h-12 sm:w-12"
            onClick={showNext}
            type="button"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="min-w-0 border-t border-white/10 px-3 py-3 sm:px-4">
          <div
            className="flex min-w-0 snap-x gap-2 overflow-x-auto pb-1"
            onWheel={(event) => {
              if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
                event.currentTarget.scrollLeft += event.deltaY;
                event.preventDefault();
              }
            }}
          >
            {media.map((item, index) => {
              const kind = getPropertyMediaKindFromUrl(item.public_url);
              const label = getMediaLabel(item, index, total, title);

              return (
                <button
                  aria-label={`${isSq ? "Shfaq" : "Show"} ${label}`}
                  className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border bg-slate-900 transition ${
                    index === activeIndex
                      ? "border-emerald-300 ring-2 ring-emerald-300/60"
                      : "border-white/15 hover:border-white/40"
                  }`}
                  key={item.id}
                  onClick={() => onActiveIndexChange(index)}
                  type="button"
                >
                  {kind === "pdf" ? (
                    <span className="flex h-full w-full items-center justify-center bg-white/8 text-white/80">
                      <FileText className="h-6 w-6" />
                    </span>
                  ) : (
                    <PropertyMediaPreview
                      fit="cover"
                      media={item}
                      sizes="112px"
                      title={title}
                    />
                  )}
                  <span className="absolute bottom-1 left-1 rounded-full bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {index + 1}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
