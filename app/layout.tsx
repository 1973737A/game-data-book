import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "游戏数据分析手册", template: "%s · 游戏数据分析手册" },
  description: "SQL 与游戏数据分析实战笔记：留存、付费、指标体系与分析方法论。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <Link href="/" className="logo">
              <span className="logo-mark">册</span>
              <span className="logo-text">游戏数据分析手册</span>
            </Link>
            <nav className="site-nav">
              <Link href="/">首页</Link>
              <Link href="/articles">全部笔记</Link>
              <Link href="/about">关于</Link>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>用 Next.js 搭建 · 内容为 Markdown 笔记 · <Link href="/about">关于本站</Link></p>
        </footer>
      </body>
    </html>
  );
}
