import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Public_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Display: page titles and section headings only.
const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});

// Body: all prose, labels, buttons.
const publicSans = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-public-sans",
  display: "swap",
});

// Data: every number in the app. Non-negotiable, and it carries the identity.
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SideShift — paid UGC campaigns, one thread per creator",
  description:
    "Brands post paid short-form video campaigns. Creators apply, deliver, and get paid. Brief, chat, approval and money live in one thread.",
};

export const viewport: Viewport = {
  themeColor: "#e9e7e1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${bricolage.variable} ${publicSans.variable} ${jetbrains.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
