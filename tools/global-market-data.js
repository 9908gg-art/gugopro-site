(() => {
  'use strict';
  const G = {};
  const $ = (id, root = document) => root.getElementById(id);
  const esc = (value) => String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
  const finite = (value) => Number.isFinite(Number(value));
  const num = (value, digits = 2) => finite(value) ? Number(value).toLocaleString('zh-TW', { minimumFractionDigits: digits, maximumFractionDigits: digits }) : '—';
  const pct = (value, digits = 2) => finite(value) ? `${num(Number(value) * 100, digits)}%` : '—';
  const usd = (value, digits = 2) => finite(value) ? `US$ ${num(value, digits)}` : '—';
  const money = (value, digits = 2) => finite(value) ? `NT$ ${num(value, digits)}` : '—';
  const date = (value) => { const d = value instanceof Date ? value : new Date(Number(value) * 1000); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('zh-TW'); };
  const time = (value) => { const d = value instanceof Date ? value : new Date(Number(value) * 1000); return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('zh-TW'); };
  const cleanSymbol = (value) => String(value || '').trim().toUpperCase().replace(/\s+/g, '');

  async function fetchTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    try { const request = { ...options, signal: controller.signal, mode: 'cors', cache: 'no-store' }; if (options.headers) request.headers = options.headers; return await fetch(url, request); }
    finally { window.clearTimeout(timer); }
  }

  async function json(url, options = {}, timeout = 15000) { const response = await fetchTimeout(url, options, timeout); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }
  async function text(url, options = {}, timeout = 18000) { const response = await fetchTimeout(url, options, timeout); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.text(); }
  function jsonProxyUrls(url) { return [
    `https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`,
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ]; }
  function textProxyUrls(url) { return [
    `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
  ]; }
  async function publicJson(url, options = {}, timeout = 15000) {
    try { return await json(url, options, timeout); }
    catch (directError) {
      let lastError = directError;
      for (const proxyUrl of jsonProxyUrls(url)) {
        try {
          const body = await text(proxyUrl, {}, Math.min(7000, timeout));
          const marker = 'Markdown Content:\n';
          const candidate = body.includes(marker) ? body.split(marker).slice(1).join(marker).trim() : body.trim();
          const parsed = JSON.parse(candidate);
          if (parsed?.data?.content && typeof parsed.data.content === 'string') return JSON.parse(parsed.data.content);
          return parsed;
        } catch (proxyError) { lastError = proxyError; }
      }
      throw new Error(`公開端點無法由瀏覽器讀取（${directError.message}；備援：${lastError.message}）`);
    }
  }
  async function publicText(url, options = {}, timeout = 18000) {
    try { return await text(url, options, timeout); }
    catch (directError) {
      let lastError = directError;
      for (const proxyUrl of textProxyUrls(url)) {
        try { return await text(proxyUrl, {}, Math.min(4000, timeout)); }
        catch (proxyError) { lastError = proxyError; }
      }
      throw new Error(`公開端點無法由瀏覽器讀取（${directError.message}；備援：${lastError.message}）`);
    }
  }

  async function yahooHistory(symbol, range = '2y', interval = '1d') {
    const raw = cleanSymbol(symbol);
    const result = (await publicJson(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(raw)}?range=${range}&interval=${interval}&includePrePost=false&events=div%2Csplits`, {}, 10000)).chart?.result?.[0];
    if (!result?.timestamp?.length) throw new Error(`Yahoo 沒有 ${raw} 歷史資料`);
    const quote = result.indicators?.quote?.[0] || {};
    const adjusted = result.indicators?.adjclose?.[0]?.adjclose || [];
    const rows = result.timestamp.map((stamp, index) => ({ time: Number(stamp), close: Number(quote.close?.[index]), open: Number(quote.open?.[index]), high: Number(quote.high?.[index]), low: Number(quote.low?.[index]), volume: Number(quote.volume?.[index]), adjClose: Number(adjusted[index]) })).filter((row) => finite(row.time) && finite(row.close) && row.close > 0);
    if (rows.length < 12) throw new Error(`Yahoo ${raw} 歷史樣本不足`);
    return { symbol: raw, meta: result.meta || {}, rows, events: result.events || {} };
  }

  async function fredCsv(series, start = '2010-01-01') {
    const ids = Array.isArray(series) ? series.join(',') : series;
    const raw = await publicText(`https://fred.stlouisfed.org/graph/fredgraph.csv?id=${encodeURIComponent(ids)}&cosd=${start}`, {}, 12000);
    const lines = raw.trim().split(/\r?\n/).filter(Boolean);
    if (lines.length < 2 || !/^observation_date,/.test(lines[0])) throw new Error('FRED CSV 格式無法解析');
    const headers = lines[0].split(',');
    const rows = lines.slice(1).map((line) => { const parts = line.split(','); const row = { date: parts[0], time: Date.parse(`${parts[0]}T00:00:00Z`) / 1000 }; headers.slice(1).forEach((key, index) => { row[key] = Number(parts[index + 1]); }); return row; }).filter((row) => finite(row.time));
    if (!rows.length) throw new Error(`FRED ${ids} 沒有可用觀測值`);
    return { series: headers.slice(1), rows };
  }

  async function yahooOptions(symbol) {
    const raw = cleanSymbol(symbol);
    const payload = await publicJson(`https://query2.finance.yahoo.com/v7/finance/options/${encodeURIComponent(raw)}`, {}, 10000);
    const result = payload.optionChain?.result?.[0];
    const option = result?.options?.[0];
    if (!option) throw new Error(`Yahoo 沒有 ${raw} options chain`);
    return { symbol: raw, underlyingPrice: Number(result.quote?.regularMarketPrice), expiration: result.expirationDates?.[0], calls: option.calls || [], puts: option.puts || [] };
  }

  async function binanceFunding(symbol) {
    const raw = cleanSymbol(symbol);
    const [fundingResult, ratioResult] = await Promise.allSettled([
      publicJson(`https://fapi.binance.com/fapi/v1/fundingRate?symbol=${encodeURIComponent(raw)}&limit=100`, {}, 8000),
      publicJson(`https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=${encodeURIComponent(raw)}&period=8h&limit=100`, {}, 8000)
    ]);
    if (fundingResult.status === 'rejected') throw fundingResult.reason;
    const funding = fundingResult.value;
    if (!Array.isArray(funding)) throw new Error(funding?.msg || 'Binance funding 回應格式無法解析');
    const ratioValue = ratioResult.status === 'fulfilled' ? ratioResult.value : null;
    const ratio = Array.isArray(ratioValue) ? ratioValue : [];
    const rates = funding.map((row) => ({ time: Number(row.fundingTime) / 1000, rate: Number(row.fundingRate), markPrice: Number(row.markPrice) })).filter((row) => finite(row.time) && finite(row.rate));
    const ratios = ratio.map((row) => ({ time: Number(row.timestamp) / 1000, longShort: Number(row.longShortRatio), long: Number(row.longAccount), short: Number(row.shortAccount) })).filter((row) => finite(row.time) && finite(row.longShort));
    if (rates.length < 3) throw new Error('Binance funding 歷史樣本不足');
    return { symbol: raw, rates, ratios, ratioError: ratioResult.status === 'rejected' ? ratioResult.reason : (!Array.isArray(ratioValue) ? new Error(ratioValue?.msg || 'Binance 多空比回應格式無法解析') : null) };
  }

  async function binanceForceOrders(symbol) {
    const raw = cleanSymbol(symbol);
    const rows = await publicJson(`https://fapi.binance.com/fapi/v1/allForceOrders?symbol=${encodeURIComponent(raw)}&limit=100`, {}, 8000);
    if (!Array.isArray(rows)) throw new Error(rows?.msg || 'Binance 強平回應格式無法解析');
    return rows.map((row) => ({ time: Number(row.time) / 1000, side: row.side, price: Number(row.price), qty: Number(row.origQty), notional: Number(row.price) * Number(row.origQty) })).filter((row) => finite(row.time) && finite(row.notional));
  }

  async function secJson(url) {
    try { return await json(url, { headers: { Accept: 'application/json', 'User-Agent': 'GugoPro Academy public research' } }, 10000); }
    catch (directError) {
      try { const bridged = await text(`https://r.jina.ai/http://${url.replace(/^https?:\/\//, '')}`, { headers: { Accept: 'text/plain' } }, 12000); const marker = 'Markdown Content:\n'; const content = bridged.includes(marker) ? bridged.split(marker).slice(1).join(marker).trim() : bridged.trim(); return JSON.parse(content); }
      catch (bridgeError) { throw new Error(`SEC 公開端點無法由瀏覽器讀取（${directError.message}）`); }
    }
  }

  function setStatus(main, detail, error = false) {
    const status = $('global-status'); if (status) status.classList.toggle('is-error', Boolean(error));
    if ($('global-status-main')) $('global-status-main').textContent = main;
    if ($('global-status-detail')) $('global-status-detail').textContent = detail;
  }
  function source(textValue) { if ($('global-source')) $('global-source').textContent = `資料來源：${textValue}`; }
  function result(html) { if ($('global-result')) $('global-result').innerHTML = html; }
  function loading(message = '正在載入公開資料。') { result(`<p class="global-loading"><i class="fa-solid fa-spinner fa-spin"></i> ${esc(message)}</p>`); }
  function error(errorValue, retry = true) { const message = errorValue?.message || String(errorValue); setStatus('資料載入失敗', message, true); result(`<div class="global-error"><strong>無法完成公開資料查詢</strong><p>${esc(message)}</p>${retry ? '<p>請確認端點可用後按「重新載入」。工具不會以假數字補值。</p>' : ''}</div>`); }
  function bindRetry(load) { $('global-load')?.addEventListener('click', load); $('global-retry')?.addEventListener('click', load); }

  function chart(canvasId, labels, datasets, options = {}) {
    const canvas = $(canvasId); if (!canvas) return null;
    const parent = canvas.parentElement; const height = options.height || (window.innerWidth <= 600 ? 250 : 320); canvas.style.height = `${height}px`; canvas.style.width = '100%';
    if (window.Chart) {
      if (canvas.__globalChart) canvas.__globalChart.destroy();
      canvas.__globalChart = new window.Chart(canvas.getContext('2d'), { type: options.type || 'line', data: { labels, datasets }, options: { responsive: true, maintainAspectRatio: false, animation: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { labels: { color: '#dce8ef', boxWidth: 12, font: { size: 10 } } }, tooltip: { callbacks: { title: (items) => items[0]?.label || '' } } }, scales: { x: { ticks: { color: '#8298a8', maxTicksLimit: 8, font: { size: 9 } }, grid: { color: 'rgba(158,181,196,.08)' } }, y: { ticks: { color: '#8298a8', font: { size: 9 } }, grid: { color: 'rgba(158,181,196,.13)' } } }, ...options.chartOptions } });
      return canvas.__globalChart;
    }
    const ctx = canvas.getContext('2d'); const width = Math.max(280, parent?.clientWidth || 640); const ratio = Math.min(2, window.devicePixelRatio || 1); canvas.width = width * ratio; canvas.height = height * ratio; ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height); ctx.fillStyle = 'rgba(5,17,14,.28)'; ctx.fillRect(0,0,width,height); const flat = datasets.flatMap((d) => d.data.filter(Number.isFinite)); const min = Math.min(...flat, 0); const max = Math.max(...flat, 1); datasets.forEach((dataset) => { ctx.beginPath(); dataset.data.forEach((value, index) => { if (!Number.isFinite(value)) return; const x = 42 + (width - 58) * index / Math.max(1, labels.length - 1); const y = 22 + (height - 52) * (max - value) / Math.max(1e-9, max - min); if (index === 0) ctx.moveTo(x,y); else ctx.lineTo(x,y); }); ctx.strokeStyle = dataset.borderColor || '#ffb25f'; ctx.lineWidth = 2; ctx.stroke(); }); ctx.fillStyle = '#8298a8'; ctx.font = '10px DM Sans, sans-serif'; ctx.fillText(labels[0] || '', 42, height - 10); ctx.fillText(labels.at(-1) || '', width - 70, height - 10); return null;
  }

  function seriesLabels(rows, max = 90) { const selected = rows.slice(-max); return { rows: selected, labels: selected.map((row) => row.date || date(row.time)) }; }
  function returns(rows, key = 'close') { return rows.slice(1).map((row, index) => { const previous = Number(rows[index][key]); const current = Number(row[key]); return previous > 0 ? current / previous - 1 : NaN; }); }
  function rollingVol(rows, windowSize = 20, key = 'close') { const rs = returns(rows, key); if (rs.length < windowSize) return NaN; const slice = rs.slice(-windowSize).filter(Number.isFinite); const avg = slice.reduce((a,b) => a+b,0) / slice.length; return Math.sqrt(slice.reduce((sum, value) => sum + (value-avg)**2,0) / slice.length) * Math.sqrt(252); }
  function mean(values) { const v = values.filter(Number.isFinite); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : NaN; }
  function stdev(values) { const avg=mean(values); const v=values.filter(Number.isFinite); return v.length > 1 ? Math.sqrt(v.reduce((sum,x)=>sum+(x-avg)**2,0)/v.length) : NaN; }
  function normalize(values, start = 100) { const first = values.find((x) => Number.isFinite(x) && x > 0); return values.map((x) => first > 0 && Number.isFinite(x) ? x / first * start : NaN); }
  function latest(rows, key) { for (let i=rows.length-1;i>=0;i-=1) if (Number.isFinite(Number(rows[i][key]))) return Number(rows[i][key]); return NaN; }
  function htmlStat(label, value, note='') { return `<div class="global-inline-stat"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(note)}</small></div>`; }

  G.$=$; G.esc=esc; G.num=num; G.pct=pct; G.usd=usd; G.money=money; G.date=date; G.time=time; G.cleanSymbol=cleanSymbol; G.yahooHistory=yahooHistory; G.yahooOptions=yahooOptions; G.fredCsv=fredCsv; G.binanceFunding=binanceFunding; G.binanceForceOrders=binanceForceOrders; G.secJson=secJson; G.setStatus=setStatus; G.source=source; G.result=result; G.loading=loading; G.error=error; G.bindRetry=bindRetry; G.chart=chart; G.seriesLabels=seriesLabels; G.returns=returns; G.rollingVol=rollingVol; G.mean=mean; G.stdev=stdev; G.normalize=normalize; G.latest=latest; G.htmlStat=htmlStat;
  window.GlobalMarket = G;
})();
