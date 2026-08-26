from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ACADEMY = ROOT / "academy"
TOOLS = ACADEMY / "tools"
ARTICLES = ROOT / "articles" / "investment"


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text.strip() + "\n", encoding="utf-8")


ACADEMY_CSS_APPEND = r'''

/* Quant research upgrade: shared, compact, accessible finance surfaces */
.quant-page{background:var(--soft)}
.quant-page .tool-page{padding:0 20px 50px}
.quant-page .tool-layout{align-items:start}
.quant-page .panel,.quant-page .result{padding:26px}
.quant-page .panel p{color:var(--muted)}
.quant-page .panel textarea{min-height:154px;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:14px;line-height:1.55}
.quant-page .calc{margin-top:20px}
.quant-page .status{min-height:24px;margin:12px 0 0;color:var(--muted);font-size:13px}
.quant-page .status.ok{color:#087f5b}.quant-page .status.error{color:#c2410c}
.quant-page .formula-note{background:var(--soft);border:1px solid var(--line);border-radius:12px;padding:14px 16px;color:var(--muted);font-size:13px;margin-top:18px}
.quant-page .formula-note strong{color:var(--ink)}
.quant-page .metric-grid{grid-template-columns:repeat(4,minmax(0,1fr));margin:20px 0}
.quant-page .metric-grid .metric{min-width:0}
.quant-page .metric-grid .metric b{overflow-wrap:anywhere}
.quant-page .visual{background:var(--soft);border:1px solid var(--line);border-radius:14px;padding:16px;margin-top:20px}
.quant-page .visual h3{font-size:16px;margin:0 0 12px}
.quant-page .bar-chart{height:170px;display:flex;align-items:end;gap:4px;border-bottom:1px solid var(--line);padding:8px 2px 0;overflow:hidden}
.quant-page .bar-chart i{display:block;flex:1;min-width:3px;background:linear-gradient(180deg,var(--blue),var(--teal));border-radius:4px 4px 0 0;opacity:.9}
.quant-page .bar-chart i.alert{background:linear-gradient(180deg,#ef8354,#c2410c)}
.quant-page .axis{display:flex;justify-content:space-between;color:var(--muted);font-size:11px;margin-top:8px}
.quant-page .source-box{margin-top:20px;border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:13px}
.quant-page .source-box a{color:var(--blue);font-weight:800;text-decoration:underline}
.quant-page .tool-crumb{display:flex;justify-content:space-between;gap:16px;align-items:center;margin-bottom:24px;color:var(--muted);font-size:14px}
.quant-page .tool-crumb a{color:var(--blue);font-weight:800}
.quant-page .badge-row{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 18px}
.quant-page .badge-row span{border:1px solid var(--line);border-radius:99px;padding:4px 9px;color:var(--muted);font-size:12px;font-weight:800}
.quant-page .article-jump{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0 24px}
.quant-page .article-jump a{padding:8px 11px;border:1px solid var(--line);border-radius:9px;color:var(--blue);font-size:13px;font-weight:800}
@media(max-width:850px){.quant-page .tool-page{padding:0 14px 36px}.quant-page .tool-layout{grid-template-columns:1fr}.quant-page .metric-grid{grid-template-columns:1fr 1fr}.quant-page .tool-crumb{align-items:flex-start;flex-direction:column;gap:6px}}
@media(max-width:430px){.quant-page .panel,.quant-page .result{padding:18px}.quant-page .metric-grid{gap:8px}.quant-page .metric{padding:12px}.quant-page .metric-grid .metric b{font-size:20px}.quant-page .bar-chart{height:145px}}
'''

