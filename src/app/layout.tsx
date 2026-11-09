import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Instant Cash Offer | Desert Auto Buyers",
  description: "Get a cash offer for your car in Arizona in 60 seconds. Demo site; fictional business.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f8fc" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-page text-ink">
        {/* On every screen, login included: this is a demo, not a real business. */}
        <div role="note" className="bg-notice px-4 py-1.5 text-center text-sm font-semibold text-notice-ink">
          Demo site: please don&apos;t enter real personal details.
        </div>
        {children}
      </body>
    </html>
  );
}
