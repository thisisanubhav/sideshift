import type { Metadata, Viewport } from "next";
import { Archivo, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display: a wide grotesque that reads like a lower-third title card.
const archivo = Archivo({
  subsets: ["latin"],
  axes: ["wdth"], // the width axis is the point: 118% for the display face
  variable: "--font-archivo",
  display: "swap",
});

const instrument = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SideShift — paid UGC campaigns, one thread per creator",
  description:
    "Brands post paid short-form video campaigns. Creators apply, deliver, and get paid. Brief, chat, approval and money live in one thread.",
};

export const viewport: Viewport = {
  themeColor: "#17131c",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${archivo.variable} ${instrument.variable} ${jetbrains.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
