"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AppLocale } from "@/lib/i18n";

type LocaleSwitcherProps = {
  locale: AppLocale;
  labels: {
    language: string;
    es: string;
    en: string;
    pt: string;
  };
};

export function LocaleSwitcher({ locale, labels }: LocaleSwitcherProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleChange(nextLocale: AppLocale) {
    startTransition(() => {
      void (async () => {
        await fetch("/api/locale", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locale: nextLocale }),
        });
        router.refresh();
      })();
    });
  }

  return (
    <label className="nav-item flex items-center gap-2 px-2 py-1">
      <span className="hidden text-[10px] font-bold uppercase tracking-[0.14em] text-[#6a5a34] lg:inline">
        {labels.language}
      </span>
      <select
        value={locale}
        onChange={(event) => handleChange(event.target.value as AppLocale)}
        disabled={isPending}
        aria-label={labels.language}
        className="w-[78px] bg-transparent text-xs font-extrabold uppercase tracking-[0.08em] text-[#3a2f14] outline-none disabled:opacity-60"
      >
        <option value="es">ES</option>
        <option value="en">EN</option>
        <option value="pt">PT</option>
      </select>
    </label>
  );
}
