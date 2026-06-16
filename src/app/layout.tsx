import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "ElevateMe Referral — Referral Program Management",
    template: "%s · ElevateMe Referral",
  },
  description:
    "Manage your referral programs, track ambassadors, and grow your business with ElevateMe Referral.",
  icons: { icon: "/favicon.svg" },
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      "https://referral.elevateme.pro"
  ),
  openGraph: {
    title: "ElevateMe Referral Program",
    description:
      "Earn commissions by referring customers to ElevateMe products. Join our ambassador program today.",
    type: "website",
    siteName: "ElevateMe Referral",
  },
  twitter: {
    card: "summary_large_image",
    title: "ElevateMe Referral Program",
    description:
      "Earn commissions by referring customers to ElevateMe products.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakarta.variable} antialiased`}>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
