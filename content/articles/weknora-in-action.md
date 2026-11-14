---
title: WeKnora 实战：检索轨迹还原与 Agentic RAG 复盘
series: 03 实战轨迹
order: 1
date: 2026-11-12
description: 两块实战干货合一：用 SQL 和接口重放还原每次检索的完整轨迹（含八个坑）；Agentic RAG 一次 117 秒真实任务的逐步拆解。
tags: [WeKnora, SQL, Agentic RAG]
featured: true
---

原理讲完了，这篇全部是**可复现的操作**：怎么还原每一次检索的完整轨迹，以及一次真实 Agentic RAG 任务的全程复盘。

## 第 1 节 三段轨迹各在哪里

> 结论速览：**③重排结果免费存在 postgres 里（历史可查）；②融合排名前 15 在 debug 日志里；①两路原始分不落盘，只能现场调接口重放拿全量。**

| 段 | 内容 | 数据位置 |
|---|---|---|
| ① 两路原始分 | 向量=余弦分；关键词=BM25 归一分 | **不落盘**，接口重放才有 |
| ② RRF 融合 | 融合分+两路名次 | `docker logs` debug 行（top15）；重放 `rerank.enabled=false` |
| ③ 重排结果 | 合成分 = 0.6×精排+0.3×融合+0.1 | postgres `messages.agent_steps`（top10，永久保留） |

前提检查（一次性）：重排模型挂在 **agent 配置**上，不是租户全局：

```sql
SELECT id, name, status FROM models WHERE type = 'Rerank';   -- 注意 type 是大写
SELECT name, config->>'rerank_model_id' FROM custom_agents;
```

> 坑：**MCP 端点的 search_knowledge 代码写死不重排**——MCP 看到的永远是纯融合分；网页端 agent 才走重排。

## 第 2 节 postgres：定位会话、读落盘结果

列出某问题的所有检索调用（时间/渠道/query/模式/条数）：

```sql
SELECT to_char(m.created_at, 'MM-DD HH24:MI:SS'), m.channel, m.session_id,
       tc->'result'->'data'->>'query',
       jsonb_array_length(tc->'result'->'data'->>'results')
FROM messages m
CROSS JOIN LATERAL jsonb_array_elements(m.agent_steps) AS step
CROSS JOIN LATERAL jsonb_array_elements(step->'tool_calls') AS tc
WHERE tc->>'name' = 'search_knowledge'
  AND tc->'result'->'data'->>'query' LIKE '%关键词%'
ORDER BY m.created_at DESC;
```

读已落盘的最终 topN + 合成分：

```sql
SELECT t.cn AS 调用序号, r.rn AS 排名,
       round((r.elem->>'score')::numeric, 4) AS 合成分,
       left(r.elem->>'knowledge_title', 24) AS 标题
FROM messages m
CROSS JOIN LATERAL jsonb_array_elements(m.agent_steps) AS step
CROSS JOIN LATERAL jsonb_array_elements(step->'tool_calls') WITH ORDINALITY AS t(call, cn)
CROSS JOIN LATERAL jsonb_array_elements(t.call->'result'->'data'->'results') WITH ORDINALITY AS r(elem, rn)
WHERE m.session_id = '<session_id>' AND t.call->>'name' = 'search_knowledge'
ORDER BY t.cn, r.rn;
```

存储结构（`agent_steps` JSONB）：`steps[] → tool_calls[] → result.data.{query, mode, results[]}`；`match_type` 0=向量副本（**不代表关键词路没召回**）、1=关键词。

## 第 3 节 日志验证 + 接口重放

```powershell
docker logs WeKnora-app 2>&1 | Select-String "RRF rank"                  # 融合分+名次
docker logs WeKnora-app 2>&1 | Select-String "\[Rerank\]"                # 精排过程
docker logs WeKnora-app 2>&1 | Select-String "Result count before fusion" # 两路各召回多少
```

