import { AppLocale, DEFAULT_LOCALE } from "@/lib/i18n";

export async function getRequestLocale(): Promise<AppLocale> {
  return DEFAULT_LOCALE;
}
