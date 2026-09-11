import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/layout/AppShell";
import AmbientParticles from "@/components/ui/AmbientParticles";

import HolographicTracer from "@/components/ui/HolographicTracer";

export const metadata: Metadata = {
  title: "Yomi Dashboard",
  description: "Personal AI Operating System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light" translate="no">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;800&family=Uncial+Antiqua&family=Almendra:wght@400;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
      </head>
      <body className="font-body-base text-body-base selection:bg-primary-container selection:text-on-primary-container overflow-hidden" suppressHydrationWarning>
        <AmbientParticles />
        <HolographicTracer />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
