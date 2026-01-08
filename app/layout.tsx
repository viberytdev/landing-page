import type { Metadata } from "next";
import "./globals.css";
import { SessionRestoreProvider } from "./SessionRestoreProvider";
import { AuthProvider } from "./AuthContext";

export const metadata: Metadata = {
  title: "Viberyt - AI Voice-to-Text",
  description: "AI-powered voice-to-text transcription that understands context, accents, and technical terms.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <AuthProvider>
          <SessionRestoreProvider>{children}</SessionRestoreProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
