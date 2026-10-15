import type { Metadata } from "next";
import "./globals.css";
import { WalletProvider } from "@/lib/wallet";

export const metadata: Metadata = {
  title: "TasteChain BKK — The AI & Trustless Gastronomy Protocol",
  description: "Web3 Gastronomy Protocol on Avalanche — 41,000+ Bangkok Venues, Proof-of-Visit Verification & Real-Yield Curate-to-Earn",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" data-theme="dark">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
        <script
          src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo="
          crossOrigin=""
        ></script>
      </head>
      <body className="antialiased bg-base-100 text-base-content min-h-screen">
        <WalletProvider>{children}</WalletProvider>
      </body>
    </html>
  );
}
