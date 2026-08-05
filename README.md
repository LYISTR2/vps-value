# VPS 剩余价值计算器（Cloudflare Workers）

一个可直接部署到 **Cloudflare Workers** 的应用：
- 计算 VPS 套餐剩余价值（按剩余天数，含首尾天）
- 支持月付 / 年付
- 支持实时汇率换算（USD/CNY/HKD/EUR/JPY/SGD）
- 支持近7天人民币/美元汇率走势图
- 现代化深色玻璃拟态 UI（增强版，移动端适配）
- 提供 REST API（`/api/rate`、`/api/rate-history`、`/api/calc`）

---

## 项目结构

```text
.
├── src/
│   ├── index.js      # Worker 入口 + 路由
│   ├── calc.js       # 日期/剩余价值计算（纯函数，可测试）
│   ├── fx.js         # 汇率服务（缓存 + 降级）
│   └── html.js       # 前端页面模板
├── tests/
│   └── calc.test.js  # 计算逻辑单元测试
├── package.json
├── wrangler.toml
└── README.md
```

---

## 计算逻辑说明

```text
总天数 = 开始日期 ~ 到期日期（含首尾）
剩余天数 = 今天 ~ 到期日期（含首尾，最小 0）
剩余比例 = 剩余天数 / 总天数（0~1 截断）
剩余价值 = 总价 × 剩余比例
```

修复与改进点：

1. **时区安全** — 日期解析统一用 `Date.UTC` / 本地时区字符串，避免 UTC 与本地时区混用导致的 ±1 天误差（原版在 UTC 环境部署时会出现）
2. **含首尾天** — 天数计算改为含首尾（`8/1~8/31` = 31 天），更符合套餐计费直觉
3. **比例截断** — 剩余比例钳制在 `[0, 1]`，避免未来套餐算出 >100% 的异常值
4. **参数校验** — 服务端校验 `price >= 0`、日期格式 `YYYY-MM-DD`、到期日必须晚于开始日
5. **币种白名单** — 非法币种直接拒绝，避免请求上游接口

---

## 本地运行

```bash
npm install
npm run dev
```

打开 Wrangler 提示的本地地址即可。测试：

```bash
npm test
```

---

## 部署到 Cloudflare Workers

```bash
npx wrangler login
npm run deploy
```

部署成功后会得到一个 `*.workers.dev` 域名。

---

## REST API

### `GET /api/rate?from=USD&to=CNY`

实时汇率，内存缓存 10 分钟。

```json
{ "ok": true, "from": "USD", "to": "CNY", "rate": 6.762932 }
```

### `GET /api/rate-history?from=USD&to=CNY&days=7`

近 N 天汇率走势（上限 30 天），缓存 1 小时。

```json
{ "ok": true, "from": "USD", "to": "CNY", "points": [ { "date": "2026-08-04", "rate": 6.7535 } ] }
```

### `POST /api/calc`

服务端剩余价值计算（含汇率换算）。

```json
// 请求
{ "price": 100, "startDate": "2026-08-01", "endDate": "2026-08-31", "from": "USD", "to": "CNY" }

// 响应
{ "ok": true, "totalDays": 31, "leftDays": 27, "ratio": 0.8709, "value": 87.10, "from": "USD", "to": "CNY", "rate": 6.7629, "converted": 589.03 }
```

---

## License

MIT