VOLATILITY_TOOL = r'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>波動度 Z-Score 研究工具｜GugoPro Academy</title>
<meta name="description" content="以你查證的歷史日報酬計算滾動波動度、波動 Z-Score 與壓力狀態；純前端、透明公式、不填假行情。">
<link rel="canonical" href="https://academy.gugopro.com/tools/volatility-zscore.html">
<link rel="stylesheet" href="../academy.css">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"波動度 Z-Score 研究工具","applicationCategory":"FinanceApplication","operatingSystem":"Web","description":"以使用者查證的歷史報酬計算滾動波動度與 Z-Score。","url":"https://academy.gugopro.com/tools/volatility-zscore.html"}</script>
</head>
<body class="quant-page">
<main class="tool-page">
<div class="tool-crumb"><a href="../">← 回到 GugoPro Academy</a><span>量化研究 · 純前端 · 不自動填入行情</span></div>
<div class="tool-layout">
<section class="panel"><div class="eyebrow">Quant lab · Volatility</div><h1>波動度 Z-Score</h1><p>把你已查證的日報酬貼入瀏覽器，觀察目前滾動波動度相對於自身歷史分布的位置。這是研究分類器，不是買賣訊號。</p>
<div class="badge-row"><span>Rolling σ</span><span>Z-Score</span><span>Client-side</span></div>
<label for="returns">歷史日報酬（%），逗號或換行分隔</label><textarea id="returns" placeholder="例：-1.2, 0.4, 0.8 ...；請貼入自己的查證資料，頁面不預填行情"></textarea>
<label for="window">滾動窗口（交易日）</label><input id="window" type="number" min="5" max="252" step="1" value="20">
<label for="annualize">年化倍數</label><select id="annualize"><option value="1">不年化：日波動</option><option value="15.8745">年化：√252</option></select>
<button class="calc" id="calc" type="button">計算波動 Z-Score</button><div class="status" id="status" aria-live="polite">請貼入至少 25 筆日報酬後開始。</div>
<div class="formula-note"><strong>公式：</strong>滾動 σ＝窗口報酬的樣本標準差；Z＝（目前滾動 σ−所有滾動 σ 平均）÷所有滾動 σ 標準差。樣本不足或波動沒有變化時，工具會保留可見錯誤，不產生虛構 Z 值。</div></section>
<section class="result"><div class="eyebrow">Regime lens</div><h2>波動分布位置</h2><div class="result-big" id="zscore">—</div><div class="sub" id="regime">等待有效輸入</div>
<div class="metric-grid"><div class="metric"><span class="sub">目前滾動波動</span><b id="current">—</b></div><div class="metric"><span class="sub">基準平均</span><b id="mean">—</b></div><div class="metric"><span class="sub">樣本筆數</span><b id="count">—</b></div><div class="metric"><span class="sub">滾動窗口數</span><b id="rolls">—</b></div></div>
<div class="visual"><h3>滾動波動度序列</h3><div class="bar-chart" id="chart" aria-label="滾動波動度圖表"></div><div class="axis"><span>較早觀測</span><span>最新觀測</span></div></div>
<div class="source-box"><strong>資料與限制：</strong>輸入資料只存在目前瀏覽器頁面；請註明價格是否為 adjusted close、報酬頻率與樣本期間。Z-Score 只描述相對位置，不代表波動方向、未來報酬或風險上限。</div></section>
</div></main>
<script src="../academy.js"></script>
<script>
const $=id=>document.getElementById(id);
const fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
function parseReturns(){return $('returns').value.split(/[\\s,，;；]+/).map(Number).filter(Number.isFinite)}
function setStatus(text,kind=''){const el=$('status');el.textContent=text;el.className='status '+kind}
function calc(){const data=parseReturns(),w=Math.floor(+$('window').value),factor=+$('annualize').value;if(data.length<w+4||w<5){setStatus('資料不足：至少需要窗口 + 4 筆日報酬，請貼入實際查證序列。','error');return}
const rolls=[];for(let i=w-1;i<data.length;i++){const s=data.slice(i-w+1,i+1),m=s.reduce((a,b)=>a+b,0)/s.length,sd=Math.sqrt(s.reduce((a,b)=>a+(b-m)**2,0)/(s.length-1));rolls.push(sd*factor)}
const mean=rolls.reduce((a,b)=>a+b,0)/rolls.length,sd=Math.sqrt(rolls.reduce((a,b)=>a+(b-mean)**2,0)/Math.max(1,rolls.length-1)),cur=rolls.at(-1),z=sd?((cur-mean)/sd):0;
$('zscore').textContent=fmt(z,2)+' Z';$('current').textContent=fmt(cur,2)+'%';$('mean').textContent=fmt(mean,2)+'%';$('count').textContent=data.length;$('rolls').textContent=rolls.length;$('regime').textContent=z>=2?'高於自身歷史波動分布（研究警示）':z<=-2?'低於自身歷史波動分布（不代表低風險）':'接近自身歷史波動分布中段';
const max=Math.max(...rolls,1),min=Math.min(...rolls,0),span=Math.max(max-min,1);$('chart').innerHTML=rolls.slice(-80).map(v=>{const h=Math.max(3,((v-min)/span)*150);return '<i style="height:'+h+'px" class="'+(v===cur?'alert':'')+'" title="'+fmt(v,2)+'%"></i>'}).join('');setStatus('計算完成：已使用 '+data.length+' 筆使用者輸入報酬。','ok')}
$('calc').addEventListener('click',calc);$('returns').addEventListener('input',()=>setStatus('資料已變更，按下計算後更新。'));$('window').addEventListener('change',()=>setStatus('窗口已變更，按下計算後更新。'));
</script>
</body></html>'''

BASIS_TOOL = r'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>臺指期／富台期期現價差工具｜GugoPro Academy</title>
<meta name="description" content="輸入同一時間查證的現貨、近月與次月期貨報價，計算 Basis、年化期現價差、轉倉價差與名目損益。">
<link rel="canonical" href="https://academy.gugopro.com/tools/futures-basis-pairs.html">
<link rel="stylesheet" href="../academy.css">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"臺指期／富台期期現價差工具","applicationCategory":"FinanceApplication","operatingSystem":"Web","description":"以使用者輸入拆解現貨、近月與次月期貨的期現價差和轉倉影響。","url":"https://academy.gugopro.com/tools/futures-basis-pairs.html"}</script>
</head>
<body class="quant-page">
<main class="tool-page"><div class="tool-crumb"><a href="../">← 回到 GugoPro Academy</a><span>衍生品研究 · 同時間輸入 · 非即時報價</span></div>
<div class="tool-layout"><section class="panel"><div class="eyebrow">Quant lab · Futures basis</div><h1>臺指期／富台期期現價差</h1><p>把同一時點的現貨參考、近月與次月期貨報價放在同一個單位中，拆解 Basis、期限結構與簡化名目損益。請按實際交易所契約規格修改乘數。</p>
<label for="spot">現貨／指數參考值</label><input id="spot" type="number" min="0" step="0.01" placeholder="貼入查證值">
<label for="front">近月期貨價格</label><input id="front" type="number" min="0" step="0.01" placeholder="貼入查證值">
<label for="next">次月期貨價格</label><input id="next" type="number" min="0" step="0.01" placeholder="貼入查證值">
<label for="days">近月距到期日（天）</label><input id="days" type="number" min="1" max="365" step="1" value="30">
<label for="multiplier">每點乘數（元）</label><input id="multiplier" type="number" min="0.01" step="0.01" value="200">
<label for="contracts">近月口數（研究用）</label><input id="contracts" type="number" min="0" step="1" value="1">
<button class="calc" id="calc" type="button">拆解期現與轉倉價差</button><div class="status" id="status" aria-live="polite">請輸入同一時間、同一標的口徑的三個價格。</div>
<div class="formula-note"><strong>公式：</strong>Basis＝近月期貨−現貨；Basis%＝Basis÷現貨；簡化年化 Basis＝Basis%×365÷距到期天數；Calendar spread＝次月−近月。這些是研究拆解，不是保證收斂或套利收益。</div></section>
<section class="result"><div class="eyebrow">Basis decomposition</div><h2>期現與期限結構</h2><div class="result-big" id="basis">—</div><div class="sub" id="shape">等待有效輸入</div>
<div class="metric-grid"><div class="metric"><span class="sub">Basis %</span><b id="basisPct">—</b></div><div class="metric"><span class="sub">年化 Basis</span><b id="annualBasis">—</b></div><div class="metric"><span class="sub">轉倉價差</span><b id="calendar">—</b></div><div class="metric"><span class="sub">名目 Basis 金額</span><b id="notional">—</b></div></div>
<div class="visual"><h3>價差結構（點數）</h3><div class="bar-chart" id="chart"><i style="height:6px"></i></div><div class="axis"><span>現貨 0</span><span>Basis</span><span>Calendar spread</span></div></div>
<div class="source-box"><strong>契約與資料限制：</strong>臺指期 TX 的契約大小與交易時段應以 <a href="https://www.taifex.com.tw/enl/eng2/tX" target="_blank" rel="noopener">TAIFEX 官方規格</a>核對；富台期與其他指數期貨的乘數、幣別、到期與交易時段不可直接套用。工具不抓即時報價，避免把不同時間或不同合約誤配成可交易的價差。</div></section></div></main>
<script src="../academy.js"></script><script>
const $=id=>document.getElementById(id),fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
function calc(){const s=+$('spot').value,f=+$('front').value,n=+$('next').value,d=+$('days').value,m=+$('multiplier').value,q=+$('contracts').value;if(![s,f,n,d,m,q].every(Number.isFinite)||s<=0||d<=0||m<=0||q<0){$('status').textContent='輸入錯誤：請填入有效的同口徑價格、天數、乘數與口數。';$('status').className='status error';return}const b=f-s,p=b/s*100,a=p*365/d,cal=n-f; $('basis').textContent=fmt(b)+' 點';$('basisPct').textContent=fmt(p,3)+'%';$('annualBasis').textContent=fmt(a,2)+'%';$('calendar').textContent=fmt(cal)+' 點';$('notional').textContent='NT$ '+Math.round(b*m*q).toLocaleString('zh-TW');$('shape').textContent=cal>0?'次月高於近月：正價差／Contango 研究標籤':cal<0?'次月低於近月：逆價差／Backwardation 研究標籤':'次月與近月相同：期限價差為 0';const span=Math.max(Math.abs(b),Math.abs(cal),1);$('chart').innerHTML='<i style="height:'+Math.max(5,Math.abs(b)/span*145)+'px" title="Basis"></i><i style="height:'+Math.max(5,Math.abs(cal)/span*145)+'px" title="Calendar spread"></i>';$('status').textContent='計算完成：請再核對乘數、幣別、到期日與同時點資料。';$('status').className='status ok'}
$('calc').addEventListener('click',calc);</script></body></html>'''

