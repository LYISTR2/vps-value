# VPS_VALUE — VPS 剩余价值计算器

一个同时支持 **Cloudflare Workers** 与 **VPS Docker 自部署** 的剩余价值计算器。

- 严格日期校验，按实际服务区间的自然日计算（含首尾）
- 实时汇率换算：USD / CNY / HKD / EUR / JPY / SGD / CAD / GBP
- 所选币种对的近期市场日趋势图
- 黑白命令行风格响应式 UI
- REST API 与健康检查
- Docker 非 root、只读文件系统、无额外 Linux capability

## 计算口径

```text
总天数   = 开始日期 ~ 到期日期（含首尾）
剩余天数 = clamp(今天 ~ 到期日期的天数（含首尾）, 0, 总天数)
剩余比例 = clamp(剩余天数 / 总天数, 0, 1)
剩余价值 = 总价 × 剩余比例
```

`monthly / yearly / custom` 是套餐周期标签，实际价值始终按用户填写的真实起止日期计算。开始日期与到期日期相同表示一天套餐；尚未开始的套餐，其剩余天数等于总服务天数。日期必须是字符串，年份范围为 0001–9999。

## VPS 一键部署

适用于 Debian / Ubuntu，以及已安装 Docker Compose 的其他 Linux。

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/LYISTR2/vps-value/main/deploy.sh)
```

默认端口为 `8088`，自定义端口：

```bash
PORT=9000 bash <(curl -fsSL https://raw.githubusercontent.com/LYISTR2/vps-value/main/deploy.sh)
```

管理命令：

```bash
# 更新到 GitHub main 最新版本
bash <(curl -fsSL https://raw.githubusercontent.com/LYISTR2/vps-value/main/deploy.sh) update

# 查看状态
bash <(curl -fsSL https://raw.githubusercontent.com/LYISTR2/vps-value/main/deploy.sh) status

# 查看日志
bash <(curl -fsSL https://raw.githubusercontent.com/LYISTR2/vps-value/main/deploy.sh) logs

# 卸载应用容器（保留安装目录、配置和 Docker）
bash <(curl -fsSL https://raw.githubusercontent.com/LYISTR2/vps-value/main/deploy.sh) uninstall
```

安装位置默认是 `/opt/vps-value`，可通过 `VPS_VALUE_DIR` 修改。必须使用独立的绝对路径；拒绝系统目录、符号链接和非本项目的非空目录。更新覆盖项目文件，但保留额外文件和 `.env` 中其他设置。卸载只移除应用容器，保留目录供备份或人工清理。端口范围为 1–65535。

## Docker Compose 手动部署

```bash
git clone https://github.com/LYISTR2/vps-value.git
cd vps-value
PORT=8088 docker compose up -d --build
curl http://127.0.0.1:8088/api/health
```

## Cloudflare Workers 部署

```bash
npm ci
npx wrangler login
npm run deploy
```

## 本地开发

```bash
npm ci
npm test
npm run dev
```

原生 Node 运行：

```bash
PORT=8080 npm start
```

## API

### `GET /api/health`

```json
{ "ok": true, "service": "vps-value", "version": "2.1.0" }
```

### `GET /api/rate?from=USD&to=CNY`

```json
{ "ok": true, "from": "USD", "to": "CNY", "rate": 6.72, "source": "open.er-api.com" }
```

### `GET /api/rate-history?from=USD&to=CNY&days=7`

`days` 必须为 3–30 的整数。外汇市场周末通常没有数据，因此点数可能少于自然日天数。

### `POST /api/calc`

```json
{
  "price": 100,
  "startDate": "2026-08-01",
  "endDate": "2026-08-31",
  "asOf": "2026-08-24",
  "cycle": "monthly",
  "from": "USD",
  "to": "CNY"
}
```

`asOf` 可选，用于明确“今天”的日历日期。页面会传入浏览器本地日期，避免 Cloudflare Workers 的 UTC 日期与用户所在时区在午夜附近不一致。省略时使用运行环境的当天日期，并在响应的 `asOf` 中返回实际采用的日期。

请求必须使用 `Content-Type: application/json`，顶层为对象，请求体最多 16 KiB（包括分块传输）。换算结果溢出时返回参数错误。

错误约定：

- 参数错误：HTTP 400 JSON
- 请求体超限：HTTP 413 JSON
- 方法错误：HTTP 405 JSON + `Allow`
- 未知 API：HTTP 404 JSON
- 汇率上游失败、超时或数据异常：HTTP 502 JSON，不会静默使用 1:1

汇率上游超时为 8 秒；实时汇率按基础币种缓存 10 分钟，历史汇率按币种对、天数和 UTC 日期缓存 1 小时（最多 128 项），同一运行实例内的相同并发请求会合并。仅接受正的有限汇率；历史点限制在请求日期区间内。同币种接口不请求上游，`source` 为 `identity`。页面中的人民币参考值加载失败不会清除主计算结果。

## 项目结构

```text
src/index.js       Worker 入口和 API 路由
src/calc.js        严格日期及价值计算
src/fx.js          汇率服务、超时和并发缓存
src/http.js        请求体读取、大小限制和请求错误
src/html.js        黑白终端风格页面
server.js          VPS 原生 Node HTTP 适配器
Dockerfile         非 root 生产镜像
docker-compose.yml VPS 部署编排
deploy.sh          一键安装/更新/管理脚本
tests/             计算、API、HTTP、前端竞态及部署回归测试
```

## License

MIT
