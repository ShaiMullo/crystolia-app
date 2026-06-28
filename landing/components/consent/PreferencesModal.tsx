"use client";

// Preferences modal (Compliance PR-6). Accessible dialog: role="dialog",
// aria-modal, labelled + described, focus moved in on open, focus trap on
// Tab/Shift+Tab, Escape closes, focus restored to the trigger on close. Toggles
// are role="switch" with aria-checked; Essential is always-on and disabled.
// Client-only (renders nothing until opened); reduced-motion handled globally.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../i18n/config";
import { getDictionary } from "../../i18n/getDictionary";
import { useConsent } from "./useConsent";
import type { ConsentCategory, ToggleableConsent } from "./types";

function Switch({
  on,
  disabled,
  labelId,
  onToggle,
}: {
  on: boolean;
  disabled?: boolean;
  labelId: string;
  onToggle?: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-labelledby={labelId}
      aria-disabled={disabled || undefined}
      disabled={disabled}
      onClick={onToggle}
      className={[
        "flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors",
        on ? "justify-end bg-[#F5C542]" : "justify-start bg-[#8D6E63]/50",
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer",
      ].join(" ")}
    >
      <span className="h-5 w-5 rounded-full bg-white shadow" />
    </button>
  );
}

export default function PreferencesModal({ locale }: { locale: Locale }) {
  const {
    preferencesOpen,
    closePreferences,
    categories,
    savePreferences,
    acceptAll,
    rejectNonEssential,
  } = useConsent();

  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const [local, setLocal] = useState<ToggleableConsent>({
    functional: false,
    analytics: false,
    marketing: false,
  });

  // Initialize the toggles from current consent + remember the trigger + move
  // focus in, each time the modal opens.
  useEffect(() => {
    if (!preferencesOpen) return;
    setLocal({
      functional: categories.functional,
      analytics: categories.analytics,
      marketing: categories.marketing,
    });
    const id = requestAnimationFrame(() => {
      const first = dialogRef.current?.querySelector<HTMLElement>("[data-autofocus]");
      (first ?? dialogRef.current)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [preferencesOpen, categories]);

  // Focus is restored to the opener by the provider's closePreferences() — it
  // captured the explicit trigger via openPreferences(trigger). Delegating here
  // keeps every close path (Escape, X, scrim, Save, Reject, Accept) consistent
  // for both keyboard and mouse openings.
  const close = useCallback(() => {
    closePreferences();
  }, [closePreferences]);

  // Escape to close + focus trap on Tab.
  useEffect(() => {
    if (!preferencesOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = Array.from(
        root.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
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
    return () => document.removeEventListener("keydown", onKey);
  }, [preferencesOpen, close]);

  if (!preferencesOpen) return null;

  const dict = getDictionary(locale);
  const c = dict.consent;
  const isRTL = locale === "he";

  const rows: { key: ConsentCategory; locked?: boolean }[] = [
    { key: "essential", locked: true },
    { key: "functional" },
    { key: "analytics" },
    { key: "marketing" },
  ];

  const onSave = () => {
    savePreferences(local);
    close();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        dir={isRTL ? "rtl" : "ltr"}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-[#F5C542]/20 bg-[#FFF8E7] p-6 shadow-2xl outline-none sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-xl font-semibold text-[#3D2914]">
            {c.preferences.title}
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label={c.preferences.close}
            className="-m-1 shrink-0 rounded-full p-1 text-[#5D4037] transition-colors hover:text-[#3D2914]"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <p id={descId} className="mt-2 text-sm leading-relaxed text-[#5D4037]">
          {c.preferences.intro}
        </p>

        <div className="mt-5 divide-y divide-[#8D6E63]/15">
          {rows.map(({ key, locked }) => {
            const cat = c.categories[key];
            const labelId = `${titleId}-${key}`;
            const on = locked ? true : local[key as keyof ToggleableConsent];
            return (
              <div key={key} className="flex items-start justify-between gap-4 py-4">
                <div className="flex-1">
                  <p id={labelId} className="text-sm font-semibold text-[#3D2914]">
                    {cat.name}
                    {locked && (
                      <span className="ms-2 text-xs font-normal text-[#5D4037]/70">
                        ({c.preferences.alwaysOn})
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm leading-relaxed text-[#5D4037]/80">
                    {cat.description}
                  </p>
                </div>
                <Switch
                  on={on}
                  disabled={locked}
                  labelId={labelId}
                  onToggle={
                    locked
                      ? undefined
                      : () =>
                          setLocal((p) => ({
                            ...p,
                            [key]: !p[key as keyof ToggleableConsent],
                          }))
                  }
                />
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
          <button
            type="button"
            onClick={() => {
              rejectNonEssential();
              close();
            }}
            className="rounded-full px-5 py-2.5 text-sm font-medium text-[#5D4037] transition-colors hover:text-[#3D2914]"
          >
            {c.actions.rejectNonEssential}
          </button>
          <button
            type="button"
            data-autofocus
            onClick={onSave}
            className="rounded-full border border-[#3D2914]/30 px-5 py-2.5 text-sm font-medium text-[#3D2914] transition-colors hover:bg-[#3D2914]/5"
          >
            {c.actions.save}
          </button>
          <button
            type="button"
            onClick={() => {
              acceptAll();
              close();
            }}
            className="rounded-full bg-[#F5C542] px-6 py-2.5 text-sm font-semibold text-[#3D2914] transition-colors hover:bg-[#d4a83a]"
          >
            {c.actions.acceptAll}
          </button>
        </div>
      </div>
    </div>
  );
}
