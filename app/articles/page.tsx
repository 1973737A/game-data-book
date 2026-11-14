import type { Metadata } from "next";
import Link from "next/link";
import { getSeriesGroups } from "@/lib/posts";
import BookCard from "@/components/BookCard";

export const metadata: Metadata = { title: "全部笔记" };

export default function ArticlesPage() {
  const groups = getSeriesGroups();
  const total = groups.reduce((n, g) => n + g.posts.length, 0);

  return (
    <div className="container">
      <section style={{ padding: "28px 0 6px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 680, letterSpacing: "-0.3px" }}>全部笔记</h1>
        <p style={{ margin: "10px 0 0", color: "var(--t2)", fontSize: 15 }}>
          检索原理 · 知识组织 · 实战轨迹，共 {total} 篇，持续更新。
        </p>
      </section>

      {groups.map((g) => (
        <section key={g.series} className="series-group">
          <div className="series-head">
            <span className="series-no">{g.series.slice(0, 2)}</span>
            <h2>{g.series.slice(3)}</h2>
            <span className="count">{g.posts.length} 篇</span>
          </div>
          <div className="book-grid">
            {g.posts.map((p) => (
              <BookCard key={p.slug} post={p} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
