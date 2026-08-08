import type { Metadata } from "next";
import localFont from "next/font/local";
import { cn } from "@/lib/utils";
import { QueryProvider } from "@/providers/query-provider";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "Quizz",
    template: "%s · Quizz",
  },
  description: "A modern platform for creating and taking quizzes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        "style-nova font-sans antialiased",
        geistSans.variable,
        geistMono.variable,
      )}
    >
      <body className="min-h-dvh">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
