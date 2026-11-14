---
title: 游戏核心指标字典：DAU、付费率、ARPU 的准确定义
series: 02 指标体系
order: 1
date: 2026-11-13
description: 同名不同义的指标是数据事故高发区。这份字典把常用指标的定义、公式、SQL 口径一次钉死。
tags: [指标体系]
featured: true
---

每个数据团队都需要一份「指标字典」：指标叫什么、公式是什么、分母是谁。
本文给出游戏行业最常用的一组核心指标的标准定义。

## 1. 活跃与规模

| 指标 | 定义 | 口径要点 |
|------|------|---------|
| DAU | 当日产生任意事件的去重用户数 | 以事件表为准，而非登录表 |
| MAU | 30 日滚动去重用户数 | 滚动 30 天，非自然月 |
| DAU/MAU | 用户粘性比 | 又称 stickiness，0.2 是休闲游分水岭 |
| PCU | 历史最高同时在线 | 需心跳/在线快照表支撑 |

DAU 的标准查询：

```sql
SELECT dt, COUNT(DISTINCT uid) AS dau
FROM events
WHERE dt BETWEEN '2026-11-01' AND '2026-11-13'
GROUP BY dt
ORDER BY dt;
```

## 2. 付费指标

先记一个防混淆的公式族：

```
付费率 = 付费人数 ÷ 活跃人数
ARPU   = 充值金额 ÷ 活跃人数          (Average Revenue Per User)
ARPPU  = 充值金额 ÷ 付费人数          (Average Revenue Per Paying User)
关系   : ARPU = ARPPU × 付费率
```

按天算三件套：

```sql
WITH daily AS (
  SELECT dt, COUNT(DISTINCT uid) AS act_users
  FROM events GROUP BY dt
),
payers AS (
  SELECT pay_time::date AS dt,
         COUNT(DISTINCT uid)      AS pay_users,
         SUM(amount)              AS revenue
  FROM payments
  WHERE status = 1
  GROUP BY pay_time::date
)
SELECT
  d.dt,
  d.act_users                                        AS 活跃,
  p.pay_users                                        AS 付费人数,
  ROUND(p.pay_users * 100.0 / d.act_users, 2)        AS 付费率,
  ROUND(p.revenue / d.act_users, 3)                  AS ARPU,
  ROUND(p.revenue / p.pay_users, 2)                  AS ARPPU
FROM daily d
LEFT JOIN payers p ON p.dt = d.dt
ORDER BY d.dt;
```

## 3. 三个高频混淆点

**ARPU vs ARPPU**：汇报时写「ARPU 86 元」而被理解成「人均付费 86 元」是常见事故——
ARPU 86 元可能来自「10% 付费率 × ARPPU 860 元」。永远成对出现。

**充值 vs 消耗**：玩家充钻石是「充值」，钻石买道具是「消耗」。
财务口径（流水）看充值，玩法分析（道具经济）看消耗，两者不通用。

**当月新增付费 vs 存量付费**：大版本后的流水上涨，要拆「新付费用户贡献」和「老用户复购」，
否则会误判活动效果。

## 4. 指标字典该有的字段

建团队字典时，每个指标至少写清这几项：

```text
指标名：付费率
英文名：Pay Rate
公式：当日付费人数 ÷ 当日活跃人数
分母口径：活跃 = 事件表当日去重 uid（含游客）
分子口径：payments 表 status=1，按 pay_time 落天
负责人：数据分析组
更新频率：T+1
```

## 小结

指标体系的本质是**统一语言**。把这份字典放进团队 wiki，
新人和跨部门同事对数时，先对字典再对数字。
