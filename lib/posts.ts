import fs from "fs";
import path from "path";
import matter from "gray-matter";

export interface PostMeta {
  slug: string;
  title: string;
  series: string;
  order: number;
  date: string;
  description: string;
  tags: string[];
  featured?: boolean;
}

export interface Post extends PostMeta {
  content: string;
}

const CONTENT_DIR = path.join(process.cwd(), "content", "articles");

function parseFile(fileName: string): Post | null {
  const slug = fileName.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, fileName), "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    series: data.series ?? "未分组",
    order: data.order ?? 99,
    date: (data.date ?? "").toString(),
    description: data.description ?? "",
    tags: data.tags ?? [],
    featured: data.featured ?? false,
    content,
  };
}

/** 全部文章（按系列 + 序号排序） */
export function getAllPosts(): Post[] {
  if (!fs.existsSync(CONTENT_DIR)) return [];
  return fs
    .readdirSync(CONTENT_DIR)
    .filter((f) => f.endsWith(".md"))
    .map(parseFile)
    .filter((p): p is Post => p !== null)
    .sort((a, b) =>
      a.series === b.series ? a.order - b.order : a.series.localeCompare(b.series, "zh")
    );
}

/** 仅元信息 */
export function getAllPostMetas(): PostMeta[] {
  return getAllPosts().map(({ content, ...meta }) => meta);
}

/** 按系列分组，保持系列顺序 */
export function getSeriesGroups(): { series: string; posts: PostMeta[] }[] {
  const groups = new Map<string, PostMeta[]>();
  for (const post of getAllPostMetas()) {
    if (!groups.has(post.series)) groups.set(post.series, []);
    groups.get(post.series)!.push(post);
  }
  return Array.from(groups.entries()).map(([series, posts]) => ({ series, posts }));
}

export function getPostBySlug(slug: string): Post | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}

/** 系列对应的封面渐变色（无真实图片时的装饰色块） */
export const SERIES_THEMES: Record<string, { gradient: string; icon: string }> = {
  "01 SQL 实战基础": { gradient: "linear-gradient(135deg,#f6d365,#fda085)", icon: "SQL" },
  "02 指标体系": { gradient: "linear-gradient(135deg,#a1c4fd,#c2e9fb)", icon: "KPI" },
  "03 分析方法论": { gradient: "linear-gradient(135deg,#d4fc79,#96e6a1)", icon: "ANA" },
};

export function seriesTheme(series: string) {
  return SERIES_THEMES[series] ?? { gradient: "linear-gradient(135deg,#e0c3fc,#8ec5fc)", icon: "NOTE" };
}
