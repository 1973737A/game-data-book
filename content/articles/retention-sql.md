---
title: 留存率 SQL：次日 / 7 日 / 30 日留存一次写对
series: 01 SQL 实战基础
order: 2
date: 2026-11-11
description: 留存是游戏最核心的健康度指标。这篇给出标准写法、口径陷阱，以及一张表同时算多个留存天数的透视写法。
tags: [SQL, 留存]
featured: true
---

留存率 = 某天新增的用户里，之后第 N 天还活跃的比例。看似简单，口径错了全盘皆错。

## 1. 标准写法：次日留存

思路：新用户表 × 次日活跃表，LEFT JOIN 后数非空：

```sql
WITH new_users AS (                       -- 11-01 的新用户
  SELECT uid
  FROM users
  WHERE register_time >= '2026-11-01'
    AND register_time <  '2026-11-02'
),
next_day_active AS (                      -- 11-02 活跃过的用户
  SELECT DISTINCT uid
  FROM events
  WHERE dt = '2026-11-02'
)
SELECT
  COUNT(DISTINCT n.uid)                       AS new_users,
  COUNT(DISTINCT a.uid)                       AS retained,
  ROUND(COUNT(DISTINCT a.uid) * 100.0
        / NULLIF(COUNT(DISTINCT n.uid), 0), 2) AS retention_pct
FROM new_users n
LEFT JOIN next_day_active a ON n.uid = a.uid;
```

## 2. 三个口径陷阱

**陷阱一：活跃的定义**。「活跃」用登录事件还是任意事件？
建议用「当日产生过任意事件的去重 uid」，与 DAU 口径保持一致。

**陷阱二：第 N 天的精确匹配 vs 窗口匹配**。
- 精确匹配：注册后第 7 天当天活跃（标准定义）
- 窗口匹配：第 7 天及以后活跃过（实际更常用，容忍用户隔几天上线）

部门内必须统一，跨部门汇报时注明用的是哪种。

**陷阱三：时区**。港澳台服、日服的「一天」按什么时区切？
`dt` 分区生成时就定死了，先确认数仓分区的时区规则再算留存。

## 3. 一次算 1/3/7/30 留存（透视写法）

利用「活跃日期 - 注册日期」的天数差：

```sql
WITH user_days AS (
  SELECT
    u.uid,
    u.register_time::date           AS reg_dt,
    DATEDIFF(e.dt, u.register_time::date) AS day_offset
  FROM users u
  JOIN (SELECT DISTINCT dt, uid FROM events
        WHERE dt BETWEEN '2026-11-01' AND '2026-11-30') e
    ON e.uid = u.uid
  WHERE u.register_time >= '2026-11-01'
)
SELECT
  reg_dt                                        AS 日期,
  COUNT(DISTINCT uid)                           AS 新增,
  ROUND(COUNT(DISTINCT CASE WHEN day_offset = 1  THEN uid END) * 100.0
        / COUNT(DISTINCT uid), 2)               AS 次留_百分比,
  ROUND(COUNT(DISTINCT CASE WHEN day_offset = 3  THEN uid END) * 100.0
        / COUNT(DISTINCT uid), 2)               AS 三留_百分比,
  ROUND(COUNT(DISTINCT CASE WHEN day_offset = 7  THEN uid END) * 100.0
        / COUNT(DISTINCT uid), 2)               AS 七留_百分比,
  ROUND(COUNT(DISTINCT CASE WHEN day_offset = 30 THEN uid END) * 100.0
        / COUNT(DISTINCT uid), 2)               AS 月留_百分比
FROM user_days
GROUP BY reg_dt
ORDER BY reg_dt;
```

> **注意**：30 留只对「已注册满 30 天」的日期有效。11-20 注册的用户不可能有 30 留数据，
> 展示时要过滤 `reg_dt <= CURRENT_DATE - 30`，否则后几行会虚低。

## 小结

留存 SQL 的关键是三件事：**新增口径、活跃口径、天数定义**。写 SQL 前先把这三句话写在注释里，
评审时先对口径再看数字。
