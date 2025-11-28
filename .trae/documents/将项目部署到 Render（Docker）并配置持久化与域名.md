## 概述
- 平台：Vercel（静态页面 + Serverless Functions）+ Supabase（Postgres + REST）。
- 范围：首页、登录/注册（申请会员）、会员审核后台、权限控制与工具入口；用户系统基于 Supabase 自建表。

## 架构与会话
- 前端：保留现有静态页面结构（`/`、`/ai-invest`、`/admin`），在页面加载时调用 `/api/session` 决定访问权限并做引导。
- 服务端：Serverless Functions 负责登录/注册、权限校验、后台审核。登录成功后颁发 JWT，并在 `HttpOnly` Cookie（`session`）中下发；请求时函数验证 Cookie。
- 安全：JWT 使用 `HS256`，服务端仅持有 `SESSION_SECRET`；客户端不可读 Cookie，杜绝前端伪造。

## 数据库（Supabase）
- 枚举 `user_status`：`pending`、`member`、`admin`、`blacklisted`。
- 表 `users`：`id uuid (PK)`、`username text unique not null`、`password_hash text not null`、`password_salt text not null`、`status user_status not null`、`created_at timestamptz default now()`。
- 初始管理员：`chuye1987 / 19870110 / admin`（通过一次性初始化脚本写入）。
- RLS：可开启但服务端使用 `service role key` 进行受控写入；前端只读场景使用 `anon key`（谨慎权限）。

## 密码与加密
- 哈希算法：Node 内置 `crypto.scrypt`（带随机盐）；存储 `password_hash` + `password_salt`。
- 登录验证：`scrypt` 重新派生对比，常数时间比较；错误提示按 PRD 顺序返回。

## 接口设计（Serverless）
- `POST /api/register`
  - 入参：`username`（6–8位字母或数字）、`password`（8位）。
  - 逻辑：校验格式与重名 → 写入 `users(pending)` → 返回“已提交，等待审核”。
- `POST /api/login`
  - 入参：`username`、`password`。
  - 校验顺序：
    1) 不存在 → `请先申请成为会员`
    2) `pending` → `审核中`
    3) `blacklisted` → `已被加入黑名单`
    4) 密码错误 → `密码错误`
    5) 通过（`member/admin`）→ 签发 JWT，写入 `HttpOnly` Cookie。
- `POST /api/logout`
  - 清除 `session` Cookie。
- `GET /api/session`
  - 返回登录用户基本信息与 `status`；用于前端路由守卫与展示。
- 管理后台接口（仅 `admin`）：
  - `POST /api/admin/approve`：将用户从 `pending` → `member`。
  - `POST /api/admin/blacklist`：任意用户 → `blacklisted`。
  - `POST /api/admin/reject`：删除 `pending` 用户（拒绝）。
  - `POST /api/admin/recover`：`blacklisted` → `member`。
  - `GET /api/admin/pending-list`：列出待审核用户。

## 路由与权限
- `/`（首页）：所有人可见，显示标题、登录按钮、申请会员按钮、工具入口区；登录后若为 `admin` 显示后台入口。
- `/ai-invest`：加载时调用 `/api/session`，仅 `member/admin` 通过；其余显示拦截提示并跳转或隐藏功能区。
- `/admin`：同域守卫 + 接口守卫；页面加载时检查 `admin` 身份，不满足则重定向回首页。

## 前端改造
- 首页：新增登录与注册（申请会员）表单交互；调用 `/api/register` 与 `/api/login`；成功后根据返回 `status` 更新 UI。
- 管理后台页：列表 `pending` 用户；操作按钮调用后台接口变更状态；提供黑名单管理与恢复。
- 工具入口：根据会话状态显示/隐藏入口；进入 `/ai-invest` 时再次校验。

## 环境变量（Vercel Settings）
- `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_ANON_KEY`（参考 `api/visit.js:5-8`）。
- `SESSION_SECRET`：JWT 签名密钥。

## 部署步骤（Vercel）
1. 在 Supabase 建表与枚举；写入初始管理员。
2. 在 Vercel 项目配置上述环境变量。
3. 提交 Serverless 函数与前端改造代码；导入仓库并部署。
4. 验证：
  - 注册→`pending`；登录提示 `审核中`。
  - 管理员登录→审核通过或加入黑名单；恢复 `member`。
  - 路由守卫：`/ai-invest` 与 `/admin` 按身份限制访问。

## 与现有后端的关系
- 继续保留现有投研数据与接口迁移计划（`/api/reports` 等），但不作为 V1 范围；V1 聚焦用户系统与权限框架搭建。

## 我将为你执行的具体事项（确认后）
- 新增登录/注册/会话与后台审核 Serverless 函数；实现完整权限矩阵与拦截逻辑。
- 完成首页与后台页面的最小改造（UI 与交互）。
- 提交 Supabase 初始化脚本（建表、枚举与初始管理员注入）。
- 补充 README：部署、环境变量、验证与回滚。