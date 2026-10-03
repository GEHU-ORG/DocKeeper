import type { Metadata } from "next";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Providers } from "@/components/Providers";
import "./globals.css";
import "katex/dist/katex.min.css";

export const metadata: Metadata = {
  title: {
    template: '%s | UniExamPrep',
    default: 'UniExamPrep — University Exam Preparation Portal',
  },
  description:
    "The open-source exam preparation platform for university students. Access notes, syllabus, previous year questions (PYQ), lab manuals, and AI-powered study tools for any university.",
  keywords: [
    "University Exam Prep", "UniExamPrep", "College Notes", "Syllabus",
    "BTech Notes", "BCA Notes", "MBA Notes", "MCA Notes",
    "PYQ", "Previous Year Questions", "Study Material", "Open Source Education"
  ],
  authors: [{ name: 'Aditya Pandey' }, { name: 'UniExamPrep Community' }],
  metadataBase: new URL("https://uniexamprep.vercel.app"),
  openGraph: {
    title: "UniExamPrep — University Exam Preparation",
    description: "Open-source exam prep platform. Notes, syllabus, PYQ, and AI study tools for any university.",
    type: "website",
    url: "https://uniexamprep.vercel.app",
    siteName: "UniExamPrep",
    images: [{
      url: "/og-image.png",
      width: 1200,
      height: 630,
      alt: "UniExamPrep Cover",
    }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'UniExamPrep — University Exam Preparation',
    description: 'Notes, syllabus, PYQ, and AI study tools for any university.',
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "UniExamPrep",
              "url": "https://uniexamprep.vercel.app",
              "description": "Open-source university exam preparation platform. Notes, syllabus, PYQ, and AI study tools.",
              "publisher": {
                "@type": "Organization",
                "name": "UniExamPrep",
                "url": "https://uniexamprep.vercel.app"
              }
            }),
          }}
        />
        {/* Google AdSense */}
        <script 
          async 
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9998034438026486"
          crossOrigin="anonymous"
        ></script>
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
