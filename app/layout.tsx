import "./globals.css";
import { MuiProvider } from "./mui-provider";
import { Rubik, Bebas_Neue } from "next/font/google";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "WorkSphere",
  icons: {
    icon: "/ws-logo.png",      // from /public
    shortcut: "/ws-logo.png",
    apple: "/ws-logo.png",
  },
};

// Rubik = primary font (body, UI)
const rubik = Rubik({
  subsets: ["latin"],
  variable: "--font-rubik",
});

// Bebas Neue = secondary font (headings, display)
const bebas = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${rubik.variable} ${bebas.variable}`}
      style={{ scrollBehavior: "smooth" }}
      suppressHydrationWarning
    >
      <body className="font-sans bg-bgdark text-bglight">
        <MuiProvider>{children}</MuiProvider>
      </body>
    </html>
  );
}
