import type { Metadata } from "next";
import { M_PLUS_Rounded_1c, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Toaster } from "@/components/ui/sonner";

const rounded = M_PLUS_Rounded_1c({
  variable: "--font-rounded",
  weight: ["400", "500", "700", "800"],
  // subsets は指定しない: latin に絞ると unicode-range がラテン文字限定になり
  // 日本語に丸ゴシックが適用されないため。preload:false なのでビルドエラーにならない。
  display: "swap",
  preload: false, // 巨大プリロードを避ける
  fallback: ["Hiragino Maru Gothic ProN", "Hiragino Sans", "system-ui", "sans-serif"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ふたりの財布 - PairBudget",
  description: "夫婦のための家計管理アプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${rounded.variable} ${geistMono.variable} font-sans antialiased`}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
