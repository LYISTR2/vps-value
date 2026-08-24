export function html() {
  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="color-scheme" content="dark">
<title>服务器剩余价值计算器</title>
<style>
:root{--bg:#050505;--panel:#0b0b0b;--line:#303030;--text:#f5f5f5;--muted:#929292;--dim:#5c5c5c;--ok:#fff;--bad:#ff6b6b;--shadow:#000}
*{box-sizing:border-box}html{background:var(--bg)}body{margin:0;min-height:100vh;color:var(--text);background:radial-gradient(circle at 50% -20%,#1b1b1b 0,transparent 40%),repeating-linear-gradient(0deg,rgba(255,255,255,.018) 0,rgba(255,255,255,.018) 1px,transparent 1px,transparent 4px),var(--bg);font:14px/1.55 ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,"Liberation Mono","Microsoft YaHei",monospace;padding:24px}
.shell{width:min(1120px,100%);margin:auto;border:1px solid #444;background:rgba(5,5,5,.95);box-shadow:0 28px 90px #000;border-radius:8px;overflow:hidden}.titlebar{height:42px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid var(--line);background:#111}.lights{display:flex;gap:7px}.lights i{width:9px;height:9px;border:1px solid #777;border-radius:50%;display:block}.hostname{color:var(--muted);font-size:12px}.layout{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(320px,.95fr)}.pane{padding:24px}.pane+.pane{border-left:1px solid var(--line)}
.prompt{color:var(--muted);margin-bottom:8px}.prompt b{color:var(--text)}h1{font-size:clamp(25px,4vw,42px);line-height:1.08;margin:0 0 8px;letter-spacing:-.04em}.subtitle{color:var(--muted);margin:0 0 28px}.block-title{display:flex;align-items:center;gap:9px;margin:20px 0 12px;color:#d6d6d6}.block-title:after{content:"";height:1px;background:var(--line);flex:1}.fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field{min-width:0}.field.full{grid-column:1/-1}label{display:block;color:var(--muted);font-size:12px;margin:0 0 6px;text-transform:uppercase;letter-spacing:.08em}input,select{width:100%;height:44px;border:1px solid #383838;border-radius:4px;background:#090909;color:#fff;padding:0 12px;font:inherit;outline:none}input:focus,select:focus{border-color:#fff;box-shadow:0 0 0 1px #fff}.run{margin-top:18px;width:100%;height:46px;border:1px solid #fff;border-radius:4px;background:#fff;color:#000;font:700 14px ui-monospace,monospace;cursor:pointer}.run:hover{background:#d8d8d8}.run:disabled{opacity:.45;cursor:wait}.status{min-height:22px;margin-top:10px;color:var(--muted)}.status.error{color:var(--bad)}
.output-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:18px}.badge{border:1px solid #555;padding:4px 8px;border-radius:99px;font-size:11px;color:#bbb}.badge.online{color:#fff;border-color:#fff}.terminal{border:1px solid var(--line);border-radius:5px;background:#070707;overflow:hidden}.line{display:grid;grid-template-columns:1fr auto;gap:16px;padding:14px 15px;border-bottom:1px dashed #272727}.line:last-child{border-bottom:0}.key{color:var(--muted)}.val{text-align:right;font-weight:700}.val.major{font-size:22px}.chart-box{margin-top:18px;border:1px solid var(--line);border-radius:5px;padding:14px;background:#070707}.chart-top{display:flex;justify-content:space-between;color:var(--muted);font-size:12px}.chart{width:100%;height:118px;margin-top:8px}.chart .gridline{stroke:#242424;stroke-width:1}.chart .path{fill:none;stroke:#fff;stroke-width:2}.chart .dot{fill:#050505;stroke:#fff;stroke-width:2}.chart-note{color:var(--dim);font-size:11px;margin-top:5px}.log{margin-top:18px;color:#8b8b8b;font-size:12px;white-space:pre-wrap}.cursor:after{content:"_";animation:blink 1s steps(1) infinite}@keyframes blink{50%{opacity:0}}
footer{border-top:1px solid var(--line);padding:11px 16px;color:var(--dim);font-size:11px;display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap}
@media(max-width:820px){body{padding:8px}.layout{grid-template-columns:1fr}.pane{padding:18px}.pane+.pane{border-left:0;border-top:1px solid var(--line)}.fields{grid-template-columns:1fr}.field.full{grid-column:auto}.titlebar{padding:0 12px}.hostname{max-width:70%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
@media(prefers-reduced-motion:reduce){.cursor:after{animation:none}}
</style>
</head>
<body>
<main class="shell">
  <header class="titlebar"><span class="lights"><i></i><i></i><i></i></span><span class="hostname">服务器剩余价值计算器</span></header>
  <div class="layout">
    <section class="pane">
      <div class="prompt"><b>价值计算终端</b>:~$ 启动交互计算</div>
      <h1>服务器剩余价值</h1>
      <p class="subtitle">按实际服务周期计算服务器剩余价值，并换算实时汇率。</p>
      <div class="block-title">[ 输入 ]</div>
      <form id="form">
        <div class="fields">
          <div class="field"><label for="price">总价</label><input id="price" type="number" min="0" step="0.01" value="0" required></div>
          <div class="field"><label for="cycle">付款周期</label><select id="cycle"><option value="monthly">月付</option><option value="yearly">年付</option><option value="custom">自定义</option></select></div>
          <div class="field"><label for="startDate">开始日期</label><input id="startDate" type="date" required></div>
          <div class="field"><label for="endDate">到期日期</label><input id="endDate" type="date" required></div>
          <div class="field"><label for="from">原始币种</label><select id="from"><option value="USD">USD（美元）</option><option value="CNY">CNY（人民币）</option><option value="HKD">HKD（港币）</option><option value="EUR">EUR（欧元）</option><option value="JPY">JPY（日元）</option><option value="SGD">SGD（新加坡元）</option></select></div>
          <div class="field"><label for="to">目标币种</label><select id="to"><option value="USD">USD（美元）</option><option value="CNY">CNY（人民币）</option><option value="HKD">HKD（港币）</option><option value="EUR">EUR（欧元）</option><option value="JPY">JPY（日元）</option><option value="SGD">SGD（新加坡元）</option></select></div>
          <div class="field full"><label for="note">备注（仅本地显示）</label><input id="note" maxlength="120" placeholder="例如：东京机房 / 2核2G / 月付"></div>
        </div>
        <button class="run" id="run" type="submit">[ 回车 ] 开始计算</button>
        <div class="status" id="status" role="status" aria-live="polite"></div>
      </form>
    </section>
    <section class="pane">
      <div class="output-head"><span>[ 输出 ]</span><span class="badge" id="health">检测中</span></div>
      <div class="terminal">
        <div class="line"><span class="key">总服务天数</span><span class="val" id="totalDays">--</span></div>
        <div class="line"><span class="key">剩余天数</span><span class="val major" id="leftDays">--</span></div>
        <div class="line"><span class="key">剩余比例</span><span class="val" id="ratio">--</span></div>
        <div class="line"><span class="key">原币种剩余价值</span><span class="val major" id="sourceValue">--</span></div>
        <div class="line"><span class="key">目标币种剩余价值</span><span class="val major" id="targetValue">--</span></div>
        <div class="line"><span class="key">人民币剩余价值</span><span class="val" id="cnyValue">--</span></div>
        <div class="line"><span class="key">当前汇率</span><span class="val" id="rate">--</span></div>
      </div>
      <div class="chart-box">
        <div class="chart-top"><span>美元兑人民币近期走势</span><span id="range">--</span></div>
        <svg class="chart" id="chart" viewBox="0 0 320 118" aria-label="美元兑人民币近期汇率趋势"></svg>
        <div class="chart-note" id="chartNote">正在加载历史汇率...</div>
      </div>
      <div class="log cursor" id="log">等待输入</div>
    </section>
  </div>
  <footer><span>版本 2.1.0 / 支持云端与自部署</span><span>计算口径：自然日，首尾两天均计入</span></footer>
</main>
<script>
const $=id=>document.getElementById(id);
function localDate(d){return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')}
function money(value,currency){try{return new Intl.NumberFormat('zh-CN',{minimumFractionDigits:2,maximumFractionDigits:2}).format(value)+' '+currency}catch{return Number(value).toFixed(2)+' '+currency}}
async function api(path,options){const res=await fetch(path,options);let data;try{data=await res.json()}catch{throw new Error('服务器返回的数据格式无效')}if(!res.ok||!data.ok)throw new Error(data.error||('请求失败，状态码 '+res.status));return data}
function setStatus(text,error=false){$('status').textContent=text;$('status').className='status'+(error?' error':'')}
function setLog(lines){$('log').textContent=lines.join('\\n')}
function cycleName(value){return value==='monthly'?'月付':value==='yearly'?'年付':'自定义'}
function rateSourceName(value){return value==='identity'?'相同币种':value==='open.er-api.com'?'实时汇率接口':value||'未知'}
async function health(){try{await api('/api/health');$('health').textContent='在线';$('health').className='badge online'}catch{$('health').textContent='离线';$('health').className='badge'}}
function draw(points){const svg=$('chart');if(!points||points.length<2){svg.innerHTML='';$('chartNote').textContent='历史汇率数据不足';return}const rates=points.map(p=>p.rate),min=Math.min(...rates),max=Math.max(...rates),spread=max-min||.01,pad=spread*.18,w=320,h=118;const x=i=>12+i*(w-24)/(points.length-1),y=v=>h-12-(v-(min-pad))*(h-24)/(spread+pad*2);const grid=[.25,.5,.75].map(n=>'<line class="gridline" x1="8" y1="'+(h*n)+'" x2="312" y2="'+(h*n)+'"/>').join('');const d=points.map((p,i)=>(i?'L':'M')+x(i).toFixed(1)+' '+y(p.rate).toFixed(1)).join(' ');const dots=points.map((p,i)=>'<circle class="dot" cx="'+x(i).toFixed(1)+'" cy="'+y(p.rate).toFixed(1)+'" r="2.5"/>').join('');svg.innerHTML=grid+'<path class="path" d="'+d+'"/>'+dots;$('range').textContent=min.toFixed(4)+'..'+max.toFixed(4);$('chartNote').textContent=points[0].date+' 至 '+points[points.length-1].date+' / 共 '+points.length+' 个交易日'}
async function loadChart(){try{const d=await api('/api/rate-history?from=USD&to=CNY&days=7');draw(d.points)}catch(e){$('chartNote').textContent='历史汇率加载失败：'+e.message}}
async function calculate(event){event&&event.preventDefault();const run=$('run');run.disabled=true;setStatus('正在计算，请稍候...');const body={price:Number($('price').value),startDate:$('startDate').value,endDate:$('endDate').value,cycle:$('cycle').value,from:$('from').value,to:$('to').value,asOf:localDate(new Date())};try{const [d,cny]=await Promise.all([api('/api/calc',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}),body.from==='CNY'?Promise.resolve({rate:1}):api('/api/rate?from='+body.from+'&to=CNY')]);$('totalDays').textContent=d.totalDays;$('leftDays').textContent=d.leftDays;$('ratio').textContent=(d.ratio*100).toFixed(2)+'%';$('sourceValue').textContent=money(d.value,d.from);$('targetValue').textContent=money(d.converted,d.to);$('cnyValue').textContent=money(d.value*cny.rate,'CNY');$('rate').textContent=d.from===d.to?'相同币种，无需换算':('1 '+d.from+' = '+Number(d.rate).toFixed(6)+' '+d.to);setStatus('计算完成。');setLog(['$ 计算结果摘要','付款周期：'+cycleName(d.cycle),'计算日期：'+body.asOf,'服务区间：'+body.startDate+' 至 '+body.endDate,'备注：'+($('note').value.trim()||'无'),'汇率来源：'+rateSourceName(d.rateSource)])}catch(e){setStatus(e.message,true);setLog(['$ 计算失败','错误：'+e.message])}finally{run.disabled=false}}
$('form').addEventListener('submit',calculate);$('from').addEventListener('change',calculate);$('to').addEventListener('change',calculate);
(()=>{const now=new Date(),end=new Date(now.getFullYear(),now.getMonth()+1,now.getDate());$('startDate').value=localDate(now);$('endDate').value=localDate(end);health();loadChart();calculate()})();
</script>
</body></html>`;
}
