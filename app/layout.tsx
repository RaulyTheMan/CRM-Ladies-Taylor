import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/ui/Sidebar";
import { Alegreya } from "next/font/google";

const alegreya = Alegreya({ subsets: ["latin"], weight: ["400", "500", "700"] });

export const metadata: Metadata = {
  title: "Ladies, Taylor CRM",
  description: "Internal lead management",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`h-full ${alegreya.variable}`}>
      <body className="h-full flex overflow-hidden bg-page">
        <Sidebar />
        <div className="flex-1 flex flex-col overflow-hidden bg-canvas">
          {children}
        </div>
      </body>
    </html>
  );
}
