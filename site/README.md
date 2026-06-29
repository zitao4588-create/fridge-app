# 冰箱小雷达品牌站

本目录是公开品牌页静态站产物，用于补齐 GEO 基建。

当前推荐部署方案：优先使用 `fridge.playgamelab.cn` + 轻量应用服务器 + Caddy 静态站。COS 保留为后续可选镜像/CDN 方案，不作为第一版必选项。

- `/`：品牌首页
- `/privacy/`：公开隐私政策
- `/features/`：功能说明
- `/faq/`：常见问题
- `/geo-case/`：GEO 自证案例
- `robots.txt`、`sitemap.xml`、`llms.txt`：索引与 AI 抓取辅助文件

## 部署前必须替换

1. 确认 `fridge.playgamelab.cn` 的 DNS A 记录指向轻量服务器公网 IP。
2. 如果小程序码更新，替换 `assets/mini-program-code.png`。
3. 将本目录同步到服务器 `/var/www/fridge-radar-site`。
4. 在 Caddy 中添加 `fridge.playgamelab.cn` 静态站点块，并验证 HTTPS。

## 轻量服务器部署边界

仓库只准备静态文件和部署说明，不自动登录服务器、不配置域名解析、不申请 HTTPS 证书、不改 Caddy。

建议线上路径：

- 域名：`fridge.playgamelab.cn`。
- 服务器目录：`/var/www/fridge-radar-site`
- Caddy root：指向上述目录。
- HTTPS：由 Caddy 自动申请和续期。

## COS 备选边界

`cos-upload-manifest.csv` 仍保留，用于未来需要 COS 静态托管或 CDN 镜像时参考。本仓库不自动上传 COS、不配置 COS 域名、不处理备案、不写入访问密钥。
