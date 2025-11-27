import "./globals.css";
import { MuiProvider } from "./mui-provider";
import { Rubik, Bebas_Neue } from "next/font/google";

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
      className={`${rubik.variable} ${bebas.variable}`} // expose CSS vars
    >
      <body className="font-sans bg-bgdark text-bglight">
        {/* Tailwind now uses Rubik as font-sans */}
        <MuiProvider>{children}</MuiProvider>
      </body>
    </html>
  );
}
