import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { ClerkProvider } from "@clerk/nextjs";
import { dark } from "@clerk/themes";
import "./globals.css";

export const metadata: Metadata = {
  title: "Relist",
  description: "Track your resale inventory, prices, and profits.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        baseTheme: dark,
        variables: {
          colorPrimary: "#5eead4",
          colorBackground: "#0d0f14",
          colorText: "#f4f5f8",
          colorTextSecondary: "#a1a8b8",
          colorInputBackground: "#101319",
          colorInputText: "#f4f5f8",
          colorNeutral: "#f4f5f8",
          borderRadius: "9px",
          fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        },
        elements: {
          card: "shadow-2xl border border-white/10 bg-[#0d0f14]/95 backdrop-blur-xl",
          headerTitle: "tracking-tight",
          formButtonPrimary:
            "bg-gradient-to-br from-[#5eead4] to-[#818cf8] text-[#0a0a0a] font-semibold shadow-[0_6px_20px_rgba(94,234,212,0.25)] hover:brightness-110 normal-case",
          socialButtonsBlockButton:
            "border border-white/10 bg-white/[0.07] hover:bg-white/[0.10] text-[#f4f5f8]",
          footerActionLink: "text-[#5eead4] hover:text-[#7ff3df]",
          formFieldInput:
            "bg-[#101319] border border-white/10 text-[#f4f5f8] focus:border-[#5eead4]",
          identityPreviewEditButton: "text-[#5eead4]",
          dividerLine: "bg-white/10",
          dividerText: "text-[#6b7384]",
        },
      }}
    >
      <html
        lang="en"
        className={`${GeistSans.variable} ${GeistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">{children}</body>
      </html>
    </ClerkProvider>
  );
}
