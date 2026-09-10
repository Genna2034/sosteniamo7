import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "SosteniAMO il Quartiere", template: "%s · SosteniAMO" },
  description: "Piattaforma di monitoraggio, presenze, timesheet e rendicontazione del progetto SosteniAMO il Quartiere (POC Legalità, Città Metropolitana di Napoli).",
  applicationName: "SosteniAMO",
  robots: { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: "#1f3b5c", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="it"><body>{children}</body></html>;
}