KELLY_TOOL = r'''<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kelly 風險預算工具｜GugoPro Academy</title>
<meta name="description" content="以你的交易紀錄摘要計算 Kelly 上限、分數 Kelly 風險預算與停損部位；不把歷史勝率當成未來保證。">
<link rel="canonical" href="https://academy.gugopro.com/tools/kelly-risk-budget.html">
<link rel="stylesheet" href="../academy.css">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Kelly 風險預算工具","applicationCategory":"FinanceApplication","operatingSystem":"Web","description":"以使用者交易紀錄摘要估算 Kelly 與分數 Kelly 風險預算。","url":"https://academy.gugopro.com/tools/kelly-risk-budget.html"}</script>
</head>
<body class="quant-page">
<main class="tool-page"><div class="tool-crumb"><a href="../">← 回到 GugoPro Academy</a><span>風險管理 · 個人輸入 · 不構成建議</span></div>
<div class="tool-layout"><section class="panel"><div class="eyebrow">Quant lab · Risk budget</div><h1>Kelly 風險預算</h1><p>以你已結束交易的統計摘要，將「優勢」轉成上限與保守分數 Kelly。若勝率、盈虧比或樣本不穩定，輸出不應被當成自動下單比例。</p>
<label for="win">勝率（%）</label><input id="win" type="number" min="0.01" max="99.99" step="0.1" placeholder="貼入已結束交易摘要">
<label for="avgwin">平均獲利（R）</label><input id="avgwin" type="number" min="0.01" step="0.01" placeholder="例如 1.8R">
<label for="avgloss">平均虧損（R）</label><input id="avgloss" type="number" min="0.01" step="0.01" placeholder="例如 1R">
<label for="fraction">分數 Kelly</label><select id="fraction"><option value="1">Full Kelly（研究上限）</option><option value="0.5" selected>Half Kelly</option><option value="0.25">Quarter Kelly</option></select>
<label for="account">帳戶資金（元）</label><input id="account" type="number" min="0" step="1" placeholder="填入自己的帳戶基準">
<label for="stop">單筆停損距離（%）</label><input id="stop" type="number" min="0.01" max="100" step="0.1" placeholder="填入自己的停損假設">
<button class="calc" id="calc" type="button">計算風險預算</button><div class="status" id="status" aria-live="polite">輸入以你的已結束交易為基礎的摘要；頁面不儲存紀錄。</div>
<div class="formula-note"><strong>公式：</strong>b＝平均獲利 R ÷ 平均虧損 R；Full Kelly＝p−(1−p)÷b；分數 Kelly＝Full Kelly×fraction。部位金額再以帳戶×風險比例與停損距離估算，沒有納入跳空、滑價、相關性與保證金規則。</div></section>
<section class="result"><div class="eyebrow">Risk budget</div><h2>理論上限與保守比例</h2><div class="result-big" id="fractionKelly">—</div><div class="sub" id="edge">等待計算</div>
<div class="metric-grid"><div class="metric"><span class="sub">Full Kelly</span><b id="fullKelly">—</b></div><div class="metric"><span class="sub">盈虧比 b</span><b id="ratio">—</b></div><div class="metric"><span class="sub">風險預算</span><b id="riskBudget">—</b></div><div class="metric"><span class="sub">停損部位上限</span><b id="position">—</b></div></div>
<div class="visual"><h3>Full Kelly 與分數 Kelly</h3><div class="bar-chart" id="chart"><i style="height:6px"></i><i style="height:6px"></i></div><div class="axis"><span>Full</span><span>Fractional</span></div></div>
<div class="source-box"><strong>重要限制：</strong>Kelly 對勝率與盈虧比估計誤差非常敏感；若 Full Kelly 小於 0，代表輸入的歷史優勢不足以支持正 Kelly，不應用負數反推槓桿。此頁是研究計算器，不是個人化投資或交易建議。</div></section></div></main>
<script src="../academy.js"></script><script>
const $=id=>document.getElementById(id),fmt=(n,d=2)=>Number.isFinite(n)?n.toFixed(d):'—';
function calc(){const p=+$('win').value/100,w=+$('avgwin').value,l=+$('avgloss').value,f=+$('fraction').value,acct=+$('account').value,stop=+$('stop').value/100;if(![p,w,l,f,acct,stop].every(Number.isFinite)||p<=0||p>=1||w<=0||l<=0||f<=0||acct<0||stop<=0){for(const id of ['fractionKelly','fullKelly','ratio','riskBudget','position'])$(id).textContent='—';$('edge').textContent='等待有效輸入';$('chart').innerHTML='';$('status').textContent='輸入錯誤：請填入 0–100% 的勝率、正數 R 倍數、資金與停損距離。';$('status').className='status error';return}const b=w/l,full=p-(1-p)/b,frac=Math.max(0,full*f),budget=acct*frac,pos=stop?budget/stop:0;$('fractionKelly').textContent=fmt(frac*100,2)+'%';$('fullKelly').textContent=fmt(full*100,2)+'%';$('ratio').textContent=fmt(b,2)+' R';$('riskBudget').textContent='NT$ '+Math.round(budget).toLocaleString('zh-TW');$('position').textContent='NT$ '+Math.round(pos).toLocaleString('zh-TW');$('edge').textContent=full>0?'輸入統計呈現正 Kelly；仍需做樣本外與壓力測試。':'輸入統計的 Full Kelly 不為正；不要用負數結果製造槓桿。';const scale=Math.max(Math.abs(full),Math.abs(frac),.01);$('chart').innerHTML='<i style="height:'+Math.max(5,Math.max(0,full)/scale*145)+'px" title="Full Kelly"></i><i style="height:'+Math.max(5,frac/scale*145)+'px" title="Fractional Kelly"></i>';$('status').textContent='計算完成：結果只反映輸入的交易紀錄摘要與停損假設。';$('status').className='status ok'}
$('calc').addEventListener('click',calc);</script></body></html>'''

