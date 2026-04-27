import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Selectwise - AI Interview Platform",
  description:
    "Selectwise is an AI-driven interview simulator featuring Hiro, your AI interviewer. Practice job-specific interviews, get instant feedback, and book one-on-one coaching.",
  metadataBase: new URL("https://selectwise.example.com"),
  openGraph: {
    title: "Selectwise - AI Interview Platform",
    description:
      "Practice job-specific interviews with Hiro, your AI interviewer. Voice-enabled, scored, and coached.",
    type: "website",
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
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-ink-900 antialiased">
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-JQ6D851BYK"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-JQ6D851BYK');
          `}
        </Script>
        {children}
      </body>
    </html>
  );
}
