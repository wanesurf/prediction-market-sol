import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "@radix-ui/themes/styles.css";
import { Theme } from "@radix-ui/themes";
import AppWalletProvider from "@/components/AppWalletProvider";
import { Toaster, toast } from "sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SolCast ",
  description: "Predict the future on Solana",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Theme
          grayColor="mauve"
          accentColor="indigo"
          radius="large"
          scaling="100%"
          appearance="dark"
          panelBackground="translucent"
        >
          <AppWalletProvider>{children}</AppWalletProvider>
          <Toaster />
        </Theme>
      </body>
    </html>
  );
}
