/**
 * 前端页面 HTML 模板
 * 所有 CSS/JS 内联，单文件 Workers 友好
 */

export function html() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>VPS 剩余价值计算器</title>
  <style>
    :root {
      --bg: #0b1020;
      --panel: rgba(255,255,255,0.08);
      --line: rgba(255,255,255,0.14);
      --text: #e9eeff;
      --muted: #a9b3d6;
      --brand: #8b7bff;
      --brand2: #43d1ff;
      --ok: #27d79a;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: Inter, ui-sans-serif, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      color: var(--text);
      background:
        radial-gradient(1000px 500px at 10% -10%, rgba(139,123,255,.35), transparent 60%),
        radial-gradient(900px 500px at 100% 0%, rgba(67,209,255,.22), transparent 55%),
        linear-gradient(160deg, #0b1020 0%, #111933 45%, #0a1228 100%);
      display: grid;
      place-items: center;
      padding: 30px;
    }
    .wrap {
      width: 100%;
      max-width: 1200px;
      display: grid;
      grid-template-columns: 1.15fr .85fr;
      gap: 22px;
    }
    .card {
      background: linear-gradient(180deg, rgba(255,255,255,0.10), rgba(255,255,255,0.06));
      border: 1px solid rgba(255,255,255,0.18);
      border-radius: 22px;
      backdrop-filter: blur(14px);
      -webkit-backdrop-filter: blur(14px);
      box-shadow: 0 24px 70px rgba(0,0,0,.38), inset 0 1px 0 rgba(255,255,255,.15);
    }
    .left { padding: 30px; }
    .right { padding: 30px; }
    h1 {
      margin: 0 0 10px;
      font-size: 34px;
      letter-spacing: .2px;
      background: linear-gradient(90deg, #d9e1ff, #9be5ff 60%, #cabfff);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .sub { margin: 0 0 22px; color: var(--muted); font-size: 16px; }
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
    }
    .field { display: flex; flex-direction: column; gap: 6px; }
    .field.full { grid-column: 1 / -1; }
    label { color: var(--muted); font-size: 14px; }
    input, select {
      width: 100%;
      border: 1px solid var(--line);
      background: rgba(11,16,32,.5);
      color: var(--text);
      border-radius: 14px;
      padding: 13px 14px;
      font-size: 16px;
      outline: none;
    }
    input:focus, select:focus { border-color: #7fdfff; box-shadow: 0 0 0 3px rgba(127,223,255,.18); }
    .actions {
      margin-top: 14px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }
    button {
      border: none;
      border-radius: 12px;
      padding: 12px 18px;
      color: #fff;
      cursor: pointer;
      font-weight: 700;
      font-size: 15px;
      background: linear-gradient(135deg, var(--brand), var(--brand2));
      box-shadow: 0 8px 24px rgba(88,133,255,.35);
    }
    .ghost {
      background: rgba(255,255,255,.08);
      border: 1px solid var(--line);
      box-shadow: none;
    }
    .kpis {
      display: grid;
      gap: 12px;
    }
    .kpi {
      border: 1px solid rgba(255,255,255,0.16);
      border-radius: 16px;
      padding: 14px;
      background: linear-gradient(180deg, rgba(11,16,32,.55), rgba(11,16,32,.35));
    }
    .kpi .name { color: var(--muted); font-size: 13px; }
    .kpi .value { margin-top: 8px; font-size: 34px; font-weight: 800; }
    .kpi .hint { margin-top: 6px; font-size: 13px; color: var(--muted); }
    .ok { color: var(--ok); }
    .meta {
      margin-top: 10px;
      font-size: 12px;
      color: var(--muted);
      line-height: 1.7;
      border-top: 1px dashed var(--line);
      padding-top: 10px;
    }
    @media (max-width: 860px) {
      body { padding: 12px; }
      .wrap { grid-template-columns: 1fr; gap: 12px; }
      .left, .right { padding: 16px; }
      h1 { font-size: 26px; }
      .sub { font-size: 14px; margin-bottom: 14px; }
      .grid { grid-template-columns: 1fr; gap: 10px; }
      input, select { font-size: 16px; padding: 12px; }
      .actions { display: grid; grid-template-columns: 1fr 1fr; }
      button { width: 100%; padding: 12px; font-size: 14px; }
      .kpi .value { font-size: 30px; }
      .meta { font-size: 12px; }
    }
    .err { color: #ff6b6b; font-size: 13px; margin-top: 6px; }
  </style>
</head>
<body>
  <main class="wrap">
    <section class="card left">
      <h1>VPS 剩余价值计算器</h1>
      <p class="sub">支持月付/年付，按剩余天数计算残值，并实时换算到目标货币。</p>
      <div class="grid">
        <div class="field">
          <label>总价（原币种）</label>
          <input id="price" type="number" min="0" step="0.01" value="0" />
        </div>
        <div class="field">
          <label>计费周期</label>
          <select id="cycle">
            <option value="monthly" selected>月付（按当月天数）</option>
            <option value="yearly">年付（按区间天数）</option>
          </select>
        </div>

        <div class="field">
          <label>开始日期</label>
          <input id="startDate" type="date" />
        </div>
        <div class="field">
          <label>到期日期</label>
          <input id="endDate" type="date" />
        </div>

        <div class="field">
          <label>原币种</label>
          <select id="from">
            <option selected>USD</option><option>EUR</option><option>HKD</option><option>CNY</option><option>JPY</option><option>SGD</option>
          </select>
        </div>
        <div class="field">
          <label>目标币种</label>
          <select id="to">
            <option selected>USD</option><option>CNY</option><option>HKD</option><option>EUR</option><option>JPY</option><option>SGD</option>
          </select>
        </div>

        <div class="field full">
          <label>备注（可选）</label>
          <input id="note" type="text" placeholder="例如：RackNerd 2C2G，东京机房" />
        </div>
      </div>
      <div class="actions">
        <button id="calc">计算剩余价值</button>
      </div>
    </section>

    <aside class="card right">
      <div class="kpis">
        <div class="kpi">
          <div class="name">剩余天数</div>
          <div class="value" id="daysLeft">--</div>
          <div class="hint" id="daysHint">按你填写的到期日自动计算</div>
        </div>
        <div class="kpi">
          <div class="name">原币种剩余价值</div>
          <div class="value" id="valueFrom">--</div>
          <div class="hint" id="ratioHint">--</div>
        </div>
        <div class="kpi">
          <div class="name">目标币种剩余价值</div>
          <div class="value ok" id="valueTo">--</div>
          <div class="hint" id="fxHint">实时汇率加载中...</div>
        </div>
        <div class="kpi">
          <div class="name">人民币价值</div>
          <div class="value" id="valueCny">--</div>
          <div class="hint" id="cnyHint">无论选什么币种，都换算成人民币</div>
        </div>
      </div>
      <div class="kpi" style="margin-top:12px;">
        <div class="name">人民币 / 美元 比率（最近7天）</div>
        <svg id="fxChart" viewBox="0 0 300 120" style="width:100%;height:auto;margin-top:8px;"></svg>
        <div class="hint" id="fxChartHint">加载中...</div>
      </div>
      <div class="meta" id="meta"></div>
    </aside>
  </main>

  <script>
    // ========== 工具函数 ==========
    const $ = (id) => document.getElementById(id);
    const ESC = { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' };
    const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ESC[c]);

    // 本地日期 YYYY-MM-DD（避免 UTC 时区偏差）
    function localDateStr(d) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return y + '-' + m + '-' + day;
    }

    // 天数差，含首尾（Date.UTC 解析，避免时区干扰）
    function daysBetween(a, b) {
      const [ay, am, ad] = a.split('-').map(Number);
      const [by, bm, bd] = b.split('-').map(Number);
      const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
      if (ms < 0) return 0;
      return Math.floor(ms / 86400000) + 1; // 含首尾
    }

    // 今天（本地时区）
    const todayStr = localDateStr(new Date());

    // ========== 汇率缓存 ==========
    let chartCache = { key: '', ts: 0, points: null };

    async function getRate(from, to) {
      if (from === to) return 1;
      const res = await fetch('/api/rate?from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to));
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || '汇率获取失败');
      return data.rate;
    }

    function drawFxChart(points) {
      const svg = $('fxChart');
      const hint = $('fxChartHint');
      const rates = points.map((p) => p.rate);
      const min = Math.min(...rates);
      const max = Math.max(...rates);
      const pad = (max - min) * 0.2 || 0.01;
      const ymin = min - pad;
      const ymax = max + pad;
      const w = 300, h = 120;
      const x = (i) => (i / (points.length - 1)) * (w - 20) + 10;
      const y = (v) => h - ((v - ymin) / (ymax - ymin)) * (h - 20) - 10;
      const d = points.map((p, i) => (i === 0 ? 'M' : 'L') + x(i).toFixed(2) + ' ' + y(p.rate).toFixed(2)).join(' ');

      svg.innerHTML =
        '<defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stop-color="#8b7bff"/><stop offset="100%" stop-color="#43d1ff"/></linearGradient></defs>' +
        '<path d="' + d + '" fill="none" stroke="url(#g)" stroke-width="3" stroke-linecap="round"/>';

      hint.textContent = '近7天: 最低 ' + min.toFixed(4) + ' · 最高 ' + max.toFixed(4) + '（1 USD -> CNY）';
    }

    async function renderFxChart() {
      const svg = $('fxChart');
      const hint = $('fxChartHint');
      const key = 'USD->CNY:7';
      const now = Date.now();
      if (chartCache.key === key && chartCache.points && (now - chartCache.ts) < 5 * 60 * 1000) {
        drawFxChart(chartCache.points);
        return;
      }

      svg.innerHTML = '';
      hint.textContent = '加载中...';
      try {
        const res = await fetch('/api/rate-history?from=USD&to=CNY&days=7');
        const data = await res.json();
        if (!res.ok || !data.ok || !data.points || data.points.length < 2) {
          hint.textContent = '暂无走势图数据';
          return;
        }
        chartCache = { key, ts: now, points: data.points };
        drawFxChart(data.points);
      } catch (e) {
        hint.textContent = '走势图加载失败';
      }
    }

    // ========== 主计算 ==========
    async function calculate() {
      const price = Number($('price').value || 0);
      const cycle = $('cycle').value;
      const from = $('from').value;
      const to = $('to').value;
      const startDate = $('startDate').value;
      const endDate = $('endDate').value;
      const note = $('note').value.trim();

      if (Number.isNaN(price) || price < 0 || !startDate || !endDate) {
        alert('请先填写有效总价、开始日期、到期日期');
        return;
      }

      if (endDate <= startDate) {
        alert('到期日期必须晚于开始日期');
        return;
      }

      // 使用含首尾的天数计算
      const totalDays = daysBetween(startDate, endDate);
      const leftDays = daysBetween(todayStr, endDate);
      const ratio = Math.min(1, leftDays / totalDays);
      const valueFrom = price * ratio;

      $('daysLeft').textContent = leftDays.toString();
      $('daysHint').textContent = '总套餐 ' + totalDays + ' 天 · 剩余 ' + ratio.toFixed(2) + '%';
      $('valueFrom').textContent = valueFrom.toFixed(2) + ' ' + from;
      $('ratioHint').textContent = '剩余比例 ' + (ratio * 100).toFixed(2) + '%（' + leftDays + '/' + totalDays + ' 天）';

      // 并行：汇率换算 + 走势图
      const chartTask = renderFxChart();
      try {
        // 目标币种换算
        const rate = await getRate(from, to);
        const converted = valueFrom * rate;
        $('valueTo').textContent = converted.toFixed(2) + ' ' + to;
        $('fxHint').textContent = (from === to) ? '' : ('1 ' + from + ' = ' + rate.toFixed(6) + ' ' + to);

        // 人民币换算（无论目标币种）
        const cnyRate = from === 'CNY' ? 1 : await getRate(from, 'CNY');
        $('valueCny').textContent = (valueFrom * cnyRate).toFixed(2) + ' CNY';
        $('cnyHint').textContent = from === 'CNY' ? '原币种即人民币' : ('1 ' + from + ' = ' + cnyRate.toFixed(6) + ' CNY');
      } catch (e) {
        $('valueTo').textContent = '--';
        $('fxHint').textContent = '汇率失败：' + (e && e.message ? e.message : '未知错误');
        $('valueCny').textContent = '--';
        $('cnyHint').textContent = '人民币汇率获取失败';
      }

      $('meta').innerHTML =
        '<div>周期：' + (cycle === 'yearly' ? '年付' : '月付') + '</div>' +
        '<div>区间：' + esc(startDate) + ' ~ ' + esc(endDate) + '</div>' +
        (note ? ('<div>备注：' + esc(note) + '</div>') : '');

      await chartTask;
    }

    // ========== 事件绑定 ==========
    $('calc').addEventListener('click', calculate);
    $('from').addEventListener('change', calculate);
    $('to').addEventListener('change', calculate);

    // ========== 初始化 ==========
    (function init() {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
      $('price').value = 0;
      $('cycle').value = 'monthly';
      $('startDate').value = localDateStr(start);
      $('endDate').value = localDateStr(end);
      calculate();
    })();
  </script>
</body>
</html>`;
}