import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
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

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

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
        </div>
      </div>
      <article className="article-body">
        <div className="prose">
          <MDXRemote
            source={post.content}
            options={{ mdxOptions: { rehypePlugins: [rehypeHighlight] } }}
          />
        </div>
        <Link href="/articles" className="back-link">← 返回全部笔记</Link>
      </article>
    </div>
  );
}
