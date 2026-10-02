import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HubCentral ES+ | Gestão integrada",
  description: "Gestão integrada do HUB ES+",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
