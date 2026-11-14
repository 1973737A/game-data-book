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

/** frontmatter 里的裸日期会被 gray-matter 解析成 Date 对象，统一格式化成 yyyy-MM-dd */
function fmtDate(d: unknown): string {
  if (d instanceof Date) return d.toISOString().slice(0, 10);
  return d ? String(d) : "";
}

function parseFile(fileName: string): Post | null {
  const slug = fileName.replace(/\.md$/, "");
  const raw = fs.readFileSync(path.join(CONTENT_DIR, fileName), "utf-8");
  const { data, content } = matter(raw);
  return {
    slug,
    title: data.title ?? slug,
    series: data.series ?? "未分组",
    order: data.order ?? 99,
    date: fmtDate(data.date),
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

/** 系列对应的封面装饰主题（暖/冷/清新三色带） */
export const SERIES_THEMES: Record<string, { cls: string }> = {
  "01 检索原理": { cls: "theme-warm" },
  "02 知识组织": { cls: "theme-cool" },
  "03 实战轨迹": { cls: "theme-fresh" },
};

export function seriesTheme(series: string) {
  return SERIES_THEMES[series] ?? { cls: "" };
}
