---
title: LTV 计算的三种口径与 SQL 实现
series: 01 SQL 实战基础
order: 3
date: 2026-11-12
description: 买量回收看 LTV。累计 LTV、N 日 LTV、预测 LTV 三种口径怎么算、怎么用，附完整 SQL。
tags: [SQL, LTV, 付费]
---

LTV（Life Time Value）决定买量敢出多少钱。口径不清的 LTV 会让投放决策整体跑偏。

## 1. 三种口径先分清

| 口径 | 定义 | 用途 |
|------|------|------|
| 累计 LTV | 截至今天，某批用户的人均累计充值 | 看历史大盘 |
| N 日 LTV | 注册后第 N 天内的人均累计充值 | 对比批次质量、评估回收 |
| 预测 LTV | 拟合曲线外推的总 LTV | 买量出价依据 |

> N 日 LTV 是最常用的主口径：**「注册后 0~N 天内的充值总额 ÷ 该批注册人数」**。

## 2. N 日 LTV 标准写法

算 11-01 注册用户的 7 日 LTV：

```sql
WITH cohort AS (
  SELECT uid, register_time
  FROM users
  WHERE register_time >= '2026-11-01'
    AND register_time <  '2026-11-02'
),
pay_in_window AS (
  SELECT
    c.uid,
    p.amount
  FROM cohort c
  JOIN payments p
    ON p.uid = c.uid
   AND p.status = 1
   AND p.pay_time >= c.register_time
   AND p.pay_time <  c.register_time + INTERVAL '7' DAY
)
SELECT
  COUNT(DISTINCT c.uid)                                   AS 注册人数,
  COALESCE(SUM(p.amount), 0)                              AS 七日充值总额,
  ROUND(COALESCE(SUM(p.amount), 0)
        / COUNT(DISTINCT c.uid), 2)                       AS 七日LTV,
  ROUND(COUNT(DISTINCT p.uid) * 100.0
        / COUNT(DISTINCT c.uid), 2)                       AS 七日付费率_百分比
FROM cohort c
LEFT JOIN pay_in_window p ON c.uid = p.uid;
```

两个细节：

1. **窗口从注册时刻起算**（`register_time + 7 day`），不是自然日第 7 天，两种算法在小额高频游戏里能差 5%。
2. **免费用户也是分母**。LTV 是「人均」，不是「付费用户人均」——后者是 ARPPU，别混。

## 3. LTV 曲线：一张表看每天的累计

把窗口参数化，直接输出 LTV 增长曲线：

```sql
SELECT
  days.n                                                AS 第N天,
  ROUND(SUM(p.amount)
        / COUNT(DISTINCT c.uid), 2)                     AS 累计LTV
FROM cohort c
JOIN payments p
  ON p.uid = c.uid AND p.status = 1
 AND DATEDIFF(p.pay_time, c.register_time) BETWEEN 0 AND 30
JOIN (SELECT 1 AS n UNION ALL SELECT 3 UNION ALL SELECT 7
      UNION ALL SELECT 14 UNION ALL SELECT 30) days
  ON DATEDIFF(p.pay_time, c.register_time) <= days.n
GROUP BY days.n
ORDER BY days.n;
```

> **注意**：天数越大的行，最近注册的用户数据越不完整。
> 生产环境要在 cohort 里限定 `register_time <= CURRENT_DATE - days.n`，通常拆成两条 SQL 写更清晰。

## 4. 预测 LTV 的实用做法

游戏 LTV 增长曲线通常呈幂函数 `LTV(n) = a × n^b`。实操建议：

1. 取一批**已成熟**的历史用户（注册满 180 天），算出 7/14/30/60/90 日 LTV
2. 用这些点在 Excel/Python 里拟合幂函数
3. 用当月新用户的 7 日 LTV × 拟合系数外推 180 日 LTV

```python
import numpy as np
from scipy.optimize import curve_fit

# x: 第N天, y: 历史 LTV 曲线上的点
x = np.array([1, 3, 7, 14, 30, 60, 90])
y = np.array([1.2, 2.5, 4.8, 8.1, 14.2, 22.0, 27.5])

f = lambda n, a, b: a * n ** b
(a, b), _ = curve_fit(f, x, y)

print(f"LTV(n) = {a:.2f} * n^{b:.3f}")
print("180日预测LTV =", round(f(180, a, b), 2))
```

## 小结

LTV 三问：**谁的用户（批次）、多长窗口、含不含退款**。投放侧用预测 LTV 定出价，
回收看 LTV ÷ CPA 的倍数（健康线通常 0.8 起步、180 日回本）。
