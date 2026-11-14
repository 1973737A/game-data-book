import Link from "next/link";
import type { PostMeta } from "@/lib/posts";
import { seriesTheme } from "@/lib/posts";

/** 系列专属封面图案：01 向量夹角 / 02 图谱节点 / 03 检索轨迹 */
function CoverArt({ series }: { series: string }) {
  const gold = "#a88438";
  const ink = "rgba(38,36,33,.55)";
  if (series.startsWith("01")) {
    // 余弦相似度：两个大向量箭头 + 夹角弧 + 投影虚线
    return (
      <svg viewBox="0 0 120 84" className="cover-art" aria-hidden>
        <defs>
          <marker id="arr1" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={gold} />
          </marker>
          <marker id="arr2" markerWidth="7" markerHeight="7" refX="5.5" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={ink} />
          </marker>
        </defs>
        <line x1="14" y1="68" x2="112" y2="68" stroke={ink} strokeWidth="1" opacity=".35" />
        <path d="M14 68 L100 18" stroke={gold} strokeWidth="3" markerEnd="url(#arr1)" fill="none" />
        <path d="M14 68 L106 62" stroke={ink} strokeWidth="2.4" markerEnd="url(#arr2)" fill="none" />
        <line x1="100" y1="18" x2="100" y2="68" stroke={gold} strokeWidth="1.2" strokeDasharray="4 3" opacity=".7" />
        <path d="M44 68 A 32 32 0 0 0 39 54" stroke={gold} strokeWidth="1.6" strokeDasharray="3 3" fill="none" />
        <text x="50" y="60" fontSize="10" fill={gold} fontWeight="650">θ</text>
        <circle cx="14" cy="68" r="4" fill={gold} />
      </svg>
    );
  }
  if (series.startsWith("02")) {
    // 知识图谱：多节点网络 + 两个社区圈
    return (
      <svg viewBox="0 0 120 84" className="cover-art" aria-hidden>
        <circle cx="34" cy="28" r="24" fill="none" stroke={gold} strokeWidth="1" strokeDasharray="5 4" opacity=".55" />
        <circle cx="94" cy="58" r="22" fill="none" stroke={ink} strokeWidth="1" strokeDasharray="5 4" opacity=".45" />
        <line x1="22" y1="18" x2="46" y2="36" stroke={gold} strokeWidth="1.6" />
        <line x1="46" y1="36" x2="34" y2="52" stroke={gold} strokeWidth="1.2" opacity=".6" />
        <line x1="22" y1="18" x2="34" y2="52" stroke={gold} strokeWidth="1" opacity=".4" />
        <line x1="46" y1="36" x2="84" y2="54" stroke={ink} strokeWidth="1.4" />
        <line x1="84" y1="54" x2="100" y2="40" stroke={ink} strokeWidth="1.1" />
        <line x1="84" y1="54" x2="96" y2="72" stroke={ink} strokeWidth="1.1" opacity=".6" />
        <circle cx="22" cy="18" r="4.5" fill={gold} />
        <circle cx="46" cy="36" r="5.5" fill={gold} />
        <circle cx="34" cy="52" r="3.6" fill={ink} />
        <circle cx="84" cy="54" r="6" fill={gold} />
        <circle cx="100" cy="40" r="3.6" fill={ink} />
        <circle cx="96" cy="72" r="3.2" fill={ink} />
      </svg>
    );
  }
  // 03 检索轨迹：折线 + 端点 + 放大镜
  return (
    <svg viewBox="0 0 120 84" className="cover-art" aria-hidden>
      <path d="M8 70 L34 70 L34 40 L64 40 L64 58 L88 58" stroke={gold} strokeWidth="2.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx="88" cy="58" r="13" fill="none" stroke={ink} strokeWidth="2.4" />
      <line x1="97.5" y1="67.5" x2="110" y2="80" stroke={ink} strokeWidth="3" strokeLinecap="round" />
      <circle cx="8" cy="70" r="3.6" fill={gold} />
      <circle cx="34" cy="40" r="3.6" fill={gold} />
      <circle cx="64" cy="40" r="3.6" fill={gold} />
      <path d="M82 58 a6 6 0 0 1 6 -6" stroke={gold} strokeWidth="1.6" fill="none" opacity=".8" />
    </svg>
  );
}

/** 书封卡片：书脊 + 烫金线框 + 系列图案 + 标题 */
export default function BookCard({
  post,
  showSeries = false,
}: {
  post: PostMeta;
  showSeries?: boolean;
}) {
  const theme = seriesTheme(post.series);
  return (
    <Link href={`/articles/${post.slug}`} className="book-card">
      <div className={`book-cover ${theme.cls}`}>
        <div className="cover-inner">
          {showSeries && <div className="cover-series">知识库</div>}
          <div className="cover-title">{post.title}</div>
          <div className="cover-spacer" />
          <CoverArt series={post.series} />
          <div className="cover-rule" />
          <div className="cover-foot">
            <span>知识库手册</span>
            <span className="no">№{String(post.order).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
      <div className="book-info">
        <div className="b-title">{post.title}</div>
        <div className="b-meta">
          <span>{post.date}</span>
          <span>{post.tags[0] ?? "笔记"}</span>
        </div>
      </div>
    </Link>
  );
}
