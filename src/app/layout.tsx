import type { Metadata, Viewport } from "next";
import { Figtree, Montserrat, Noto_Sans } from "next/font/google";
import { SITE_URL, MAIN_SITE_URL } from "@/lib/constants";
import { ServiceWorker } from "@/components/service-worker";
import "./globals.css";

const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"] });
const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin"], weight: ["600"] });
const noto = Noto_Sans({ variable: "--font-noto", subsets: ["latin", "latin-ext"], display: "swap" });

const description = "Record, label and transcribe patient speech. Works offline, syncs across your devices, encrypted.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "tinig labs notebook", template: "%s · tinig labs notebook" },
  description,
  applicationName: "tinig labs notebook",
  authors: [{ name: "tinig labs", url: MAIN_SITE_URL }],
  // App icons from the approved logo files (public/brand): the 32 px PNG for favicons, as the guide says.
  icons: {
    icon: [
      { url: "/brand/notebook-app-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/brand/notebook-app-icon.svg", type: "image/svg+xml" },
    ],
    apple: { url: "/icons/apple-touch-icon.png", sizes: "180x180" },
  },
  appleWebApp: { capable: true, title: "notebook", statusBarStyle: "default" },
  formatDetection: { telephone: false },
  openGraph: { type: "website", siteName: "tinig labs", locale: "en_PH", description },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#f9fbfa" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${figtree.variable} ${montserrat.variable} ${noto.variable} h-full antialiased`}>
      <body className="flex min-h-dvh flex-col font-sans">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
