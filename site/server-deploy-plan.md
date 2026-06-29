# 轻量服务器部署建议

## 最佳方案

第一版优先部署在你已经有的轻量应用服务器上，并使用你已经购买好的域名。当前推荐域名是 `fridge.playgamelab.cn`。

推荐原因：

- 成本最低：已有域名和服务器可以复用，不需要先引入 COS/CDN。
- 控制最简单：静态文件、HTTPS、日志、robots、llms.txt 都在一台服务器上可控。
- GEO 更直接：真实域名下的 `/`、`/privacy/`、`/features/`、`/faq/`、`/geo-case/` 可以被搜索引擎和 AI 抓取。
- 后续可扩展：如果访问量上来，再把 COS/CDN 作为镜像或加速层。

## 推荐域名结构

`playgamelab.cn` 当前已经承载多个子域名服务，冰箱小雷达建议单独使用：

- `fridge.playgamelab.cn`：最贴合产品，适合作为公开品牌站和隐私政策地址。
- `geo.playgamelab.cn/fridge-radar/`：适合未来把多个 GEO 案例放在同一个站点下，但第一版不必增加路径复杂度。

当前建议：优先 `fridge.playgamelab.cn`。

## 推荐服务器结构

```text
/var/www/fridge-radar-site/
  index.html
  privacy/
  features/
  faq/
  geo-case/
  assets/
  robots.txt
  sitemap.xml
  llms.txt
```

## Caddy 配置示例

轻量服务器项目当前使用 Caddy 管理 80/443 和 HTTPS。把以下站点块加入服务器上的 Caddy 配置后，Caddy 会自动申请和续期 HTTPS 证书。

```caddyfile
fridge.playgamelab.cn {
  root * /var/www/fridge-radar-site
  encode gzip
  file_server
}
```

建议上线命令只在人工确认服务器后执行：

```bash
sudo mkdir -p /var/www/fridge-radar-site
sudo rsync -av site/ /var/www/fridge-radar-site/
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## 上线前检查

- 域名解析 A 记录指向轻量服务器公网 IP。
- 服务器防火墙放行 80/443。
- Caddy 已加载 `fridge.playgamelab.cn` 站点块，HTTPS 证书签发成功。
- `site/sitemap.xml` 和 `site/robots.txt` 已使用 `https://fridge.playgamelab.cn`。
- `pages/privacy/privacy.js` 已填入 `https://fridge.playgamelab.cn/privacy/`。
- 如服务器在中国大陆，确认域名备案和接入备案状态。

## 不做

- 不自动登录服务器。
- 不上传访问密钥。
- 不自动修改线上 Caddy 配置。
- 不删除服务器上已有站点。
