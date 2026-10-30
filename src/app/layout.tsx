import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const bricolage = Bricolage_Grotesque({ variable: "--font-bricolage", subsets: ["latin"], weight: ["600", "700"] });

export const metadata: Metadata = {
  title: "Miam",
  description: "Planificateur de batch cooking à deux",
  appleWebApp: { capable: true, title: "Miam", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1f6b4a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body className={`${inter.variable} ${bricolage.variable} font-sans antialiased`}>{children}</body>
    </html>
  );
}
