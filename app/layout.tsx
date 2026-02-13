import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Il nome della rosa",
  description: "探索符号学中无限衍义的交互式词语网络",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
