import type { Metadata, Viewport } from "next";
import { Geist, Schibsted_Grotesk } from "next/font/google";
import { ServiceWorker } from "@/components/pwa/service-worker";
import "./globals.css";

const geist = Geist({ variable: "--font-geist", subsets: ["latin"] });
const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: { default: "Finch", template: "%s · Finch" },
  description: "Nossa vida, organizada.",
  applicationName: "Finch",
  appleWebApp: { capable: true, title: "Finch", statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: { apple: "/icons/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e0d" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${geist.variable} ${schibsted.variable} h-full`}>
      <body className="min-h-full">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
