import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import Navbar from "@/components/Navbar";

const poppins = Poppins({
  variable: "--font-poppins",
  weight: ["300", "400", "500", "600"],
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Karltoffel Portal",
  description: "Drift og administration for vinduespudsere.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="da" className={poppins.variable}>
      <body>
        <Navbar />
        <div className="app-main">{children}</div>
      </body>
    </html>
  );
}
