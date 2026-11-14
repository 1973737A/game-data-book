import type { Metadata } from "next";
import Link from "next/link";
import { getSeriesGroups, seriesTheme } from "@/lib/posts";

export const metadata: Metadata = { title: "全部笔记" };

export default function ArticlesPage() {
  const groups = getSeriesGroups();
  const total = groups.reduce((n, g) => n + g.posts.length, 0);

  return (
    <div className="container">
      <section className="hero" style={{ padding: "32px 0 8px", textAlign: "left" }}>
        <h1 style={{ fontSize: 32 }}>全部笔记</h1>
        <p style={{ margin: "10px 0 0" }}>
          SQL 实战 · 指标体系 · 分析方法论，共 {total} 篇，持续更新。
        </p>
      </section>

      {groups.map((g) => {
        const theme = seriesTheme(g.series);
        return (
          <div key={g.series} className="series-group">
            <div className="series-head">
              <span className="series-no">{g.series.slice(0, 2)}</span>
              <h2>{g.series.slice(3)}</h2>
              <span className="count">{g.posts.length} 篇</span>
            </div>
            <div className="series-list">
              {g.posts.map((p) => (
                <Link key={p.slug} href={`/articles/${p.slug}`} className="series-item">
                  <span className="item-no" style={{ background: theme.gradient }}>
                    {String(p.order).padStart(2, "0")}
                  </span>
                  <span className="item-main">
                    <span className="item-title">{p.title}</span>
                    <span className="item-desc">{p.description}</span>
                  </span>
                  <span className="item-date">{p.date}</span>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
