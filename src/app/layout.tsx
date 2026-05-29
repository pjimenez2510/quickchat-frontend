import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: "QuickChat",
  description: "Real-time messaging application",
};

// El nonce de la CSP (ver src/proxy.ts) se inyecta durante el render del
// servidor leyendo la cabecera de la request. Las páginas estáticas se generan
// en build (sin request), así que no podrían recibir el nonce. Forzamos render
// dinámico para que Next aplique el nonce a sus scripts en cada request.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={4000}
        />
      </body>
    </html>
  );
}
