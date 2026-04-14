import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "La memoria de mama",
  description: "A family photo memory matching game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full bg-white text-gray-900">{children}</body>
    </html>
  );
}
