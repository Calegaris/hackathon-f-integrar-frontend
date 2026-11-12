import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A.R.T. — Agencia de Respuestas Tácticas",
  description:
    "Análisis táctico de historiales de WhatsApp con métricas de alta precisión y respuestas sugeridas.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}

