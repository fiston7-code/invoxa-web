// src/app/layout.tsx
import type { Metadata } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import {Navbar} from "@/components/navbar";
import { Footer } from "@/components/footer";
import "./globals.css";

// Police pour les titres (Headings)
const fontHeading = Poppins({
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-heading",
  subsets: ["latin"],
  display: "swap",
});

// Police pour le corps de texte (Sans-serif)
const fontSans = Open_Sans({
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "FastVoxa — Créez des reçus professionnels en moins de 30 secondes",
  description:
    "FastVoxa permet aux commerçants et PME de créer, partager et retrouver facilement leurs reçus numériques depuis leur téléphone, avec envoi instantané sur WhatsApp.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${fontHeading.variable} ${fontSans.variable} h-full antialiased`}
    >
      <body className="font-sans min-h-full flex flex-col bg-background text-foreground">
        <Navbar />

        {children}
        <Footer />
        
      </body>
    </html>
  );
}