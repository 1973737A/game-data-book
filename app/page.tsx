import Link from "next/link";
import { getAllPostMetas, getSeriesGroups, seriesTheme } from "@/lib/posts";

export default function Home() {
  const posts = getAllPostMetas();
  const featured = posts.filter((p) => p.featured).slice(0, 3);
  const showcase = featured.length > 0 ? featured : posts.slice(0, 3);
  const groups = getSeriesGroups();

  return (
    <div className="container">
      {/* Hero */}
      <section className="hero">
        <div className="hero-badge">📔 SQL × 游戏数据分析 · 实战笔记</div>
        <h1>
          把日常取数和项目经验
          <br />
          整理成<em>能直接照着用</em>的笔记
        </h1>
        <p>
          留存、付费、指标体系、同期群与漏斗——每一篇都附完整 SQL，
          从建表口径到查询写法，拿来就能跑。
        </p>
        <div className="hero-actions">
          <Link href="/articles" className="btn btn-primary">浏览全部笔记 →</Link>
          <Link href="/about" className="btn btn-ghost">关于本站</Link>
        </div>
      </section>

      {/* 推荐笔记 */}
      <section>
        <div className="section-head">
          <h2>精选笔记</h2>
          <Link href="/articles" className="more">查看全部 →</Link>
        </div>
        <div className="card-grid">
          {showcase.map((post) => {
            const theme = seriesTheme(post.series);
            return (
              <Link key={post.slug} href={`/articles/${post.slug}`} className="post-card">
                <div className="card-cover" style={{ background: theme.gradient }}>
                  <span className="cover-icon">{theme.icon}</span>
                </div>
                <div className="card-body">
                  <div className="card-tags">
                    {post.tags.slice(0, 3).map((t) => (
                      <span key={t} className="tag">{t}</span>
                    ))}
                  </div>
                  <div className="card-title">{post.title}</div>
                  <div className="card-desc">{post.description}</div>
                  <div className="card-meta">
                    <span>{post.series}</span>
                    <span>{post.date}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 系列导航 */}
      <section>
        <div className="section-head">
          <h2>系列专栏</h2>
        </div>
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
      </section>
    </div>
  );
}
