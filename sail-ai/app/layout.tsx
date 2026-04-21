import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

// Modern metinler için Inter fontu
const inter = Inter({ 
  subsets: ["latin"], 
  variable: "--font-inter" 
});

// Lüks ve vurucu başlıklar için Playfair Display fontu
const playfair = Playfair_Display({ 
  subsets: ["latin"], 
  variable: "--font-playfair",
  style: ['normal', 'italic']
});

export const metadata: Metadata = {
  title: "SAIL AI+ | Sovereign Intelligence",
  description: "Strategy Grounded In Evidence. Absolute Execution.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="bg-[#09090b] antialiased selection:bg-[#d4af37]/30 selection:text-white">
        {children}
      </body>
    </html>
  );
}
