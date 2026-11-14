import type { Metadata } from "next";
import { getAllPostMetas } from "@/lib/posts";
import BookCard from "@/components/BookCard";

export const metadata: Metadata = { title: "全部笔记" };

export default function ArticlesPage() {
  const posts = getAllPostMetas();

  return (
    <div className="container">
      <section style={{ padding: "28px 0 6px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-0.3px" }}>全部笔记</h1>
        <p style={{ margin: "10px 0 0", color: "var(--t2)", fontSize: 15 }}>
          个人学习资料整理，共 {posts.length} 篇，持续更新。
        </p>
      </section>

      <section className="series-group">
        <div className="series-head">
          <span className="series-no">KB</span>
          <h2>知识库</h2>
          <span className="count">{posts.length} 篇</span>
        </div>
        <div className="book-grid">
          {posts.map((p) => (
            <BookCard key={p.slug} post={p} />
          ))}
        </div>
      </section>
    </div>
  );
}
