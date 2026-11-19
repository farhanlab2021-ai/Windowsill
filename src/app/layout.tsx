import type { Metadata, Viewport } from "next";
import { Inter, Newsreader } from "next/font/google";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";
import { TimerRuntime } from "@/components/timer/TimerRuntime";
import { Toaster } from "@/components/ui/Toaster";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

// Fonts are downloaded at build time and served from our own site (works offline).
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Windowsill",
  applicationName: "Windowsill",
  description: "A calm study workspace: notes, a Pomodoro timer, and a view through the window.",
  // How it looks when added to an iPhone/iPad home screen.
  appleWebApp: { capable: true, title: "Windowsill", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // On phones, shrink the page (instead of covering it) when the keyboard opens.
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf8f4" },
    { media: "(prefers-color-scheme: dark)", color: "#15171a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className={`${inter.variable} ${newsreader.variable}`}
    >
      <head>
        {/* Applies the saved light/dark choice before the first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      {/* suppressHydrationWarning: some browser extensions add attributes to <body>. */}
      <body suppressHydrationWarning>
        {children}
        {/* Shared by every screen (notes and Focus Mode). */}
        <TimerRuntime />
        <Toaster />
        <ServiceWorkerRegistrar />
      </body>
    </html>
  );
}
