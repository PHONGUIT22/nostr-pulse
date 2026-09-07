import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://nostrpulse.com"),
  title: {
    default: "NostrPulse - Nostr Analytics & Lightning Intelligence",
    template: "%s | NostrPulse"
  },
  description: "Explore top zapped Nostr creators, verify NIP-05 profiles, check WebSocket relays, and analyze Bitcoin Lightning Value-4-Value payments.",
  icons: {
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
  },
  authors: [{ name: "Nguyễn Hạc Phong", url: "https://nostrpulse.com/about" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://nostrpulse.com",
    title: "NostrPulse - Nostr Analytics & Lightning Intelligence",
    description: "Discover top creators, active relays, and Bitcoin Lightning Zaps across the Nostr protocol.",
    siteName: "NostrPulse",
  },
  twitter: {
    card: "summary_large_image",
    title: "NostrPulse - Nostr Analytics & Lightning Intelligence",
    description: "Discover top creators, active relays, and Bitcoin Lightning Zaps across the Nostr protocol.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "Organization",
                  "@id": "https://nostrpulse.com/#organization",
                  "name": "NostrPulse",
                  "alternateName": "NostrPulse Analytics",
                  "url": "https://nostrpulse.com",
                  "logo": {
                    "@type": "ImageObject",
                    "url": "https://nostrpulse.com/logo.png"
                  },
                  "description": "NostrPulse provides real-time decentralized Nostr protocol analytics, NIP-05 creator verification, Lightning Zap tracking, and public WebSocket relay telemetry.",
                  "founder": {
                    "@id": "https://nostrpulse.com/#person"
                  },
                  "sameAs": [
                    "https://github.com/KoVN-s",
                    "https://gravatar.com/quicklyimpossible45dfc1b37d"
                  ]
                },
                {
                  "@type": "Person",
                  "@id": "https://nostrpulse.com/#person",
                  "name": "Nguyễn Hạc Phong",
                  "url": "https://nostrpulse.com/about",
                  "jobTitle": "Founder & Data Engineer",
                  "description": "Software & Data Engineer specializing in decentralized social graphs, Bitcoin Lightning Network, and programmatic web architecture.",
                  "alumniOf": {
                    "@type": "CollegeOrUniversity",
                    "name": "University of Information Technology (UIT)"
                  },
                  "worksFor": {
                    "@id": "https://nostrpulse.com/#organization"
                  },
                  "sameAs": [
                    "https://github.com/KoVN-s",
                    "https://www.linkedin.com/in/nguy%E1%BB%85n-phong-a673681b5/"
                  ],
                  "knowsAbout": [
                    "Nostr Protocol (NIP-01 to NIP-57)",
                    "Bitcoin Lightning Network & WebLN",
                    "Decentralized Social Graphs",
                    "WebSocket Telemetry",
                    "Next.js & TypeScript"
                  ]
                }
              ]
            })
          }}
        />
      </head>
      <body className={`${inter.className} bg-[#FDFDFD] text-slate-900 antialiased flex flex-col min-h-screen`}>
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}