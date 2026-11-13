import type { Metadata } from "next";
import { Outfit, DM_Serif_Display, DM_Mono, Inter } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-outfit",
});

const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-dm-serif",
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-dm-mono",
});

// V2 — fonte da moldura (barra lateral e cabeçalho), conforme o mockup V2.
const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Growth Tools · Ambiental App",
  description:
    "FP&A e BI para incorporadoras imobiliárias — Tools for Growth (TFG).",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${outfit.variable} ${dmSerif.variable} ${dmMono.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
