---
title: 漏斗分析：注册到首充的转化追踪 SQL
series: 03 分析方法论
order: 2
date: 2026-11-14
description: 漏斗是定位流失环节的手术刀。标准漏斗 SQL、窗口漏斗函数、以及最容易踩的三个坑。
tags: [方法论, 转化]
---

新手引导漏斗：下载 → 注册 → 创角 → 完成引导 → 5 级 → 首充。
每一层都在漏人，漏斗告诉你**人漏在哪一层**。

## 1. 基础漏斗：每层到达人数

```sql
WITH steps AS (
  SELECT uid, 1 AS step_reg, NULL::int AS step_rest FROM users WHERE dt = '2026-11-13'
  UNION ALL
  SELECT uid, NULL, 2 FROM events
  WHERE dt = '2026-11-13' AND event_name = 'role_create'
  UNION ALL
  SELECT uid, NULL, 3 FROM events
  WHERE dt = '2026-11-13' AND event_name = 'tutorial_complete'
)
SELECT
  COUNT(DISTINCT CASE WHEN step_reg = 1 THEN uid END) AS 注册,
  COUNT(DISTINCT CASE WHEN step      = 2 THEN uid END) AS 创角,
  COUNT(DISTINCT CASE WHEN step      = 3 THEN uid END) AS 完成引导
FROM (
  SELECT uid, step_reg, MAX(step) AS step
  FROM steps GROUP BY uid, step_reg
) t;
```

> 更简洁的做法是三个子查询各算各的 `COUNT(DISTINCT uid)` 再 JOIN 成一行——
> 漏斗不超过 6 层时，可读性优先。

## 2. 窗口漏斗：Presto/Trino 的 window_funnel

「按顺序、在 N 分钟内依次完成」才算通过，这是更严格的漏斗定义：

```sql
SELECT
  COUNT(*) AS 样本数,
  element_at(funnel, 1) + element_at(funnel, 2) * 10
      + element_at(funnel, 3) * 100 AS 通过编码,
  funnel
FROM (
  SELECT uid,
         WINDOW_FUNNEL(1800) OVER (
           ORDER BY event_time
           MATCH 'create_account' AFTER 'app_launch'
           THEN   'role_create'   AFTER 'create_account'
           THEN   'tutorial_done' AFTER 'role_create'
         ) AS funnel
  FROM events
  WHERE dt = '2026-11-13'
    AND event_name IN ('app_launch', 'create_account',
                       'role_create', 'tutorial_done')
) t
GROUP BY funnel;
```

`WINDOW_FUNNEL(秒数)` 返回用户按序到达的最深步骤，天然处理了「先创角后登录」这种乱序噪音。

## 3. 分层漏斗：对比不同人群的卡点

整体漏斗看不出的问题，分层后一目了然。按渠道分层：

```sql
SELECT
  u.channel,
  COUNT(DISTINCT u.uid) AS 注册,
  COUNT(DISTINCT e1.uid) AS 创角,
  ROUND(COUNT(DISTINCT e1.uid) * 100.0
        / COUNT(DISTINCT u.uid), 1) AS 注册到创角转化率
FROM users u
LEFT JOIN (SELECT DISTINCT uid FROM events
           WHERE dt = '2026-11-13' AND event_name = 'role_create') e1
  ON e1.uid = u.uid
WHERE u.register_time >= '2026-11-13'
GROUP BY u.channel
ORDER BY 注册 DESC;
```

典型发现：某买量渠道「注册→创角」转化只有 40%（其他渠道 85%），
点开用户路径一看，全是静默安装的机器量。

## 4. 三个高频坑

1. **漏斗步骤的时间窗口**：全生命周期漏斗（任何人早晚能完成）和 1 日漏斗（当日完成）差别巨大。
   新手引导用「当日窗口」，首充转化用「7 日窗口」，汇报时写明。
2. **乱序事件**：客户端上报延迟会让 `tutorial_done` 早于 `role_create` 到达数仓。
   严格按序的漏斗必须用 window_funnel 或自行处理乱序，否则转化率虚低。
3. **漏斗不是越平滑越好**：创角→5 级转化 95% 可能说明引导太强制，玩家没有流失出口，
   反而把「根本不是目标用户」的人留在了漏斗里。

## 小结

漏斗分析的输出不是一张图，而是一句话：**「转化率最异常的一层是 X，该层流失用户的行为特征是 Y」**。
然后拿着这句话去找策划/运营对齐行动。
