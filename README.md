# Grand_Seaview_Hotel

## GitHub Pages

1. 在仓库的 **Settings → Pages → Build and deployment** 中，将 **Source** 设为 **GitHub Actions**。
2. 将改动推送到 `main`，或在 **Actions → Deploy to GitHub Pages** 手动运行发布流程。
3. 等待部署成功后，打开 [酒店模拟](https://yan91i.github.io/Grand_Seaview_Hotel/)。

工作流执行 `npm ci` 和 `npm run build:pages`，只发布 `dist/`，不发布源码或 `.env`。Pages 版使用内置模拟引擎，无需 API 密钥或后端。

## 本地运行

运行 `npm ci` 后，用 `npm run dev` 启动前端和本地代理。若要预览 Pages 版，运行 `npm run build:pages` 和 `npm run preview -- --mode pages`，然后访问 `http://localhost:4173/Grand_Seaview_Hotel/`。
