---
title: 同期群分析（Cohort）：留存矩阵的 SQL 写法
series: 03 分析方法论
order: 1
date: 2026-11-14
description: 同期群是数据分析师最该练熟的分析框架。一篇讲透 cohort 思想、留存矩阵 SQL 和三个应用场景。
tags: [方法论, 留存]
featured: true
---

前面写过单日留存的 SQL，这篇升级到完整的**同期群分析**：把用户按注册周/月分批，
追踪每一批的留存/付费曲线，看「不同批次的质量变化」。

## 1. 为什么需要 Cohort

DAU 上涨可能是个幻觉：新增在涨，但每批新用户的留存都在变差，
老用户在持续流失——总量掩盖了结构。Cohort 把结构摊开给你看。

## 2. 留存矩阵：核心 SQL

按「注册周」分批，追踪每批注册后第 0~4 周的活跃人数：

```sql
WITH cohort_active AS (
  SELECT
    DATE_TRUNC('week', u.register_time)::date       AS cohort_week,  -- 注册周
    u.uid,
    DATE_DIFF('week',
              DATE_TRUNC('week', u.register_time),
              DATE_TRUNC('week', e.event_time))::int AS week_no      -- 第几周
  FROM users u
  JOIN (SELECT DISTINCT uid, event_time FROM events
        WHERE dt >= '2026-09-01') e
    ON e.uid = u.uid
  WHERE u.register_time >= '2026-09-01'
)
SELECT
  cohort_week                        AS 注册周,
  COUNT(DISTINCT CASE WHEN week_no = 0 THEN uid END) AS W0,
  COUNT(DISTINCT CASE WHEN week_no = 1 THEN uid END) AS W1,
  COUNT(DISTINCT CASE WHEN week_no = 2 THEN uid END) AS W2,
  COUNT(DISTINCT CASE WHEN week_no = 3 THEN uid END) AS W3,
  COUNT(DISTINCT CASE WHEN week_no = 4 THEN uid END) AS W4,
  ROUND(COUNT(DISTINCT CASE WHEN week_no = 1 THEN uid END) * 100.0
        / COUNT(DISTINCT CASE WHEN week_no = 0 THEN uid END), 1) AS W1留存率
FROM cohort_active
GROUP BY cohort_week
ORDER BY cohort_week;
```

产出长这样（数字为示例）：

| 注册周 | W0 | W1 | W2 | W3 | W1留存率 |
|--------|-----|-----|-----|-----|--------|
| 09-01 | 5,200 | 1,560 | 1,248 | 1,096 | 30.0% |
| 09-08 | 6,100 | 1,952 | 1,610 | — | 32.0% |
| 09-15 | 5,800 | 1,740 | — | — | 30.0% |

**读法**：横向看单批衰减，纵向看批次质量。W1 留存率逐周下滑 → 新用户质量在恶化（版本/渠道问题）。

## 3. 换个分子就是付费 Cohort

把分子从「活跃」换成「充值」，同一张矩阵变成**付费同期群**：

```sql
-- 在上文基础上替换 JOIN 对象即可
JOIN (
  SELECT uid, pay_time AS event_time
  FROM payments WHERE status = 1
) e ON e.uid = u.uid
```

再换算成「每批人均累计充值」就是 **LTV Cohort**——买量团队对账的核心表。

## 4. 三个实用场景

1. **版本效果评估**：大版本上线后的注册周，W1 留存是否显著高于前几周？
   （注意用注册周对齐，而不是自然周，否则版本前后用户混在一批里）
2. **渠道质量对比**：`cohort_week` 换成 `channel`，看不同渠道的留存矩阵
3. **流失召回验证**：召回活动触达的流失用户单独成一批，对比未触达批次的回流率

## 5. 两个工程细节

- **矩阵对角线以下没有数据**：9-15 注册的用户不可能有 W3 数据，导出报表时置灰或留空，
  千万别填 0——0 会把平均值拉低
- **周对齐用 DATE_TRUNC('week')**：不同引擎周一/周日起点不同（Presto 默认周一），
  跨引擎核对时先跑一句 `DATE_TRUNC('week', DATE '2026-11-14')` 确认

## 小结

Cohort 的本质是**控制变量**：把「同一批起点」的用户放在一起看，剔除时间混淆。
练熟这一张矩阵 SQL，60% 的用户分析问题都有了落脚点。
