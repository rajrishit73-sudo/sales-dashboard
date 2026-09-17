import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Lumen Studio — AI images for people who ship",
    template: "%s · Lumen Studio",
  },
  description:
    "Generate, refine, and upscale on-brand images in seconds. Style presets, image-to-image, and a searchable gallery — with credits that don't expire mid-project.",
  openGraph: {
    title: "Lumen Studio — AI images for people who ship",
    description:
      "Generate, refine, and upscale on-brand images in seconds. Style presets, image-to-image, and a searchable gallery.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#07080d",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
