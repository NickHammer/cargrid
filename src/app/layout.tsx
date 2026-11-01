import type { Metadata } from "next";
import { Geist, Geist_Mono, Archivo_Black } from "next/font/google";
import "./globals.css";
import Analytics from "@/components/Analytics";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// One heavy display face for the wordmark and page titles. Everything else
// stays on Geist — a second face anywhere near the car photographs competes
// with them.
const display = Archivo_Black({
  variable: "--font-display",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarGrid.fun",
  description: "A daily car guessing grid game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
    >
      <head>
        <Analytics />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
