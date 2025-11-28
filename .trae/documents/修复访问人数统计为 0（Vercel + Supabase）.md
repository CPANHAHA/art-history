## 目标
- 改用 Supabase 数据库表 `visit_counter` 进行访问人数累计（更适合后续统计与查询）。

## 实施步骤
1. 在 Supabase 项目创建表与初始行：
   - 执行 SQL：
     - `create table if not exists visit_counter (id int primary key, total int not null default 0);`
     - `insert into visit_counter (id, total) values (1, 0) on conflict (id) do nothing;`
2. 服务端函数实现（PostgREST）：
   - 读取当前计数：`GET /rest/v1/visit_counter?id=eq.1&select=total`
   - 递增计数：读取当前值 +1 后，`POST /rest/v1/visit_counter?on_conflict=id`，上送 `[{ id: 1, total: next }]`
   - `Prefer: return=representation` 以获取语义化响应，失败时保底返回当前值。
3. 环境变量（Vercel 项目 Settings → Environment Variables）：
   - `SUPABASE_URL`=`https://bhwkwbvhhjayapyptsll.supabase.co`
   - `SUPABASE_SERVICE_ROLE_KEY`=`你的 service_role`（仅服务端使用）
4. 部署与缓存：
   - 在 Vercel 点击最新提交的 `Redeploy`，取消 “Use existing Build Cache”，确保拉取最新实现。

## 验证
- 浏览器访问：
  - `https://<你的域名>/api/visit` 应返回 `{"count":N}`，首次加载会递增。
  - `https://<你的域名>/api/visit?peek=1` 返回当前值，不递增。
- 首页左侧“访问人数”随首次打开递增，并每 30 秒轮询刷新。

## 说明
- 该方案便于后续扩展（如“今日访问数”“分时统计”“导出报表”）。
- 若你需要我代为执行 Supabase 的建表与 Vercel 的环境变量检查/重部署，请确认后我将立即实施。