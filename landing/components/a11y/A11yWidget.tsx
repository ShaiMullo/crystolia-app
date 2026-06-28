"use client";

// Native accessibility widget (no third-party overlay scripts). A floating
// button opens a dialog panel of user preferences — text size, high contrast,
// reduce motion, highlight links — persisted in the first-party cl_a11y cookie.
// Settings are applied as attributes/classes on <html>; the CSS lives in
// globals.css. Self-contained: no context, mounts once per layout.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../i18n/config";
import { getDictionary } from "../../i18n/getDictionary";
import {
  A11ySettings,
  DEFAULT_SETTINGS,
  TEXT_MAX,
  TEXT_MIN,
  clearA11yCookie,
  isDefault,
  parseA11yCookie,
  serializeA11yCookie,
} from "./a11yCore";

// Display-only percentage map (kept in sync with the CSS steps in globals.css).
const TEXT_PERCENT: Record<number, number> = {
  [-1]: 94,
  0: 100,
  1: 106,
  2: 113,
  3: 125,
  4: 138,
};

/** Apply settings to <html> as attributes/classes (the CSS keys off these). */
function applyToDom(s: A11ySettings) {
  const el = document.documentElement;
  if (s.text !== 0) el.setAttribute("data-a11y-text", String(s.text));
  else el.removeAttribute("data-a11y-text");
  el.classList.toggle("a11y-contrast", s.contrast);
  el.classList.toggle("a11y-reduce-motion", s.motion);
  el.classList.toggle("a11y-highlight-links", s.links);
}

function ToggleRow({
  label,
  on,
  onToggle,
}: {
  label: string;
  on: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start text-sm font-medium text-[#3D2914] transition-colors hover:bg-[#3D2914]/5"
    >
      <span>{label}</span>
      <span
        aria-hidden="true"
        className={[
          "flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
          on ? "justify-end bg-[#F5C542]" : "justify-start bg-[#8D6E63]/40",
        ].join(" ")}
      >
        <span className="h-5 w-5 rounded-full bg-white shadow" />
      </span>
    </button>
  );
}

export default function A11yWidget({ locale }: { locale: Locale }) {
  const [settings, setSettings] = useState<A11ySettings>(DEFAULT_SETTINGS);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const panelId = useId();

  // On mount, restore saved settings and apply them (read-only — no cookie write).
  useEffect(() => {
    const saved = parseA11yCookie(typeof document !== "undefined" ? document.cookie : "");
    if (saved) {
      setSettings(saved);
      applyToDom(saved);
    }
  }, []);

  // Persist + apply on every user-initiated change.
  const update = useCallback((next: A11ySettings) => {
    setSettings(next);
    applyToDom(next);
    if (typeof document !== "undefined") {
      document.cookie = isDefault(next) ? clearA11yCookie() : serializeA11yCookie(next);
    }
  }, []);

  const closePanel = useCallback(() => {
    setOpen(false);
    triggerRef.current?.focus();
  }, []);

  // While open: focus into the panel, trap Tab, close on Escape.
  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => {
      const first = panelRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      (first ?? panelRef.current)?.focus();
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closePanel();
        return;
      }
      if (e.key !== "Tab") return;
      const root = panelRef.current;
      if (!root) return;
      const f = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, closePanel]);

  const dict = getDictionary(locale).a11y.widget;
  const isRTL = locale === "he";
  const side = isRTL ? "right-4" : "left-4";

  const setText = (delta: number) =>
    update({ ...settings, text: Math.max(TEXT_MIN, Math.min(TEXT_MAX, settings.text + delta)) });

  return (
    <>
      {/* Floating trigger — fixed, visible on every page. */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={dict.open}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        className={`fixed bottom-4 ${side} z-[90] flex h-12 w-12 items-center justify-center rounded-full border border-[#F5C542]/40 bg-[#3D2914] text-[#F5C542] shadow-xl transition-transform hover:scale-105 focus-visible:scale-105`}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="4" r="1.8" fill="currentColor" />
          <path
            d="M4.5 8.2c2.4.9 4.9 1.3 7.5 1.3s5.1-.4 7.5-1.3M12 9.5v4.2m0 0l-2.6 6.3M12 13.7l2.6 6.3"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[95] bg-black/20"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closePanel();
          }}
        >
          <div
            ref={panelRef}
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            dir={isRTL ? "rtl" : "ltr"}
            tabIndex={-1}
            className={`fixed bottom-20 ${side} z-[95] w-[calc(100vw-2rem)] max-w-[20rem] overflow-hidden rounded-2xl border border-[#F5C542]/25 bg-[#FFF8E7] shadow-2xl outline-none`}
          >
            <div className="flex items-center justify-between gap-3 border-b border-[#8D6E63]/15 px-4 py-3">
              <h2 id={titleId} className="text-base font-semibold text-[#3D2914]">
                {dict.title}
              </h2>
              <button
                type="button"
                onClick={closePanel}
                aria-label={dict.close}
                className="-m-1 rounded-full p-1 text-[#5D4037] transition-colors hover:text-[#3D2914]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </div>

            <div className="space-y-1 p-3">
              {/* Text size */}
              <div className="flex items-center justify-between gap-3 px-3 py-2">
                <span className="text-sm font-medium text-[#3D2914]">{dict.textSize}</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    data-autofocus
                    onClick={() => setText(-1)}
                    disabled={settings.text <= TEXT_MIN}
                    aria-label={dict.decreaseText}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3D2914]/25 text-sm font-bold text-[#3D2914] transition-colors hover:bg-[#3D2914]/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    A−
                  </button>
                  <span
                    aria-live="polite"
                    className="min-w-[3rem] text-center text-xs tabular-nums text-[#5D4037]"
                  >
                    {TEXT_PERCENT[settings.text] ?? 100}%
                  </span>
                  <button
                    type="button"
                    onClick={() => setText(1)}
                    disabled={settings.text >= TEXT_MAX}
                    aria-label={dict.increaseText}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-[#3D2914]/25 text-base font-bold text-[#3D2914] transition-colors hover:bg-[#3D2914]/5 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    A+
                  </button>
                </div>
              </div>

              <ToggleRow
                label={dict.contrast}
                on={settings.contrast}
                onToggle={() => update({ ...settings, contrast: !settings.contrast })}
              />
              <ToggleRow
                label={dict.reduceMotion}
                on={settings.motion}
                onToggle={() => update({ ...settings, motion: !settings.motion })}
              />
              <ToggleRow
                label={dict.highlightLinks}
                on={settings.links}
                onToggle={() => update({ ...settings, links: !settings.links })}
              />

              <div className="px-3 pt-2">
                <button
                  type="button"
                  onClick={() => update(DEFAULT_SETTINGS)}
                  disabled={isDefault(settings)}
                  className="w-full rounded-full border border-[#3D2914]/30 px-4 py-2 text-sm font-medium text-[#3D2914] transition-colors hover:bg-[#3D2914]/5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {dict.reset}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
