import type { Metadata } from "next";
import { Manrope, Barlow_Condensed, JetBrains_Mono } from "next/font/google";

import { getUiDictionary } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/i18n/server";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prode Mundial 2026",
  description: "Prode del Mundial con ligas privadas y ranking por país.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getRequestLocale();
  const copy = getUiDictionary(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${manrope.variable} ${barlowCondensed.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
          <footer className="mt-6 border-t-2 border-[#1d2430] bg-[#fff7d8]">
            <div className="app-container flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-xs text-[#4c5564] sm:text-sm">
              <span>{copy.footer.copyright}</span>
              <span>
                {copy.footer.madeBy}{" "}
                <a
                  href="https://francisco-pedrosa.netlify.app/"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-[#6a4a00] underline decoration-2 underline-offset-2"
                >
                  Francisco Pedrosa
                </a>
              </span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}

