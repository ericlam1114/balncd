import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "../hooks/use-toast.js";
import { AuthProvider } from "../providers/auth-provider";
// Remove this: import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "Balncd - Financial Zen",
  description: "A calm, minimal personal finance dashboard",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ToastProvider>
          <AuthProvider>
            {children}
            {/* Remove the Sonner <Toaster /> component here */}
          </AuthProvider>
        </ToastProvider>
      </body>
    </html>
  );
}