import type { Metadata } from "next";

export const metadata: Metadata = { title: "关于" };

export default function AboutPage() {
  return (
    <div className="container">
      <div className="about-card prose">
        <h1>关于本站</h1>
        <p>
          这是一个个人知识库站点，收录我在游戏数据分析工作中的实战笔记：
          SQL 取数模板、指标口径定义、留存与付费分析方法论。
        </p>
        <p>
          每篇笔记都遵循同一个原则：<strong>给出完整可运行的 SQL，说清口径和踩过的坑</strong>，
          让读到的人可以直接拿去用，而不是停留在概念层面。
        </p>
        <h2>内容板块</h2>
        <ul>
          <li><strong>SQL 实战基础</strong> —— 常用表结构、留存 / LTV / 漏斗等核心查询的写法与口径</li>
          <li><strong>指标体系</strong> —— DAU、付费率、ARPU 等指标的准确定义与常见误用</li>
          <li><strong>分析方法论</strong> —— 同期群、RFM、漏斗分析等框架在游戏业务中的落地</li>
        </ul>
        <h2>技术说明</h2>
        <p>
          本站使用 Next.js 构建，托管在 Vercel；全部内容为 Markdown 文件，
          写一篇、提交一次即自动发布。
        </p>
      </div>
    </div>
  );
}
