# Web3大航海 · V1（MVP）

## 概述
- 部署：Vercel（静态页面 + Serverless Functions）
- 数据库：Supabase（Postgres + REST）
- 模块：首页、登录/注册（申请会员）、会员审核后台、权限控制、AI投研助手入口

## 环境变量（Vercel Settings）
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`
- `SESSION_SECRET`

## 初始化 Supabase
- 打开 Supabase 项目 → SQL Editor 执行 `supabase/init.sql`
- 脚本包含：枚举 `user_status`、`users` 表、初始管理员注入（`chuye1987/19870110`）

## 路由与接口
- 页面：`/`、`/ai-invest`（跳转至 `invest.html`）、`/admin`
- 接口：
  - `POST /api/register`
  - `POST /api/login`
  - `POST /api/logout`
  - `GET  /api/session`
  - 管理员：
    - `GET  /api/admin/pending-list`
    - `POST /api/admin/approve`
    - `POST /api/admin/blacklist`
    - `POST /api/admin/reject`
    - `POST /api/admin/recover`

## 验证清单
- 注册：返回“已提交，等待审核”，数据库新增 `pending` 用户
- 登录校验顺序：不存在 / `pending` / `blacklisted` / 密码错误 / 成功
- 管理后台：加载待审核列表；通过/拉黑/拒绝后列表更新；可按 ID 恢复黑名单为 `member`
- 路由守卫：
  - `/ai-invest`：仅 `member/admin` 可访问
  - `/admin`：仅 `admin` 可访问

## 部署
- 将仓库导入 Vercel，配置环境变量，部署
- 自定义域名：在 Vercel Domains 添加并按提示在 DNS 配置记录

## 说明
- 密码哈希：PBKDF2-HMAC-SHA256，迭代 100000，随机盐；哈希与盐分别存储
- 会话：JWT（HS256）通过 `HttpOnly` Cookie 下发，前端不可读；接口层强制校验
- 后续版本将迁移投研数据接口（`/api/reports` 等）至 Supabase 并补充相应函数
