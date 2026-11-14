import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import rehypeSlug from "rehype-slug";
import remarkMath from "remark-math";
import remarkGfm from "remark-gfm";
import rehypeKatex from "rehype-katex";
import "highlight.js/styles/github-dark.css";
import "katex/dist/katex.min.css";
import CopyButton from "@/components/CopyButton";
import GithubSlugger from "github-slugger";
import { getAllPosts, getPostBySlug } from "@/lib/posts";

interface Props { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  return { title: post?.title ?? "未找到" };
}

/** 从 Markdown 源文本提取 h2/h3 生成目录，id 用 github-slugger 与 rehype-slug 完全一致 */
function extractToc(content: string) {
  const slugger = new GithubSlugger();
  const toc: { level: 2 | 3; text: string; id: string }[] = [];
  for (const line of content.split("\n")) {
    const m = /^(#{2,3})\s+(.+)$/.exec(line.trim());
    if (!m) continue;
    const text = m[2].trim();
    toc.push({ level: m[1].length as 2 | 3, text, id: slugger.slug(text) });
  }
  return toc;
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const toc = extractToc(post.content);

  return (
    <div>
      <div className="article-hero">
        <div className="article-tags">
          <span className="tag">{post.series}</span>
          {post.tags.map((t) => (
            <span key={t} className="tag plain">{t}</span>
          ))}
        </div>
        <h1>{post.title}</h1>
        <div className="article-sub">
          <span>📅 {post.date}</span>
          <span>✍️ 数据分析笔记</span>
          <span>📊 约 {Math.max(1, Math.round(post.content.length / 400))} 分钟读完</span>
        </div>
      </div>

      <div className="article-layout">
        <article className="article-body">
          <div className="article-sheet">
            <div className="prose">
              <MDXRemote
                source={post.content}
                options={{
                  mdxOptions: {
                    remarkPlugins: [remarkGfm, remarkMath],
                    rehypePlugins: [rehypeSlug, rehypeKatex, rehypeHighlight],
                  },
                }}
                components={{
                  pre: (props) => (
                    <div className="code-block">
                      <CopyButton />
                      <pre {...props} />
                    </div>
                  ),
                }}
              />
            </div>
          </div>
          <Link href="/articles" className="back-link">← 返回全部笔记</Link>
        </article>

        {toc.length > 0 && (
          <nav className="toc">
            <div className="toc-title">目 录</div>
            {toc.map((item) => (
              <a key={item.id + item.text} href={`#${item.id}`} className={item.level === 3 ? "lvl-3" : ""}>
                {item.text}
              </a>
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}