ARTICLE_15 = r'''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>量化研究工作流：5MA 扣抵、波動 Z-Score 與樣本外回測｜GugoPro Academy</title>
<meta name="description" content="從研究問題、5MA 扣抵值、滾動波動 Z-Score 到樣本外回測，建立可複盤的量化研究工作流與透明計算方法。">
<meta name="keywords" content="5MA扣抵,20MA扣抵,波動Z-Score,量化研究,樣本外回測,過度擬合">
<link rel="canonical" href="https://gugopro.com/articles/investment/15-quant-research-workflow.html">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>:root{--bg:#08111f;--card:#101d31;--text:#f5f8ff;--muted:#aebdd2;--line:#253754;--blue:#66a3ff;--teal:#50d6bf;--gold:#f6c85f;--red:#ff9978}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 85% 4%,#173859 0,transparent 32%),var(--bg);color:var(--text);font:16px/1.85 Inter,"Noto Sans TC",system-ui,sans-serif}.wrap{max-width:1000px;margin:auto;padding:24px 20px 70px}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px}.brand,.back{color:#fff;text-decoration:none;font-weight:800}.back{color:var(--blue);font-size:14px}.kicker{color:var(--teal);font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.hero{padding:55px 0 34px}.hero h1{font-size:clamp(32px,5vw,58px);line-height:1.12;letter-spacing:-.04em;margin:12px 0}.hero p{color:var(--muted);font-size:18px;max-width:760px}.jump{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0 22px;position:sticky;top:0;background:#08111fe8;backdrop-filter:blur(12px);z-index:4}.jump a{border:1px solid var(--line);border-radius:99px;padding:6px 11px;color:var(--blue);font-size:13px;font-weight:800;text-decoration:none}.takeaways,.chapter,.formula,.worked,.faq,.cta{background:linear-gradient(145deg,#102038,#0d192b);border:1px solid var(--line);border-radius:16px;padding:22px;margin:20px 0}.takeaways h2,.chapter h2,.faq h2{margin:0 0 12px;font-size:24px;line-height:1.3}.chapter{scroll-margin-top:72px}.chapter h3{font-size:18px;color:var(--teal);margin:22px 0 6px}.chapter p{color:var(--muted);margin:9px 0}.formula{font:16px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;color:#fff;background:#06101d;border-left:4px solid var(--gold);overflow:auto}.worked{border-color:#2c665d}.worked strong{color:var(--gold)}table{width:100%;border-collapse:collapse;margin:14px 0;display:block;overflow-x:auto}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;min-width:140px}th{color:#fff;background:#173151}td{color:var(--muted)}.checks{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0;list-style:none}.checks li{background:#0b1728;border:1px solid var(--line);border-radius:10px;padding:11px;color:var(--muted)}.checks li::before{content:'✓';color:var(--teal);font-weight:900;margin-right:8px}.cta{display:flex;justify-content:space-between;align-items:center;gap:16px;background:linear-gradient(110deg,#173c52,#16352e)}.cta p{color:var(--muted);margin:5px 0}.cta a{display:inline-block;background:var(--gold);color:#142033;text-decoration:none;border-radius:9px;padding:10px 14px;font-weight:900;white-space:nowrap}.sources a{color:var(--blue)}.footer{border-top:1px solid var(--line);margin-top:34px;padding-top:20px;color:var(--muted);font-size:13px}@media(max-width:650px){.wrap{padding:18px 14px 45px}.hero{padding:34px 0 20px}.hero p{font-size:16px}.chapter,.takeaways,.formula,.worked,.faq,.cta{padding:16px}.checks{grid-template-columns:1fr}.cta{display:block}.cta a{margin-top:10px}.jump{overflow-x:auto;flex-wrap:nowrap}.jump a{white-space:nowrap}}</style>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"量化研究工作流：5MA 扣抵、波動 Z-Score 與樣本外回測","description":"從研究問題、5MA 扣抵值、滾動波動 Z-Score 到樣本外回測的完整教育文章。","author":{"@type":"Organization","name":"Manus AI"},"publisher":{"@type":"Organization","name":"GugoPro Academy"},"datePublished":"2026-08-26","dateModified":"2026-08-26","mainEntityOfPage":"https://gugopro.com/articles/investment/15-quant-research-workflow.html"}</script></head>
<body><main class="wrap"><div class="top"><a class="brand" href="https://gugopro.com">GugoPro Academy</a><a class="back" href="./">← 回到投資專題目錄</a></div><header class="hero"><div class="kicker">Quantitative research · 15</div><h1>量化研究工作流：<br>把 5MA、波動與回測放進同一條證據鏈</h1><p>量化不是把圖表變得更複雜，而是把研究問題、資料口徑、公式、執行規則與失效條件寫清楚。本篇以 5MA／20MA 扣抵、波動度 Z-Score 與樣本外回測建立一套可複盤流程。</p></header><nav class="jump" aria-label="文章章節導覽"><a href="#question">研究問題</a><a href="#ma">5MA／20MA 扣抵</a><a href="#vol">波動 Z-Score</a><a href="#backtest">樣本外回測</a><a href="#checklist">研究檢查表</a></nav>
<section class="takeaways"><h2>先看結論</h2><ul><li>均線扣抵描述「窗口中被移出的價格」與新價格的差，不是單獨的買賣訊號。</li><li>波動 Z-Score 只能說目前波動相對自己的歷史分布偏高或偏低，不能推導方向。</li><li>回測最重要的不是漂亮曲線，而是時間切分、下一根執行、成本、樣本外與失效監控。</li></ul></section>
<section class="chapter" id="question"><h2>一、先把研究問題寫成可反駁命題</h2><h3>1.1 從「會不會漲」改成可觀測條件</h3><p>「5MA 向上所以會漲」不是完整命題，因為它沒有定義訊號形成時點、進場價格、持有多久、交易成本與失效條件。較可測試的寫法是：「當收盤後的 5MA 高於 20MA，下一個交易日持有一根日線，扣除雙邊成本後的平均報酬是否仍為正？」這樣才知道要收集哪些欄位。</p><h3>1.2 固定資料口徑</h3><p>研究前要記錄標的、交易所、幣別、調整方式、頻率與截止日。若使用 ETF，分配股利是否回補價格會改變結果；若使用期貨，連續合約的換月方法會改變報酬。不同口徑不能在同一條曲線中靜默混合。</p></section>
<section class="chapter" id="ma"><h2>二、5MA／20MA 扣抵值：先懂窗口，再談轉折</h2><h3>2.1 均線與扣抵公式</h3><p>n 日簡單移動平均是最近 n 個收盤價的平均。今天與明天之間，窗口會移除最舊的價格，加入新價格，因此均線變化不只取決於今天是否上漲。</p><div class="formula">MA(n,t) = (C_t + C_{t-1} + … + C_{t-n+1}) / n<br>MA(n,t+1) − MA(n,t) = (C_{t+1} − C_{t-n+1}) / n</div><h3>2.2 可重現的示範</h3><div class="worked"><strong>示範數字（非市場行情）：</strong>假設 5MA 今天的最舊值為 100，明天加入的新收盤為 105，則均線只因窗口替換而上移 (105−100)÷5＝1 點。若新收盤只有 98，則為 (98−100)÷5＝−0.4 點。這個差值是機械計算，不等同趨勢預測。</div><h3>2.3 5MA 與 20MA 的使用邊界</h3><p>短均線對噪音敏感，長均線對轉折延遲。比較扣抵值時，應同時觀察成交量、波動狀態、支撐壓力與交易成本；不要把「扣高助跌、扣低助漲」寫成必然因果。可直接使用<a href="../../academy/tools/volatility-zscore.html" class="back">波動度 Z-Score 工具</a>檢查當時的波動環境，再把歷史收盤價交給自己的試算表核對。</p></section>
<section class="chapter" id="vol"><h2>三、波動度 Z-Score：把高波動與低波動定義清楚</h2><h3>3.1 從價格到報酬</h3><p>先用相同調整口徑的價格計算日報酬 <code>r_t=P_t/P_{t-1}−1</code>，再以固定窗口計算樣本標準差。若把價格直接拿來做標準差，會把價格水準誤當成風險。</p><div class="formula">σ_t = √[Σ(r_i − r̄)^2 / (w−1)]<br>Z_t = (σ_t − mean(σ)) / stdev(σ)</div><h3>3.2 解讀三種情況</h3><table><thead><tr><th>結果</th><th>可說的事</th><th>不可說的事</th></tr></thead><tbody><tr><td>Z ≥ 2</td><td>目前滾動波動高於樣本自身分布</td><td>不能直接說要做空或一定下跌</td></tr><tr><td>−2 &lt; Z &lt; 2</td><td>接近自身樣本中段</td><td>不能說風險已消失</td></tr><tr><td>Z ≤ −2</td><td>目前波動低於自身分布</td><td>不能說低波動等於安全</td></tr></tbody></table><p>窗口、樣本長度與市場體制都會影響 Z-Score。它適合做研究分層，例如調整回測成本假設或縮短槓桿曝險，而不是代替交易計畫。</p></section>
<section class="chapter" id="backtest"><h2>四、樣本外回測：防止把歷史雜訊當優勢</h2><h3>4.1 時間先切開，再調參</h3><p>把資料分成研究期、驗證期與封存的樣本外期。參數只能在研究期決定；樣本外資料只能在規則鎖定後使用。若反覆看樣本外結果再改參數，它就不再是樣本外。</p><h3>4.2 下一根執行與成本</h3><p>收盤形成的訊號不能同時使用同一根收盤成交，除非你有能證明的收盤撮合機制。保守做法是下一根 K 線執行，並納入手續費、點差、滑價、稅費、換月與停牌。策略報酬與買入持有要用同一價格口徑比較。</p><h3>4.3 回撤不是裝飾欄位</h3><p>除了總報酬，至少要報告最大回撤、回撤持續時間、交易次數、單筆分布、最差連續虧損與樣本外落差。用少量交易得到高 Sharpe，可能只是估計誤差；用很多參數把曲線修成直線，則是過度擬合風險。</p><p>可搭配<a href="../../academy/tools/var-calculator.html" class="back">歷史 VaR 估算器</a>與<a href="../../academy/tools/kelly-risk-budget.html" class="back">Kelly 風險預算工具</a>，把研究結果轉成壓力檢查，而不是直接轉成下單比例。</p></section>
<section class="chapter" id="checklist"><h2>五、可複盤的量化研究檢查表</h2><ul class="checks"><li>研究假設是否能被資料推翻？</li><li>價格、股利、期貨換月口徑是否固定？</li><li>是否明確隔離樣本外期間？</li><li>訊號與成交是否至少錯開一根 K 線？</li><li>成本、滑價、稅費與流動性是否壓力測試？</li><li>參數數量是否與樣本量相稱？</li><li>是否記錄版本、截止日與每次改動理由？</li><li>失效條件與停機規則是否事前寫下？</li></ul></section>
<section class="cta"><div><div class="kicker">Practice desk</div><h2>把研究流程變成可操作的計算</h2><p>先貼入你查證的日報酬，再用 Z-Score 看波動位置；最後用風險預算檢查部位上限。</p></div><a href="../../academy/tools/volatility-zscore.html">開啟研究工具 →</a></section>
<section class="faq"><h2>常見問題</h2><h3>扣抵值高就一定助跌嗎？</h3><p>不是。扣抵值只描述均線窗口替換的機械效果，實際價格仍受新資訊、成交量、流動性與市場制度影響。</p><h3>Z-Score 可以預測崩盤嗎？</h3><p>不能。它是相對分布的描述統計；即使波動 Z-Score 很高，也不提供方向與時間點。</p><h3>樣本外結果不好是否代表策略一定無效？</h3><p>它至少代表目前規則與資料口徑沒有在封存期間重現優勢。應先檢查資料、成本與執行假設，再決定是否停止研究，而不是回頭偷改樣本外參數。</p></section>
<div class="footer">資料與公式僅供教育與研究；不得視為投資、交易或風險承受度建議。外部契約與市場資料應以原始來源及當期規格覆核。</div></main></body></html>'''

