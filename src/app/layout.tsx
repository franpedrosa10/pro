import type { Metadata } from "next";
import { Space_Grotesk, Poppins, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-body",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-display",
  weight: ["600", "700"],
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Fantasy + Prode Mundial 2026",
  description: "MVP para competir con ligas privadas en Fantasy y Prode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${spaceGrotesk.variable} ${poppins.variable} ${jetbrainsMono.variable} min-h-screen antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
