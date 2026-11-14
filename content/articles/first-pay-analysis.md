---
title: 首充转化分析：从触发到付费的关键路径
series: 02 指标体系
order: 2
date: 2026-11-13
description: 首充是玩家付费生命的起点。怎么定义首充、怎么定位首充前的关键行为、首充礼包怎么评估。
tags: [付费, 转化]
---

玩家第一次掏钱是最难的一步。首充率每提升 1 个百分点，后面的付费曲线整体抬升。

## 1. 首充的严格定义

**首充 = 用户生命周期内第一笔成功订单**。注意三点：

- 以 `order_id` 去重、`status = 1` 成功的最早一笔
- 首充时间 = 第一笔订单的 `pay_time`，不是「达到充值按钮点击」
- 游客账号转正后 UID 不变的，算同一个用户；转正换 UID 的项目要先做 ID-Mapping

```sql
WITH first_pay AS (
  SELECT uid,
         MIN(pay_time) AS first_pay_time,
         MIN_BY(amount, pay_time) AS first_amount
  FROM payments
  WHERE status = 1
  GROUP BY uid
)
SELECT
  COUNT(*)                                     AS 首充用户数,
  ROUND(AVG(first_amount), 2)                  AS 平均首充金额,
  COUNT(CASE WHEN first_amount <= 6  THEN 1 END) * 100.0 / COUNT(*) AS 小额档占比,
  COUNT(CASE WHEN first_amount >= 328 THEN 1 END) * 100.0 / COUNT(*) AS 大额档占比
FROM first_pay;
```

## 2. 首充前的关键路径

把首充用户按「注册 → 首充」的时间分布拉开：

```sql
SELECT
  CASE
    WHEN mins < 10   THEN 'a.10分钟内'
    WHEN mins < 60   THEN 'b.10-60分钟'
    WHEN mins < 1440 THEN 'c.1-24小时'
    WHEN mins < 4320 THEN 'd.1-3天'
    ELSE 'e.3天以上'
  END AS 注册到首充时长,
  COUNT(*) AS 用户数
FROM (
  SELECT u.uid,
         TIMESTAMPDIFF(MINUTE, u.register_time, f.first_pay_time) AS mins
  FROM users u
  JOIN first_pay f ON f.uid = u.uid
) t
GROUP BY 1
ORDER BY 1;
```

典型分布是双峰：**新手期冲动付费**（10 分钟内）和**价值确认后付费**（1-3 天）。
两个峰对应两套运营动作：前者靠首充礼包视觉强度，后者靠首日的成长流畅度。

## 3. 首充礼包效果评估

最朴素的问题：首充礼包（6 元 10 倍返利）到底值不值？

对比「礼包上线前后两周的新用户」的 7 日付费率与 30 日 LTV：

```sql
-- 礼包上线前后的同期对比框架
SELECT
  CASE WHEN u.register_time < '2026-11-01' THEN 'before' ELSE 'after' END AS 批次,
  COUNT(DISTINCT u.uid) AS 新增,
  COUNT(DISTINCT p.uid) AS 7日内付费人数,
  ROUND(COUNT(DISTINCT p.uid) * 100.0 / COUNT(DISTINCT u.uid), 2) AS 付费率
FROM users u
LEFT JOIN payments p
  ON p.uid = u.uid AND p.status = 1
 AND p.pay_time < u.register_time + INTERVAL '7' DAY
WHERE u.register_time BETWEEN '2026-10-18' AND '2026-11-14'
GROUP BY 1;
```

评估时注意两个混淆因素：

1. **前后批次的量级构成要一致**（渠道结构变化会让对比失真），必要时分渠道对比
2. **首充礼包往往拉动付费率但压低 ARPPU**（都买 6 元档），看回收要拉长到 30 日 LTV

## 小结

首充分析一条主线：**什么人在什么节点、被什么内容打动付了第一笔**。
把注册→首充时长分布拉出来，你的运营动作就有了靶子。