ARTICLE_16 = r'''<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>臺指期／富台期配對交易與期現價差：從 Basis 到轉倉風險｜GugoPro Academy</title>
<meta name="description" content="完整拆解臺指期與富台期配對交易的合約單位、期現價差 Basis、期限結構、避險口數、轉倉與基差風險，附透明公式與可操作工具。">
<meta name="keywords" content="臺指期,富台期,配對交易,Basis,期現價差,轉倉,避險口數,期貨風控">
<link rel="canonical" href="https://gugopro.com/articles/investment/16-futures-pairs-basis.html">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Noto+Sans+TC:wght@400;500;700;900&display=swap" rel="stylesheet">
<style>:root{--bg:#07121f;--card:#101f34;--text:#f7fbff;--muted:#afbed1;--line:#29405d;--blue:#73adff;--teal:#5bd4bc;--gold:#f4c95d;--red:#ff9876}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:radial-gradient(circle at 12% 0,#173a50 0,transparent 30%),var(--bg);color:var(--text);font:16px/1.85 Inter,"Noto Sans TC",system-ui,sans-serif}.wrap{max-width:1000px;margin:auto;padding:24px 20px 70px}.top{display:flex;justify-content:space-between;gap:16px;align-items:center;border-bottom:1px solid var(--line);padding-bottom:14px}.brand,.back{color:#fff;text-decoration:none;font-weight:800}.back{color:var(--blue);font-size:14px}.kicker{color:var(--teal);font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase}.hero{padding:55px 0 34px}.hero h1{font-size:clamp(31px,5vw,57px);line-height:1.12;letter-spacing:-.04em;margin:12px 0}.hero p{color:var(--muted);font-size:18px;max-width:790px}.jump{display:flex;flex-wrap:wrap;gap:8px;padding:12px 0 22px;position:sticky;top:0;background:#07121fe8;backdrop-filter:blur(12px);z-index:4}.jump a{border:1px solid var(--line);border-radius:99px;padding:6px 11px;color:var(--blue);font-size:13px;font-weight:800;text-decoration:none}.takeaways,.chapter,.formula,.worked,.faq,.cta{background:linear-gradient(145deg,#11223a,#0d192b);border:1px solid var(--line);border-radius:16px;padding:22px;margin:20px 0}.takeaways h2,.chapter h2,.faq h2{margin:0 0 12px;font-size:24px;line-height:1.3}.chapter{scroll-margin-top:72px}.chapter h3{font-size:18px;color:var(--teal);margin:22px 0 6px}.chapter p{color:var(--muted);margin:9px 0}.formula{font:16px/1.7 ui-monospace,SFMono-Regular,Consolas,monospace;color:#fff;background:#06101d;border-left:4px solid var(--gold);overflow:auto}.worked{border-color:#2c665d}.worked strong{color:var(--gold)}table{width:100%;border-collapse:collapse;margin:14px 0;display:block;overflow-x:auto}th,td{padding:10px 12px;border-bottom:1px solid var(--line);text-align:left;min-width:140px}th{color:#fff;background:#173151}td{color:var(--muted)}.checks{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;padding:0;list-style:none}.checks li{background:#0b1728;border:1px solid var(--line);border-radius:10px;padding:11px;color:var(--muted)}.checks li::before{content:'✓';color:var(--teal);font-weight:900;margin-right:8px}.cta{display:flex;justify-content:space-between;align-items:center;gap:16px;background:linear-gradient(110deg,#173c52,#16352e)}.cta p{color:var(--muted);margin:5px 0}.cta a{display:inline-block;background:var(--gold);color:#142033;text-decoration:none;border-radius:9px;padding:10px 14px;font-weight:900;white-space:nowrap}.sources a{color:var(--blue)}.footer{border-top:1px solid var(--line);margin-top:34px;padding-top:20px;color:var(--muted);font-size:13px}@media(max-width:650px){.wrap{padding:18px 14px 45px}.hero{padding:34px 0 20px}.hero p{font-size:16px}.chapter,.takeaways,.formula,.worked,.faq,.cta{padding:16px}.checks{grid-template-columns:1fr}.cta{display:block}.cta a{margin-top:10px}.jump{overflow-x:auto;flex-wrap:nowrap}.jump a{white-space:nowrap}}</style>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Article","headline":"臺指期／富台期配對交易與期現價差：從 Basis 到轉倉風險","description":"拆解臺指期與富台期配對交易、期現價差、期限結構、避險與轉倉風險。","author":{"@type":"Organization","name":"Manus AI"},"publisher":{"@type":"Organization","name":"GugoPro Academy"},"datePublished":"2026-08-26","dateModified":"2026-08-26","mainEntityOfPage":"https://gugopro.com/articles/investment/16-futures-pairs-basis.html"}</script></head>
<body><main class="wrap"><div class="top"><a class="brand" href="https://gugopro.com">GugoPro Academy</a><a class="back" href="./">← 回到投資專題目錄</a></div><header class="hero"><div class="kicker">Futures & pairs · 16</div><h1>臺指期／富台期配對交易：<br>先拆 Basis，再談套利</h1><p>跨市場配對的難點不在於找到兩條看起來相似的線，而在於合約乘數、幣別、交易時段、到期日、保證金與基差風險都必須對齊。本篇提供可查證、可計算、可停機的研究框架。</p></header><nav class="jump" aria-label="文章章節導覽"><a href="#contract">契約與單位</a><a href="#basis">Basis 與期限結構</a><a href="#hedge">避險口數</a><a href="#risk">轉倉與風控</a><a href="#checklist">執行檢查</a></nav>
<section class="takeaways"><h2>先看結論</h2><ul><li>配對交易不是「一多一空就中性」；兩腿的單位、Beta、幣別與交易時間差會留下殘餘風險。</li><li>Basis 是觀測值，不是保證收斂的收益；期限結構、資金成本與轉倉摩擦會改變結果。</li><li>每次研究都要留下契約規格、同時點報價、口數換算、成本與停機條件。</li></ul></section>
<section class="chapter" id="contract"><h2>一、先對齊契約規格與名目單位</h2><h3>1.1 指數期貨不是指數本身</h3><p>指數是計算出來的參考值，期貨則是有到期日、交易時段、結算方式、最小跳動與每點乘數的契約。臺灣期貨交易所官方 TAIEX Futures 規格頁列出 TX 的英文代碼、到期安排、交易時段、契約大小、最小跳動、價格限制與結算方式，研究者應以當期官方頁面覆核，而不是把網路文章的舊規格當成常數。</p><h3>1.2 名目價值與口數</h3><div class="formula">名目價值 = 期貨價格 × 每點乘數 × 口數<br>理論避險口數 = 現貨曝險市值 × Hedge ratio ÷ (期貨價格 × 每點乘數)</div><p>富台期、臺指期、Mini 合約或海外期貨不能直接共用同一個乘數。若兩腿使用不同幣別，還要先選定匯率時間點與方向；若交易時段不重疊，收盤價配對可能只是不同時間的市場狀態。</p></section>
<section class="chapter" id="basis"><h2>二、Basis 與期限結構：把價差拆成可驗證元件</h2><h3>2.1 期現 Basis</h3><div class="formula">Basis = F − S<br>Basis% = (F − S) ÷ S<br>簡化年化 Basis% = Basis% × 365 ÷ 距到期天數</div><p>其中 F 是近月期貨、S 是同一時間的現貨或指數參考值。正 Basis 可能反映持有成本、資金、股利與供需；負 Basis 也不必然是錯價。年化只是把當下觀測值換算到共同尺度，不是預期報酬。</p><h3>2.2 期限結構與轉倉</h3><div class="worked"><strong>示範數字（非即時行情）：</strong>假設現貨 S＝22,000、近月 F1＝22,040、距到期 30 天，則 Basis＝40 點、Basis%＝0.1818%，簡化年化值約為 2.21%。若次月 F2＝22,100，Calendar spread＝F2−F1＝60 點。這些數字只示範公式，不代表任何市場報價或套利機會。</div><p>轉倉時要同時觀察方向 P&amp;L 與 F2−F1 的替換成本。若只看一條連續期貨線而忽略換月規則，長期回測可能把轉倉收益誤認為標的方向收益。</p><p>可直接使用<a href="../../academy/tools/futures-basis-pairs.html" class="back">期現價差工具</a>輸入你查證的同時點數據，並保存契約規格與時間戳。</p></section>
<section class="chapter" id="hedge"><h2>三、從 Beta 與乘數推導避險口數</h2><h3>3.1 先定義要中和的風險</h3><p>若持有一籃子台股，目標可能是降低市場 Beta，而不是消除所有個股風險；若持有美元資產，還有匯率腿；若持有跨市場 ETF，交易時段不同會造成日內殘餘風險。Hedge ratio 必須先寫成研究假設，再決定口數。</p><h3>3.2 理論口數不是可直接下單口數</h3><p>公式得到的數字要向可交易最小口數整數化，然後檢查跳動損益、保證金、漲跌幅限制、流動性與最大可承受損失。整數化的誤差要保留，不應把結果格式化成看似精準的小數口。</p><table><thead><tr><th>核對層</th><th>必問問題</th><th>常見誤判</th></tr></thead><tbody><tr><td>曝險</td><td>現貨市值、Beta、幣別與時間點是否一致？</td><td>只用金額相等就宣稱中性</td></tr><tr><td>契約</td><td>乘數、最小跳動、到期與結算方式是否當期有效？</td><td>沿用舊文章或另一個 Mini 合約</td></tr><tr><td>執行</td><td>兩腿是否同時可成交、成本與滑價是否納入？</td><td>只看理論價差、不看流動性</td></tr></tbody></table></section>
<section class="chapter" id="risk"><h2>四、轉倉、基差失效與風控</h2><h3>4.1 配對關係會變</h3><p>高相關不等於協整，也不保證下一個月仍然維持。成分股調整、股利、匯率、利率、交易時段與事件風險都可能讓兩腿的關係改變。應用滾動窗口檢查相關性、價差分布與失效條件，並保留樣本外期間。</p><h3>4.2 保證金與跳空</h3><p>即使理論上兩腿方向相反，保證金是按各腿與交易所規則管理；一腿先成交、另一腿滑價或暫停交易時，帳戶仍可能承受集中風險。壓力測試應包括 Basis 擴大、匯率不利變動、交易成本加倍與無法同步平倉。</p><h3>4.3 停機規則</h3><p>在下單前寫下最大允許 Basis 偏離、最大未對沖時間、保證金緩衝與事件前減碼規則。停機是研究系統的一部分，不是虧損後才臨時決定的情緒反應。</p></section>
<section class="chapter" id="checklist"><h2>五、配對研究執行檢查表</h2><ul class="checks"><li>兩腿的標的、幣別、時間戳與調整口徑一致？</li><li>已保存官方契約規格與每點乘數？</li><li>Basis 與 Calendar spread 分開計算？</li><li>避險口數已依 Beta 與整數化誤差覆核？</li><li>成本、滑價、保證金與漲跌幅限制已納入？</li><li>是否有樣本外與結構變化監控？</li><li>轉倉規則是否可重現？</li><li>最大偏離、時間與流動性停機條件是否事前寫下？</li></ul></section>
<section class="cta"><div><div class="kicker">Practice desk</div><h2>用同時點資料拆解你的 Basis</h2><p>填入實際查證的現貨、近月、次月價格與乘數，工具會把期現與轉倉項目分開。</p></div><a href="../../academy/tools/futures-basis-pairs.html">開啟期現價差工具 →</a></section>
<section class="faq sources"><h2>官方資料與常見問題</h2><h3>臺指期每點價值可以永久固定嗎？</h3><p>不能。應以<a href="https://www.taifex.com.tw/enl/eng2/tX" target="_blank" rel="noopener">TAIFEX 當期契約規格</a>覆核，並留意交易所公告、合約調整與券商風控條件。</p><h3>Basis 正值是否等於可套利？</h3><p>不是。需要同步考慮資金、股利、借券、保證金、交易成本、轉倉、時段差與基差風險；工具只做透明拆解。</p><h3>為何要看 CME 的一般期貨教材？</h3><p><a href="https://www.cmegroup.com/education/courses/introduction-to-futures" target="_blank" rel="noopener">CME 的期貨入門教材</a>將契約規格、到期結算、Tick、名目價值、Mark-to-Market、Margin 與 Hedger 分開說明，可作為跨市場概念索引；實際規格仍以各交易所為準。</p></section>
<div class="footer">資料與公式僅供教育與研究；不得視為投資、交易或避險建議。契約、保證金與稅費應以當期原始公告及你的實際交易條件覆核。</div></main></body></html>'''


