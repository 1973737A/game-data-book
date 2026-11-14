---
title: 游戏数据分析常用表结构：用户、事件、充值三件套
series: 01 SQL 实战基础
order: 1
date: 2026-11-10
description: 动手写任何分析 SQL 之前，先搞清楚三张核心表长什么样：用户表、事件日志表、充值流水表。
tags: [SQL, 数仓]
featured: true
---

写分析 SQL 之前，先认识三张几乎每个游戏项目都有的核心表。口径清楚了，后面的留存、LTV、漏斗查询才不会错。

## 1. 用户表（users）

一行一个账号，记录账号的静态属性：

```sql
CREATE TABLE users (
  uid          BIGINT PRIMARY KEY,      -- 账号唯一 ID
  register_time DATETIME,               -- 注册时间（口径：首次进服，非点击注册）
  channel      VARCHAR(32),             -- 渠道：自然量 / 买量渠道号
  platform     VARCHAR(8),              -- ios / android / h5
  server_id    INT,                     -- 首次进入的区服
  country      VARCHAR(8)               -- 国家/地区代码
);
```

> **常见坑**：很多项目 `register_time` 记的是「创角时间」，而游客试玩没创角就被记为「登录」。
> 分析新用户时先确认：你的分母到底是「注册账号」还是「创角账号」，两者可能差 20% 以上。

## 2. 事件日志表（events）

一行一条行为，是行为分析的基础。通常是分区表，按天分区：

```sql
CREATE TABLE events (
  dt           DATE,                   -- 分区日期
  event_time   DATETIME,               -- 行为发生时间
  uid          BIGINT,
  event_name   VARCHAR(64),            -- 事件名：login / level_up / battle_end ...
  server_id    INT,
  properties   STRING                  -- JSON 扩展字段
)
PARTITIONED BY (dt);
```

查询时**必须带上分区条件**，这是数仓基本礼仪：

```sql
SELECT event_name, COUNT(*) AS cnt
FROM events
WHERE dt = '2026-11-10'
GROUP BY event_name
ORDER BY cnt DESC;
```

## 3. 充值流水表（payments）

一行一笔充值，金额分析只认这张表：

```sql
CREATE TABLE payments (
  order_id     STRING PRIMARY KEY,     -- 订单号（去重依据！）
  uid          BIGINT,
  pay_time     DATETIME,
  amount       DECIMAL(16,2),          -- 充值金额（原币）
  currency     VARCHAR(8),             -- 币种：CNY / TWD / JPY ...
  product_id   STRING,                 -- 商品 ID（6 元档 / 30 元档）
  pay_channel  STRING,                 -- 支付渠道
  status       TINYINT                 -- 1=成功（务必过滤！）
);
```

三个必守口径：

| 口径 | 说明 |
|------|------|
| 金额单位 | 统一换算成单一币种再求和，跨区项目尤其注意 |
| 去重 | 以 `order_id` 去重，退款订单是否剔除要和财务对齐 |
| 状态 | 只统计 `status = 1` 的成功订单 |

## 小结

三张表的关系：`users` 定「人」，`events` 定「行为」，`payments` 定「钱」。
后面所有笔记的 SQL 都建立在这三张表之上——先确认你的项目里这三张表的真名和字段，把本文的示例表名替换掉即可。
