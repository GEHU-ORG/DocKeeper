import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "GEHU DocKeeper — Organization Document Manager",
  description:
    "A sleek, macOS Finder-inspired document manager. Securely upload, organize, and access files across GEHU-ORG.",
  keywords: ["document manager", "gehu docs", "gehu org"],
  metadataBase: new URL("https://gehu-dockeeper.vercel.app"),
  openGraph: {
    title: "GEHU DocKeeper",
    description: "Collaborative document manager for GEHU-ORG.",
    type: "website",
    url: "https://gehu-dockeeper.vercel.app",
    images: ["/og-image.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Caveat:wght@500;700&display=swap"
          rel="stylesheet"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('datakeeper-theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body>
        <div className="app-shell">
          <Providers>
            <Header />
            <main className="main-content">
              {children}
            </main>
          </Providers>
          <Footer />
        </div>
      </body>
    </html>
  );
}