def add_json_entry():
    path = ROOT / "data" / "tools-list.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    ids = {item.get("id") for item in data}
    additions = [
        {"id":"academy-volatility-zscore","name":"波動度 Z-Score 研究工具","name_en":"Volatility Z-Score Research Tool","category":"finance-academy","url":"/academy/tools/volatility-zscore.html","live_url":"https://academy.gugopro.com/tools/volatility-zscore.html","icon":"fa-solid fa-wave-square","description":"以使用者查證的歷史日報酬計算滾動波動度與 Z-Score，純前端不填假行情。","status":"online","tags":["波動度","Z-Score","量化研究","Rolling Volatility","前端計算"],"color":"blue","created_at":"2026-08-26"},
        {"id":"academy-futures-basis-pairs","name":"臺指期／富台期期現價差工具","name_en":"TAIEX Futures Basis & Pairs Tool","category":"finance-academy","url":"/academy/tools/futures-basis-pairs.html","live_url":"https://academy.gugopro.com/tools/futures-basis-pairs.html","icon":"fa-solid fa-arrows-left-right-to-line","description":"輸入同時點現貨、近月與次月價格，拆解 Basis、年化期現價差與轉倉價差。","status":"online","tags":["臺指期","富台期","Basis","期現價差","轉倉","配對交易"],"color":"amber","created_at":"2026-08-26"},
        {"id":"academy-kelly-risk-budget","name":"Kelly 風險預算工具","name_en":"Kelly Risk Budget Calculator","category":"finance-academy","url":"/academy/tools/kelly-risk-budget.html","live_url":"https://academy.gugopro.com/tools/kelly-risk-budget.html","icon":"fa-solid fa-shield-halved","description":"以交易紀錄摘要計算 Full／Fractional Kelly 與停損部位上限，明示樣本與跳空限制。","status":"online","tags":["Kelly","部位管理","風險預算","Fractional Kelly","交易風控"],"color":"emerald","created_at":"2026-08-26"},
    ]
    for item in additions:
        if item["id"] not in ids:
            data.append(item)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def remove_unused_ai_key_surface():
    for path in sorted(ACADEMY.rglob("*.html")):
        text = path.read_text(encoding="utf-8")
        text = re.sub(r'<button[^>]*data-api-key[^>]*>.*?</button>', '', text, flags=re.S)
        path.write_text(text, encoding="utf-8")


