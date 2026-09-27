import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    template: '%s | GEHU DocKeeper',
    default: 'GEHU DocKeeper — Graphic Era Hill University Study Material, Notes & Syllabus',
  },
  description:
    "The official document manager for Graphic Era Hill University (GEHU). Access BTech notes, syllabus, previous year questions (PYQ), lab manuals, and open-source study material for GEHU Dehradun, Haldwani, and Bhimtal campuses.",
  keywords: [
    "Graphic Era Hill University", "GEHU", "GEHU Notes", "GEHU Syllabus", 
    "BTech Notes", "Computer Science", "CSE Study Material", "BTech Syllabus GEHU",
    "GEHU PYQ", "Previous Year Questions", "GEHU Dehradun", "GEHU Haldwani", 
    "GEHU Bhimtal", "GEHU Open Source", "DocKeeper", "DataKeeper", "GitHub Education"
  ],
  authors: [{ name: 'Aditya Pandey' }, { name: 'GEHU Open Source Community' }],
  metadataBase: new URL("https://gehu-dockeeper.vercel.app"),
  openGraph: {
    title: "GEHU DocKeeper - BTech Notes & Syllabus",
    description: "Collaborative open-source document manager for GEHU-ORG. Find all your BTech notes, syllabus, and lab materials here.",
    type: "website",
    url: "https://gehu-dockeeper.vercel.app",
    siteName: "GEHU DocKeeper",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "GEHU DocKeeper Cover",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GEHU DocKeeper - BTech Notes & Syllabus',
    description: 'Find all your GEHU BTech notes, syllabus, and lab materials in one place.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
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
