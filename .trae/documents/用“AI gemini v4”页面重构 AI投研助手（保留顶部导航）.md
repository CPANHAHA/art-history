## 执行要点
- 复制“AI gemini v4_存档副本.html”的完整 HTML/CSS/JS 源码进入项目，作为 `invest.html` 的主体内容。
- 顶部套用当前“Web3大航海”统一导航（返回首页/管理后台/退出），其余结构与样式保持原样。
- 保留原链接（CDN/外部资源）不做改动。

## 接口替换（仅替换调用地址，逻辑不删减）
- 会话：`/api/session`（守卫页面访问）；登录/退出沿用 `/api/login` `/api/logout`。
- 分类：`GET /api/categories`、`POST /api/categories`、`DELETE /api/categories?id=<cid>`。
- 报告：
  - 列表：`GET /api/reports?category=&search=&sort=&page=&page_size=`
  - 创建：`POST /api/reports`
  - 更新：`PUT /api/reports?id=<rid>`（保存快照）
  - 删除：`DELETE /api/reports?id=<rid>`（软删）
  - 恢复快照：`POST /api/reports?id=<rid>&restore=1`

## 适配说明
- 若“AI gemini v4”的脚本使用 localStorage Token，将改为 Cookie 会话（前端不读 Token）。
- DOM 与类名保持一致，避免改动其内部交互。

## 验证清单
- 分类与报告的所有管理操作与筛选在 UI 中可用且与后端一致；导入与预览、Prompt 复制正常。
- 顶部导航展示与风格统一，新增“返回首页”。

## 下一步
- 我将读取“AI gemini v4_存档副本.html”源码并进行移植；若仍无法读取桌面文件，将请你把源码粘贴到此对话或提供上传方式，之后立即完成移植与部署。