def patch_academy_home():
    path = ACADEMY / "index.html"
    text = path.read_text(encoding="utf-8")
    text = text.replace('<meta name="description" content="以課程、計算器與決策框架學習投資：複利、ETF、資產配置、估值、風險管理、總體經濟與退休現金流。">', '<meta name="description" content="以課程、量化研究工具與決策框架學習投資：複利、ETF、資產配置、估值、波動、期現價差、風險管理與退休現金流。"><link rel="canonical" href="https://academy.gugopro.com/"><script type="application/ld+json">{"@context":"https://schema.org","@type":"CollectionPage","name":"GugoPro Academy 財經教育與決策工具","description":"以長文課程與純前端互動工具建立可複盤的投資決策框架。","url":"https://academy.gugopro.com/","isPartOf":{"@type":"WebSite","name":"GugoPro"}}</script>')
    text = re.sub(r'<a href="#quant-lab">量化研究</a>', '', text)
    text = text.replace('<a href="#tools">互動實驗室</a>', '<a href="#tools">互動實驗室</a><a href="#quant-lab">量化研究</a>', 1)
    text = text.replace('<b>20</b><span>完整課程章節</span>', '<b>22</b><span>完整課程章節</span>')
    text = text.replace('<b>11</b><span>互動決策工具</span>', '<b>14</b><span>互動決策工具</span>')
    lesson_anchor = '<a class="card" data-lesson="20" href="../articles/investment/06-sharpe-mdd-risk-control.html"><span class="tag">20 · 統整</span><h3>建立個人投資政策</h3><p>將目標、限制、配置與再平衡規則整合成 IPS。</p><span class="cardlink">閱讀章節 ↗</span></a>'
    lesson_add = lesson_anchor + '<a class="card" data-lesson="21" href="../articles/investment/15-quant-research-workflow.html"><span class="tag">21 · 研究</span><h3>量化研究工作流</h3><p>由 5MA 扣抵、波動 Z-Score 到樣本外回測，建立可複盤的證據鏈。</p><span class="cardlink">閱讀章節 ↗</span></a><a class="card" data-lesson="22" href="../articles/investment/16-futures-pairs-basis.html"><span class="tag">22 · 衍生品</span><h3>臺指期／富台期配對交易</h3><p>把契約單位、Basis、期限結構、避險口數與轉倉風險拆開學。</p><span class="cardlink">閱讀章節 ↗</span></a>'
    if 'data-lesson="21"' not in text:
        text = text.replace(lesson_anchor, lesson_add)
    tool_anchor = '<div class="tool"><small>11 / 目標</small><h3>儲蓄率與目標路徑</h3><a href="tools/savings-rate.html">估算達標時間 →</a></div>'
    tool_add = tool_anchor + '<div class="tool"><small>12 / 量化研究</small><h3>波動度 Z-Score</h3><a href="tools/volatility-zscore.html">分析波動位置 →</a></div><div class="tool"><small>13 / 期貨</small><h3>臺指期／富台期期現價差</h3><a href="tools/futures-basis-pairs.html">拆解 Basis 與轉倉 →</a></div><div class="tool"><small>14 / 風控</small><h3>Kelly 風險預算</h3><a href="tools/kelly-risk-budget.html">計算分數 Kelly →</a></div>'
    if 'tools/volatility-zscore.html' not in text:
        text = text.replace(tool_anchor, tool_add)
    quant_section = '<section class="section" id="quant-lab"><div class="sectionhead"><div><div class="eyebrow">Quant research desk</div><h2>把研究假設寫成可複盤的流程</h2><p class="lead">量化工具不會替你製造行情；它要求你提供資料口徑、假設與失效條件，再把公式與限制完整攤開。</p></div></div><div class="source-grid"><a href="../articles/investment/15-quant-research-workflow.html"><strong>15 · 量化研究工作流</strong><span>5MA 扣抵、波動 Z-Score、樣本外回測與檢查表。</span></a><a href="../articles/investment/16-futures-pairs-basis.html"><strong>16 · 臺指期／富台期配對</strong><span>契約單位、Basis、期限結構、避險口數與轉倉。</span></a><a href="tools/kelly-risk-budget.html"><strong>研究配套：Kelly 風險預算</strong><span>以交易紀錄摘要檢查 Full／Fractional Kelly 的敏感度。</span></a></div></section>'
    if 'id="quant-lab"' not in text:
        text = text.replace('</div></section><section class="section sources" id="sources">', '</div></section>' + quant_section + '<section class="section sources" id="sources">')
    path.write_text(text, encoding="utf-8")


