import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import BottomNav from "@/components/BottomNav";
import { FlashlightOverlay } from "@/components/FlashlightOverlay";
import { FlashlightProvider } from "@/components/FlashlightContext";
import { MagnifierOverlay } from "@/components/MagnifierOverlay";
import { MagnifierProvider } from "@/components/MagnifierContext";
import { NavigationProgress } from "@/components/NavigationProgress";

export const metadata: Metadata = {
  title: "back[shot]",
  description: "Your personal daily diary with AI-powered photo insights",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-full flex flex-col pb-24">
        <ThemeProvider>
          <FlashlightProvider>
            <MagnifierProvider>
              <NavigationProgress />
              {children}
              <BottomNav />
              <FlashlightOverlay />
              <MagnifierOverlay />
            </MagnifierProvider>
          </FlashlightProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
