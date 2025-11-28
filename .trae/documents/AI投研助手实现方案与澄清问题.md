## 关键规则更新
- 分类：完全手动；删除某类别时，将该类别下所有报告归类为“其他”。
- 类别可修改：报告的类别字段在编辑时可调整。
- 编辑留存：每份报告仅保留最近一次编辑的副本（可一键恢复）。
- 导入 JSON：允许缺失字段；唯一必填为 `project_name`；其余字段可为空或缺省。
- 评分与 DEV 活跃度：作为参考因素之一；排序支持“按评分”，缺失评分的报告在排序中后置。

## 数据模型（本地存储）
- reports
  - 必备：`id`、`project_name`、`category`、`created_at`、`updated_at`、`deleted_at(null)`。
  - 可选字段（对齐 13 项）：`ai_rating(null)`、`twitter_handle(null)`、`ticker(null)`、`launchpad(null)`、`labels(null)`、`basic_info(null)`、`team_background(null)`、`dev_activity_rating(null)`、`dev_activity_note(null)`、`token_mechanism(null)`、`progress_plan(null)`、`business_potential(null)`、`competitors(null)`、`focus_points([])`、`sources([])`、`generated_at(null)`。
- categories
  - 字段：`id`、`name`；包含内置 `其他`，作为删除回退目标。
- report_last_edit
  - 字段：`report_id`、`snapshot`（整份报告对象）、`edited_at`；每报告仅保留一条。
- 存储文件：`data/reports.json`，结构：`{ reports: [...], categories: [...], last_edits: [...] }`

## 字段缺失与默认
- 缺失 `project_name`：导入拒绝并提示。
- 缺失 `category`：导入预览时需选择分类；若未选，默认归入 `其他`。
- 缺失 `generated_at`：导入时补记为当前时间。
- 缺失 `ticker/ai_rating/dev_activity_rating` 等：置为 `null`；前端显示为“未知”。
- 文本超长：前端提示并允许导入，但在详情页折叠显示。

## 后端接口（继续使用 Python 服务器）
- `GET /api/reports?category&search&sort&page&page_size`
  - `sort=recent|rating`；`rating` 排序时将 `ai_rating=null` 的报告后置。
- `POST /api/reports`（导入保存）
  - 请求体为 JSON；服务器补齐缺省、生成 `id/created_at/updated_at`。
- `PUT /api/reports/:id`（编辑）
  - 写入变更并更新 `updated_at`；将编辑前对象存入 `report_last_edit`，仅保留最近一次。
- `POST /api/reports/:id/restore-last-edit`（恢复）
  - 用最近一次副本覆盖当前，更新 `updated_at`。
- `DELETE /api/reports/:id`（软删）
  - 写入 `deleted_at`，列表不再展示。
- 类别管理
  - `GET /api/categories`
  - `POST /api/categories`（新增）
  - `DELETE /api/categories/:id`（删除）→ 将该类下所有报告的 `category` 置为 `其他`；若删除的是 `其他`，拒绝并提示不可删除。

## 前端交互
- 首页列表
  - Tab：`ALL / ICM / X402 / 其他`；默认 `ALL`。
  - 搜索：项目名称子串（不区分大小写）。
  - 排序：默认 `最近更新`；可选 `评分`（`ai_rating`），缺失评分后置。
  - 卡片：项目名、标签短语、评分（或“未知”）、生成时间；官推图标跳转。
  - 操作：`编辑`、`删除`（弹窗二次确认）。
- AI分析页（外部生成→导入）
  - 表单：项目名称（必填）、ticker（选）、官推（选）、官网（选）。
  - 按钮：`复制固定 Prompt`（含 13 项结构与严格 JSON 要求）。
  - 导入流程：选择 JSON→解析与宽松校验（仅项目名必需）→预览→选择分类（含“新增”）→保存。
- 编辑弹窗
  - 所有 13 项与类别可改；保存后写入最近一次副本；提供“恢复上次编辑”。
- 类别管理
  - 列出已有类别；新增；删除时弹窗说明将报告移至“其他”。

## 固定 Prompt（要点）
- 要求输出严格 JSON，仅包含以下键；允许对无数据的键输出 `"未知"` 或空字符串；评分键可为 `null`：
  - 1 当下重点关注：`focus_points: string[]`
  - 2 AI评分：`ai_rating: number|null`（0–5）
  - 3 项目官推：`twitter_handle: string`
  - 4 ticker：`ticker: string`
  - 5 launchpad：`launchpad: string`
  - 6 标签：`labels: string`
  - 7 基本信息：`basic_info: string`
  - 8 团队背景：`team_background: string`
  - 9 DEV活跃：`dev_activity_rating: number|null`（0–5）、`dev_activity_note: string`
  - 10 代币机制/功能：`token_mechanism: string`
  - 11 当下进展/后续规划：`progress_plan: string`
  - 12 商业潜力：`business_potential: string`
  - 13 竞品简介：`competitors: string`
  - 其他：`sources: {url:string,title?:string,note?:string}[]`、`generated_at: string(ISO)`
- 开头指明：仅基于可验证信息；无法确认则标注“未知”；整体评分需给出简短理由。

## 校验策略
- 导入时仅校验：存在 `project_name` 且其为非空字符串；其余键若存在则类型正确（宽松）。
- 自动补齐：缺 `generated_at` 用当前时间；缺数组键补为空数组；缺字符串键补空字符串；缺评分补 `null`。
- 错误提示：逐条显示类型错误或 JSON 解析错误；可继续编辑修正后再保存。

## 排序与显示细则
- 最近更新：按 `updated_at` 倒序。
- 按评分：以 `ai_rating` 倒序；评分为 `null` 的后置且在 UI 标注“无评分”。
- Twitter：当 `twitter_handle` 有 `@xxx` 或 URL 时显示跳转；否则灰显。

## 安全与可靠性（无登录）
- 删除与编辑均二次确认；删除为软删。
- 文本渲染转义，链接仅 `http/https`。
- 文件写入采用原子写与简单锁，防止并发损坏。

## 本地运行与里程碑
- 运行：沿用当前 `python3 server.py`；首次启动若无 `data/reports.json` 则初始化。
- M1：前端“AI分析”页（复制 Prompt、导入预览与校验）。
- M2：报告列表（分类/搜索/排序/分页）与保存入库。
- M3：编辑与删除（软删、最近一次副本恢复），类别增删（删除归入“其他”）。
- M4：本地验收与优化（错误提示与稳定性）。