def patch_article_index():
    path = ARTICLES / "index.html"
    text = path.read_text(encoding="utf-8")
    text = text.replace('<meta name="description" content="GugoPro 投資教學學院：從初級入門、中級實戰到進階風控，提供系統化的投資學習路徑。">', '<meta name="description" content="GugoPro 投資教學學院：從複利、ETF、資產配置到量化研究、期現價差與進階風控，提供系統化的投資學習路徑。"><link rel="canonical" href="https://gugopro.com/articles/investment/">')
    block = '''<section class="category-block" id="quant-research">
                <div class="category-title-flex">
                    <h3><i class="fa-solid fa-flask text-blue"></i> 🧪 量化研究 (Quant Research)</h3>
                    <span class="cat-count">2 篇文章</span>
                </div>
                <div class="tools-grid">
                    <a href="15-quant-research-workflow.html" class="tool-card"><div class="tool-card-top"><div class="tool-icon icon-intermediate"><i class="fa-solid fa-wave-square"></i></div></div><h4>量化研究工作流</h4><p>由 5MA／20MA 扣抵、波動 Z-Score 到樣本外回測，建立可複盤的證據鏈。</p><div class="btn-visit-small">閱讀文章 <i class="fa-solid fa-arrow-right"></i></div></a>
                    <a href="16-futures-pairs-basis.html" class="tool-card"><div class="tool-card-top"><div class="tool-icon icon-intermediate"><i class="fa-solid fa-arrows-left-right-to-line"></i></div></div><h4>臺指期／富台期配對與 Basis</h4><p>拆解契約單位、期現價差、期限結構、避險口數、轉倉與基差風險。</p><div class="btn-visit-small">閱讀文章 <i class="fa-solid fa-arrow-right"></i></div></a>
                </div>
            </section>

        '''
    if 'id="quant-research"' not in text:
        text = text.replace('        <!-- Ko-fi Section -->', '        ' + block + '<!-- Ko-fi Section -->')
    path.write_text(text, encoding="utf-8")


def patch_article_links():
    for path in sorted(ARTICLES.glob("[0-9][0-9]-*.html")):
        text = path.read_text(encoding="utf-8")
        text = text.replace('/tools/finance/kelly-criterion-calculator.html', '../../academy/tools/kelly-risk-budget.html')
        text = text.replace('凱利公式計算器', 'Kelly 風險預算工具')
        path.write_text(text, encoding="utf-8")


def patch_sitemap():
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    text = text.replace('https://gugopro.com/tools/finance/kelly-criterion-calculator.html', 'https://academy.gugopro.com/tools/kelly-risk-budget.html')
    additions = [
        '<url><loc>https://gugopro.com/articles/investment/15-quant-research-workflow.html</loc><lastmod>2026-08-26</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>',
        '<url><loc>https://gugopro.com/articles/investment/16-futures-pairs-basis.html</loc><lastmod>2026-08-26</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>',
        '<url><loc>https://academy.gugopro.com/tools/volatility-zscore.html</loc><lastmod>2026-08-26</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>',
        '<url><loc>https://academy.gugopro.com/tools/futures-basis-pairs.html</loc><lastmod>2026-08-26</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>',
    ]
    for entry in additions:
        if entry not in text:
            text = text.replace('</urlset>', '  ' + entry + '\n</urlset>')
    path.write_text(text, encoding="utf-8")


def main():
    write(TOOLS / "volatility-zscore.html", VOLATILITY_TOOL)
    write(TOOLS / "futures-basis-pairs.html", BASIS_TOOL)
    write(TOOLS / "kelly-risk-budget.html", KELLY_TOOL)
    for path in [ACADEMY / "academy.css"]:
        current = path.read_text(encoding="utf-8")
        if "Quant research upgrade: shared" not in current:
            path.write_text(current.rstrip() + ACADEMY_CSS_APPEND + "\n", encoding="utf-8")
    write(ARTICLES / "15-quant-research-workflow.html", ARTICLE_15)
    write(ARTICLES / "16-futures-pairs-basis.html", ARTICLE_16)
    remove_unused_ai_key_surface()
    patch_academy_home()
    patch_article_index()
    patch_article_links()
    patch_sitemap()
    add_json_entry()
    print("quant upgrade: 3 tools, 2 articles, academy navigation, links, registry and sitemap updated")


if __name__ == "__main__":
    main()
