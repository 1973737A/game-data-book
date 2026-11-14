import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "学习笔记", template: "%s · 学习笔记" },
  description: "个人学习资料整理：知识库与 RAG 技术笔记。",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <header className="site-header">
          <div className="header-inner">
            <a href="/articles" className="logo">
              <span className="logo-mark">记</span>
              <span className="logo-text">学习笔记</span>
            </a>
            <nav className="site-nav">
              <a href="/articles">全部笔记</a>
            </nav>
          </div>
        </header>
        <main className="site-main">{children}</main>
        <footer className="site-footer">
          <p>个人学习资料整理 · 用 Next.js 搭建</p>
        </footer>
      </body>
    </html>
  );
}
