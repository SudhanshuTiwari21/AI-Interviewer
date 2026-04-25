import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hiro - AI Interview Platform",
  description:
    "Hiro is an AI-driven interview simulator. Practice job-specific interviews, get instant feedback, and book one-on-one coaching.",
  metadataBase: new URL("https://hiro.example.com"),
  openGraph: {
    title: "Hiro - AI Interview Platform",
    description:
      "Practice job-specific interviews with AI. Voice-enabled, scored, and coached.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-white text-ink-900 antialiased">{children}</body>
    </html>
  );
}
