import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
    title: "NusaTara",
    description: "NusaTara",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="id" className={cn("scroll-smooth", inter.variable)}>
            <body className="min-h-screen font-sans antialiased">
                {children}
                <Toaster position="top-center" />
            </body>
        </html>
    );
}
