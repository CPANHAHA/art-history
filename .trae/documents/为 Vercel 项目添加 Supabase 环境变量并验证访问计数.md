## 要做什么
- 在 Vercel“项目级”的 Environment Variables 添加两个变量：`SUPABASE_URL` 与 `SUPABASE_SERVICE_ROLE_KEY`
- 重新部署并验证 `/api/visit` 能读取并递增 `visit_counter`

## 具体步骤
1. 打开 Vercel 控制台：进入你的“项目”（不是 Team 级设置）→ `Settings` → `Environment Variables`
2. 添加变量（选择 `Production` 和 `Preview` 环境）
   - Key `SUPABASE_URL`，Value 填你的项目 URL：`https://bhwkwbvhhjayapyptsll.supabase.co`
   - Key `SUPABASE_SERVICE_ROLE_KEY`，Value 填你的 Service Role 密钥（敏感，建议开启 Sensitive 开关）
3. 保存后返回 `Deployments`，点击最新提交的 `Redeploy`，取消勾选 “Use existing Build Cache”，开始重建

## 验证
- 访问 `https://<你的域名>/api/visit` 应返回 `{"count":N}`，首次访问会从 0→1
- 访问 `https://<你的域名>/api/visit?peek=1` 返回当前值，不递增
- 首页左侧“访问人数”首次打开递增，并每 30 秒自动刷新

## 排查
- 若仍为 0：
  - 确认在“项目级”而不是 Team 级添加变量
  - 确认变量名大小写完全匹配（`SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`）
  - 在 Supabase SQL 已建表并初始化：`visit_counter` 有 `id=1` 行

## 你需要提供
- 若你不确定项目级设置入口，请给我 Vercel 项目链接；我将指导准确页面位置并继续协助验证。