判读：`vector=X, keyword=Y` 任一为 0 → 没走 RRF；`threshold=-Inf` → keyword 模式只排序不淘汰。

检索是确定性的，用**同一 query + 4 种参数组合**重放补齐全量：

```powershell
$variants = @{
  vector  = @{ vector_threshold=0.6;  disable_keywords_match=$true }
  keyword = @{ keyword_threshold=0.5; disable_vector_match=$true }
  fused   = @{ vector_threshold=0.6; keyword_threshold=0.5; rerank=@{ enabled=$false } }
  rerank  = @{ vector_threshold=0.6; keyword_threshold=0.5; rerank=@{ enabled=$true; top_k=30; threshold=0.3 } }
}
# POST /api/v1/knowledge-bases/$kb/hybrid-search，Bearer token 从 auth_tokens 取
# token_type='access_token' 最新有效行（refresh_token 不能用）
```

**锚点校验（必做）**：fused rank1 ≈ 日志 `RRF rank 0`；rerank `metadata.model_score` ≈ 日志 `[Rerank] top=`；rerank `score` ≈ 库中存储 score。对不上 = KB 重新索引过，以重放为新轨迹分开记。

## 第 4 节 八个坑清单

1. 模型表 `type='Rerank'` 是**大写**，小写会误判"没配重排"
2. **MCP 端点永不重排**
3. agent 把原问题**改写成 N 个 query 并行检索**，轨迹按"每次调用"还原，没有全局融合
4. 存储行 `match_type` 全是 0 是融合后元数据规则，别误读
5. `agent_steps` 只存最终 top10，全量候选（40~50 条）只有重放有
6. keyword 模式重排阈值 `-Inf`，别跟 hybrid 的 0.3 混着解读
7. 重放时**别改其他参数**，否则不可比
8. 取 `access_token`，refresh_token 不能用

## 第 5 节 Agentic RAG：117 秒实录复盘

传统 RAG 是固定管道，搜不到就搜不到；**Agentic RAG 把检索变成智能体的工具**——搜不到？换关键词再搜（ReAct 循环：Thought → Action → Observation）。

![从固定管道到 ReAct 探索循环](/ppt-images/image15.png)

一次真实任务全程：**117 秒、74,516 tokens（其中 37,440 缓存命中，约一半）**：

![117 秒三步轨迹](/illus/trajectory-117s.svg)

```text
Step 1  search_knowledge ×2   原问题拆成两个子查询并行发出（"检索 β2 与 β1 对比"）
Step 2  read_document ×2      整读《β2 次日报告》和《七日复盘》核实细节
Step 3  整理作答             按"结论 → 数据支撑 → 归因链"输出，9 个 chunk 引用 + 2 张原文截图
```

三个行为特征：**查询改写是常态**（几乎从不直接用原问题检索）；**缓存命中率高**（重复前缀走缓存，成本近半）；**多轮检索不贵**（top-k + 缓存，远低于全库塞上下文）。

和固定管道的实测对比（同一问题"β2 买量玩家次留为何低于 β1"）：

| 方案 | 结果 |
|------|------|
| 固定管道 | 只答出留存数字对比，归因部分开始幻觉 |
| Agentic RAG | 完整"次留下降 → 归因买量质量 → 证据链"，可溯源 |

## 小结

轨迹还原三板斧：**postgres 查落盘 → docker logs 验过程 → 接口重放补全量**，配合锚点校验任何一次检索都可完整复盘。Agentic RAG 的本质：把"搜不到怎么办"的决策权从管道交给模型。

**收尾给一个选型判据**（什么问题用什么方案）：

| 你的问题类型 | 用什么 |
|------|------|
| 单跳事实（"β2 次留是多少"） | 混合检索就够 |
| 多跳关联（"为什么降、牵连哪些系统"） | 需要结构化索引（GraphRAG） |
| 需要交叉验证、多轮推理 | Agentic RAG |
