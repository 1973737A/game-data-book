---
title: 付费结构透视：大 R 贡献度与鲸鱼用户识别
series: 02 指标体系
order: 3
date: 2026-11-14
description: 游戏流水高度依赖头部付费用户。怎么量化付费集中度、怎么定义大 R、头部流失预警怎么做。
tags: [付费, 用户分层]
---

游戏行业的老规律：**顶部 1% 的用户贡献 30%~50% 的流水**。
不看清付费结构，流水波动你永远解释不清。

## 1. 付费集中度：分层贡献表

按累计充值分层，看每层的人数与流水贡献：

```sql
WITH user_pay AS (
  SELECT uid, SUM(amount) AS total_amount
  FROM payments
  WHERE status = 1
    AND pay_time >= '2026-10-01'     -- 观察窗口：近 30 天
  GROUP BY uid
),
ranked AS (
  SELECT uid, total_amount,
         NTILE(100) WITHIN GROUP (ORDER BY total_amount) OVER () AS pct
  FROM user_pay
)
SELECT
  CASE
    WHEN pct <= 1  THEN 'Top 1%'
    WHEN pct <= 5  THEN 'Top 2-5%'
    WHEN pct <= 20 THEN 'Top 6-20%'
    WHEN pct <= 50 THEN '21-50%'
    ELSE '后50%'
  END AS 付费分层,
  COUNT(*) AS 人数,
  ROUND(SUM(total_amount), 0) AS 流水,
  ROUND(SUM(total_amount) * 100.0 / SUM(SUM(total_amount)) OVER (), 1) AS 流水贡献百分比
FROM ranked
GROUP BY 1
ORDER BY 1;
```

> 更通用的做法是直接按充值金额区间分层（0-30 / 30-328 / 328-2000 / 2000+），
> 和运营的「小额 / 中 R / 大 R / 鲸鱼」人话对齐。

## 2. 帕累托检验：Top N 用户贡献

```sql
SELECT
  MIN(rnk) AS 前N人,
  ROUND(SUM(total_amount) * 100.0
        / (SELECT SUM(total_amount) FROM user_pay), 1) AS 占总流水百分比
FROM (
  SELECT uid, total_amount,
         ROW_NUMBER() OVER (ORDER BY total_amount DESC) AS rnk
  FROM user_pay
) t
WHERE rnk <= 50;      -- 换成不同 N 值看集中度曲线
```

如果 Top 50 用户占了 40% 流水，那么「头部用户流失预警」就不是可选项，而是必答题。

## 3. 头部流失预警信号

大 R 流失前的典型信号（按可用性排序）：

1. **登录间隔拉长**：从每天在线变成 3 天一登
2. **付费金额骤降**：连续 7 日充值低于其历史日均的 30%
3. **社交行为消失**：退出公会、私聊频次归零
4. **玩法触顶**：主线停滞、战斗力增长停滞

用「近 7 日充值 ÷ 近 30 日日均充值 < 0.3 且 连续 7 日」筛出预警名单：

```sql
WITH pay7 AS (
  SELECT uid, SUM(amount) AS amt7
  FROM payments
  WHERE status = 1 AND pay_time >= CURRENT_DATE - 7
  GROUP BY uid
),
pay30 AS (
  SELECT uid, SUM(amount) / 30.0 AS daily_avg30
  FROM payments
  WHERE status = 1 AND pay_time >= CURRENT_DATE - 37
    AND pay_time <  CURRENT_DATE - 7
  GROUP BY uid
)
SELECT
  p30.uid,
  ROUND(p30.daily_avg30 * 30, 0) AS 近30日充值,
  COALESCE(p7.amt7, 0)           AS 近7日充值,
  ROUND(COALESCE(p7.amt7, 0) / NULLIF(p30.daily_avg30 * 7, 0), 2) AS 充值活跃比
FROM pay30 p30
LEFT JOIN pay7 p7 ON p7.uid = p30.uid
WHERE p30.daily_avg30 * 30 >= 1000          -- 月充值 1000+ 的头部用户
  AND COALESCE(p7.amt7, 0) < p30.daily_avg30 * 7 * 0.3
ORDER BY 近30日充值 DESC;
```

## 小结

付费结构分析的产出应该是一句话：**「我们 X% 的流水来自 Y 个用户，他们最近的状态是 Z」**。
这句话放进每周经营汇报，比任何图表都管用。
