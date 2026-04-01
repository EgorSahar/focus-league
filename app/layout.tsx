import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css" // <-- ЭТА СТРОЧКА ВКЛЮЧАЕТ ВЕСЬ ДИЗАЙН!

const inter = Inter({ subsets: ["cyrillic", "latin"] })

export const metadata: Metadata = {
  title: "FocusLeague",
  description: "Твоя дисциплина — твоя игра",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className={`${inter.className} bg-[#050505] text-white antialiased min-h-screen`}>
        {children}
      </body>
    </html>
  )
}