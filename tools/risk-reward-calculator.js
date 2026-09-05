(() => {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const number = (id) => {
    const value = Number($(id)?.value);
    return Number.isFinite(value) ? value : NaN;
  };
  const finitePrice = (value, fallback = 0) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.min(1e12, Math.max(1e-8, parsed));
  };
  const setText = (id, value) => { if ($(id)) $(id).textContent = value; };
  const formatMoney = (value) => {
    if (!Number.isFinite(value)) return '—';
    if (Math.abs(value) >= 1e11) return value.toExponential(2);
    return value.toLocaleString('zh-TW', { maximumFractionDigits: 2 });
  };
  const priceDigits = (value) => {
    const absolute = Math.abs(Number(value) || 0);
    if (absolute >= 1000) return 2;
    if (absolute >= 1) return 4;
    return 8;
  };
  const formatPrice = (value) => Number.isFinite(value) ? value.toLocaleString('zh-TW', { minimumFractionDigits: 0, maximumFractionDigits: priceDigits(value) }) : '—';
  const percent = (value) => Number.isFinite(value) ? `${value.toLocaleString('zh-TW', { maximumFractionDigits: 2 })}%` : '—';
  const tvSymbolOverrides = {
    NQ: 'CME_MINI:NQ1!', ES: 'CME_MINI:ES1!', GOLD: 'TVC:GOLD', OIL: 'TVC:USOIL',
    XAUUSD: 'OANDA:XAUUSD', USOIL: 'TVC:USOIL', EURUSD: 'FX:EURUSD',
    QQQ: 'NASDAQ:QQQ', SPY: 'AMEX:SPY', BTCUSD: 'COINBASE:BTCUSD', ETHUSD: 'COINBASE:ETHUSD'
  };
  const yahooSymbolOverrides = {
    NQ: 'NQ=F', ES: 'ES=F', GOLD: 'GC=F', OIL: 'CL=F', XAUUSD: 'GC=F', USOIL: 'CL=F',
    EURUSD: 'EURUSD=X', BTCUSD: 'BTC-USD', ETHUSD: 'ETH-USD'
  };
  const binanceCryptoPattern = /(?:USDT|USDC|BUSD)$/;
  const isBinanceCrypto = (symbol) => binanceCryptoPattern.test(symbol);
  const isCrypto = (symbol) => isBinanceCrypto(symbol) || /^(?:BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|LINK|SUI)USD$/.test(symbol);
  const tradingViewSymbolFor = (symbol) => {
    if (tvSymbolOverrides[symbol]) return tvSymbolOverrides[symbol];
    if (/^\d{4}\.TW$/.test(symbol)) return `TWSE:${symbol.replace('.TW', '')}`;
    if (/^[A-Z]{6}$/.test(symbol) && /(?:USD|EUR|JPY|GBP|CHF|AUD|CAD|NZD)$/.test(symbol)) return `FX:${symbol}`;
    if (isCrypto(symbol) && /USD$/.test(symbol)) return `CRYPTOCAP:${symbol}`;
    return `NASDAQ:${symbol}`;
  };
  const yahooSymbolFor = (symbol) => yahooSymbolOverrides[symbol] || symbol;

  const symbolCatalog = [
    { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', market: '加密貨幣', category: 'crypto', group: '主流加密資產', source: 'Binance Public API', tv: 'BINANCE:BTCUSDT', binance: true, crypto: true },
    { symbol: 'ETHUSDT', name: 'Ethereum / Tether', market: '加密貨幣', category: 'crypto', group: '主流加密資產', source: 'Binance Public API', tv: 'BINANCE:ETHUSDT', binance: true, crypto: true },
    { symbol: 'SOLUSDT', name: 'Solana / Tether', market: '加密貨幣', category: 'crypto', group: '主流加密資產', source: 'Binance Public API', tv: 'BINANCE:SOLUSDT', binance: true, crypto: true },
    { symbol: 'BNBUSDT', name: 'BNB / Tether', market: '加密貨幣', category: 'crypto', group: '主流加密資產', source: 'Binance Public API', tv: 'BINANCE:BNBUSDT', binance: true, crypto: true },
    { symbol: 'DOGEUSDT', name: 'Dogecoin / Tether', market: '加密貨幣', category: 'crypto', group: '主流加密資產', source: 'Binance Public API', tv: 'BINANCE:DOGEUSDT', binance: true, crypto: true },
    { symbol: 'XRPUSDT', name: 'XRP / Tether', market: '加密貨幣', category: 'crypto', group: '主流加密資產', source: 'Binance Public API', tv: 'BINANCE:XRPUSDT', binance: true, crypto: true },
    { symbol: 'NQ', name: 'Nasdaq-100 E-mini Futures', market: '全球指數／期貨與大宗商品', category: 'global', group: '指數／24H 期貨', source: 'TradingView Advanced Chart', tv: 'CME_MINI:NQ1!', yahoo: 'NQ=F', binance: false, crypto: false },
    { symbol: 'ES', name: 'S&P 500 E-mini Futures', market: '全球指數／期貨與大宗商品', category: 'global', group: '指數／24H 期貨', source: 'TradingView Advanced Chart', tv: 'CME_MINI:ES1!', yahoo: 'ES=F', binance: false, crypto: false },
    { symbol: 'GOLD', name: 'Gold / XAUUSD', market: '全球指數／期貨與大宗商品', category: 'global', group: '大宗商品', source: 'TradingView Advanced Chart', tv: 'TVC:GOLD', yahoo: 'GC=F', binance: false, crypto: false },
    { symbol: 'OIL', name: 'Crude Oil / USOIL', market: '全球指數／期貨與大宗商品', category: 'global', group: '大宗商品', source: 'TradingView Advanced Chart', tv: 'TVC:USOIL', yahoo: 'CL=F', binance: false, crypto: false },
    { symbol: 'NVDA', name: 'NVIDIA', market: '美股科技權值', category: 'us', group: 'US Mega Tech', source: 'TradingView Advanced Chart', tv: 'NASDAQ:NVDA', yahoo: 'NVDA', binance: false, crypto: false },
    { symbol: 'TSLA', name: 'Tesla', market: '美股科技權值', category: 'us', group: 'US Mega Tech', source: 'TradingView Advanced Chart', tv: 'NASDAQ:TSLA', yahoo: 'TSLA', binance: false, crypto: false },
    { symbol: 'AAPL', name: 'Apple', market: '美股科技權值', category: 'us', group: 'US Mega Tech', source: 'TradingView Advanced Chart', tv: 'NASDAQ:AAPL', yahoo: 'AAPL', binance: false, crypto: false },
    { symbol: 'MSFT', name: 'Microsoft', market: '美股科技權值', category: 'us', group: 'US Mega Tech', source: 'TradingView Advanced Chart', tv: 'NASDAQ:MSFT', yahoo: 'MSFT', binance: false, crypto: false },
    { symbol: 'AMZN', name: 'Amazon', market: '美股科技權值', category: 'us', group: 'US Mega Tech', source: 'TradingView Advanced Chart', tv: 'NASDAQ:AMZN', yahoo: 'AMZN', binance: false, crypto: false },
    { symbol: 'QQQ', name: 'Nasdaq-100 ETF', market: '全球指數 ETF', category: 'global', group: '全球搜尋別名', source: 'TradingView Advanced Chart', tv: 'NASDAQ:QQQ', yahoo: 'QQQ', binance: false, crypto: false },
    { symbol: 'SPY', name: 'S&P 500 ETF', market: '全球指數 ETF', category: 'global', group: '全球搜尋別名', source: 'TradingView Advanced Chart', tv: 'AMEX:SPY', yahoo: 'SPY', binance: false, crypto: false },
    { symbol: 'XAUUSD', name: 'Gold Spot / U.S. Dollar', market: '全球商品／外匯', category: 'global', group: '全球搜尋別名', source: 'TradingView Advanced Chart', tv: 'OANDA:XAUUSD', yahoo: 'GC=F', binance: false, crypto: false },
    { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', market: '全球外匯', category: 'forex', group: '全球搜尋別名', source: 'TradingView Advanced Chart', tv: 'FX:EURUSD', yahoo: 'EURUSD=X', binance: false, crypto: false },
    { symbol: 'BTCUSD', name: 'Bitcoin / U.S. Dollar', market: '加密貨幣（非 Binance 路由）', category: 'crypto', group: '全球搜尋別名', source: 'TradingView Advanced Chart', tv: 'COINBASE:BTCUSD', yahoo: 'BTC-USD', binance: false, crypto: true },
    { symbol: 'ETHUSD', name: 'Ethereum / U.S. Dollar', market: '加密貨幣（非 Binance 路由）', category: 'crypto', group: '全球搜尋別名', source: 'TradingView Advanced Chart', tv: 'COINBASE:ETHUSD', yahoo: 'ETH-USD', binance: false, crypto: true }
  ];

  const timeframeConfig = {
    '1m': { interval: '1m', range: '1d', binanceLimit: 1000, yahooInterval: '1m' },
    '5m': { interval: '5m', range: '5d', binanceLimit: 1000, yahooInterval: '5m' },
    '15m': { interval: '15m', range: '30d', binanceLimit: 1000, yahooInterval: '15m' },
    '1h': { interval: '1h', range: '730d', binanceLimit: 1000, yahooInterval: '1h' },
    '4h': { interval: '4h', range: '730d', binanceLimit: 1000, yahooInterval: '1h' },
    '1d': { interval: '1d', range: '10y', binanceLimit: 1000, yahooInterval: '1d' },
    '1w': { interval: '1w', range: 'max', binanceLimit: 1000, yahooInterval: '1wk' }
  };

  const markerConfig = {
    entry: { input: 'rr-entry-price', color: '#7ed6b0', label: '進場', title: 'ENTRY' },
    stop: { input: 'rr-stop-price', color: '#f56f62', label: '停損', title: 'STOP' },
    target: { input: 'rr-target-price', color: '#ffb25f', label: '目標', title: 'TARGET' }
  };

  let chart = null;
  let candleSeries = null;
  let volumeSeries = null;
  let chartData = [];
  let activeMeta = symbolCatalog[0];
  let activeTimeframe = '1d';
  let priceLines = {};
  let dragState = null;
  let loadSequence = 0;
  let historyLoading = false;
  let historyExhausted = false;
  let historyDebounce = null;
  let liveSocket = null;
  let liveReconnectTimer = null;
  let liveReconnectDelay = 1200;
  let liveGeneration = 0;
  let livePrice = NaN;
  let entryPinnedToLive = false;
  let suggestionIndex = -1;
  let pendingHydration = null;
  const stateStorageKey = 'gugopro_rr_state_v1';
  const rrPersistedFields = ['rr-entry-price', 'rr-stop-price', 'rr-target-price', 'rr-risk-percent', 'rr-capital'];

  function readPersistedState() {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(stateStorageKey) || 'null');
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
      return null;
    }
  }

  function saveState() {
    try {
      const payload = { symbol: activeMeta.symbol, timeframe: $('rr-timeframe')?.value || activeTimeframe, entryPinnedToLive };
      rrPersistedFields.forEach((id) => { const value = $(id)?.value; if (value !== undefined) payload[id] = value; });
      window.localStorage.setItem(stateStorageKey, JSON.stringify(payload));
    } catch (error) { /* private browsing or storage quota can reject writes */ }
  }

  function hydrateState() {
    const saved = readPersistedState();
    if (!saved) return null;
    const symbol = cleanSymbol(saved.symbol || 'BTCUSDT');
    const timeframe = timeframeConfig[saved.timeframe] ? saved.timeframe : '1d';
    rrPersistedFields.forEach((id) => { if (saved[id] !== undefined && $(id)) $(id).value = saved[id]; });
    if ($('rr-timeframe')) $('rr-timeframe').value = timeframe;
    entryPinnedToLive = saved.entryPinnedToLive === true;
    return { ...saved, symbol, timeframe };
  }

  function applyRestoredParameters(saved) {
    if (!saved) return;
    rrPersistedFields.forEach((id) => { if (saved[id] !== undefined && $(id)) $(id).value = saved[id]; });
    entryPinnedToLive = saved.entryPinnedToLive === true;
  }

  function cleanSymbol(value) {
    let symbol = String(value || '').trim().toUpperCase().replace(/[\s/:-]/g, '');
    if (/^\d{4}$/.test(symbol)) symbol += '.TW';
    if (/^(BTC|ETH|SOL|BNB|XRP|DOGE|ADA|AVAX|LINK|SUI)$/.test(symbol)) symbol += 'USDT';
    return symbol || 'BTCUSDT';
  }

  function findMeta(value) {
    const symbol = cleanSymbol(value);
    return symbolCatalog.find((item) => item.symbol === symbol) || {
      symbol,
      name: symbol,
      market: isCrypto(symbol) ? '加密貨幣' : (/\.TW$/.test(symbol) ? '台股與台股 ETF' : '全球金融商品'),
      category: isCrypto(symbol) ? 'crypto' : (/\.TW$/.test(symbol) ? 'tw' : 'global'),
      group: '自由輸入代碼',
      source: isBinanceCrypto(symbol) ? 'Binance Public API' : 'TradingView Advanced Chart',
      tv: tradingViewSymbolFor(symbol),
      yahoo: yahooSymbolFor(symbol),
      binance: isBinanceCrypto(symbol),
      crypto: isCrypto(symbol)
    };
  }

  function fetchWithTimeout(url, timeout = 12000) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeout);
    return fetch(url, { signal: controller.signal, mode: 'cors', cache: 'no-store' }).finally(() => window.clearTimeout(timer));
  }

  function parseBinanceRows(rows) {
    return rows.map((row) => ({
      time: Math.floor(Number(row[0]) / 1000),
      open: Number(row[1]), high: Number(row[2]), low: Number(row[3]), close: Number(row[4]), volume: Number(row[5])
    })).filter((row) => [row.time, row.open, row.high, row.low, row.close].every(Number.isFinite));
  }

  function mergeCandles(...sets) {
    const byTime = new Map();
    sets.flat().forEach((row) => { if (row && Number.isFinite(row.time)) byTime.set(row.time, row); });
    return Array.from(byTime.values()).sort((a, b) => a.time - b.time);
  }

  async function fetchBinancePage(symbol, timeframe, endTime, timeout = 12000) {
    const config = timeframeConfig[timeframe] || timeframeConfig['1d'];
    const end = Number.isFinite(endTime) ? `&endTime=${Math.max(0, Math.floor(endTime))}` : '';
    const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=${config.interval}&limit=${config.binanceLimit}${end}`;
    const response = await fetchWithTimeout(url, timeout);
    if (!response.ok) throw new Error(`Binance HTTP ${response.status}`);
    const rows = parseBinanceRows(await response.json());
    if (rows.length < 12) throw new Error('Binance K 線資料不足');
    return rows;
  }

  async function fetchBinanceInitial(symbol, timeframe, timeout = 14000) {
    const first = await fetchBinancePage(symbol, timeframe, undefined, timeout);
    if (first.length < 1000) return first;
    try {
      const older = await fetchBinancePage(symbol, timeframe, first[0].time * 1000 - 1, timeout);
      return mergeCandles(older, first);
    } catch (error) {
      return first;
    }
  }

  async function fetchYahoo(symbol, timeframe, timeout = 12000) {
    const config = timeframeConfig[timeframe] || timeframeConfig['1d'];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${config.range}&interval=${config.yahooInterval}&includePrePost=false&events=div%2Csplits`;
    let json;
    try {
      const response = await fetchWithTimeout(url, timeout);
      if (!response.ok) throw new Error(`Yahoo HTTP ${response.status}`);
      json = await response.json();
    } catch (directError) {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const proxyResponse = await fetchWithTimeout(proxyUrl, timeout + 4000);
      if (!proxyResponse.ok) throw directError;
      const wrapper = await proxyResponse.json();
      json = JSON.parse(wrapper.contents);
    }
    const result = json?.chart?.result?.[0];
    if (!result?.timestamp?.length) throw new Error('Yahoo K 線資料不足');
    const quote = result.indicators?.quote?.[0] || {};
    let parsed = result.timestamp.map((time, index) => ({ time: Number(time), open: Number(quote.open?.[index]), high: Number(quote.high?.[index]), low: Number(quote.low?.[index]), close: Number(quote.close?.[index]), volume: Number(quote.volume?.[index] || 0) })).filter((row) => [row.time, row.open, row.high, row.low, row.close].every(Number.isFinite));
    if (timeframe === '4h') parsed = resampleCandles(parsed, 4 * 60 * 60);
    if (parsed.length < 12) throw new Error('Yahoo K 線資料不足');
    return parsed;
  }

  function resampleCandles(data, bucketSeconds) {
    const buckets = new Map();
    data.forEach((row) => {
      const bucket = Math.floor(row.time / bucketSeconds) * bucketSeconds;
      const previous = buckets.get(bucket);
      if (!previous) buckets.set(bucket, { time: bucket, open: row.open, high: row.high, low: row.low, close: row.close, volume: row.volume || 0 });
      else { previous.high = Math.max(previous.high, row.high); previous.low = Math.min(previous.low, row.low); previous.close = row.close; previous.volume += row.volume || 0; }
    });
    return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
  }

  function initChart() {
    if (!window.LightweightCharts || !$('rr-chart')) throw new Error('Lightweight Charts 尚未載入');
    const container = $('rr-chart');
    chart = window.LightweightCharts.createChart(container, {
      width: container.clientWidth, height: Math.max(380, container.clientHeight || 456),
      layout: { background: { type: 'solid', color: '#07131d' }, textColor: '#a8bcc5', fontFamily: 'DM Sans, sans-serif' },
      grid: { vertLines: { color: 'rgba(152, 182, 190, 0.08)' }, horzLines: { color: 'rgba(152, 182, 190, 0.08)' } },
      crosshair: { mode: 0, vertLine: { color: 'rgba(255, 178, 95, 0.5)', width: 1, style: 2 }, horzLine: { color: 'rgba(126, 214, 176, 0.6)', width: 1, style: 2 } },
      rightPriceScale: { borderColor: 'rgba(176, 202, 208, 0.25)', scaleMargins: { top: 0.08, bottom: 0.18 } },
      timeScale: { borderColor: 'rgba(176, 202, 208, 0.25)', timeVisible: true, secondsVisible: false, rightOffset: 4 },
      handleScroll: { mouseWheel: true, pressedMouseMove: true }, handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true }
    });
    candleSeries = chart.addCandlestickSeries({ upColor: '#5fd3a0', downColor: '#f56f62', borderUpColor: '#5fd3a0', borderDownColor: '#f56f62', wickUpColor: '#5fd3a0', wickDownColor: '#f56f62', priceLineVisible: false, lastValueVisible: true });
    volumeSeries = chart.addHistogramSeries({ priceFormat: { type: 'volume' }, priceScaleId: '', scaleMargins: { top: 0.82, bottom: 0 } });
    volumeSeries.applyOptions({ color: 'rgba(126, 214, 176, 0.35)' });
    const observer = new ResizeObserver(() => chart?.resize(container.clientWidth, Math.max(380, container.clientHeight || 456)));
    observer.observe(container);
    container.addEventListener('pointerdown', beginNativeDrag);
    container.addEventListener('pointermove', moveNativeDrag);
    window.addEventListener('pointerup', endNativeDrag);
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (range && range.from < 28 && chartData.length > 0 && !historyLoading && !historyExhausted) {
        window.clearTimeout(historyDebounce);
        historyDebounce = window.setTimeout(() => loadOlderHistory(), 220);
      }
    });
  }

  function renderChart(preserveLogicalRange = null) {
    if (!candleSeries || !volumeSeries || !chartData.length) return;
    candleSeries.setData(chartData.map((row) => ({ time: row.time, open: row.open, high: row.high, low: row.low, close: row.close })));
    volumeSeries.setData(chartData.map((row) => ({ time: row.time, value: Math.max(0, row.volume || 0), color: row.close >= row.open ? 'rgba(95, 211, 160, 0.34)' : 'rgba(245, 111, 98, 0.34)' })));
    if (preserveLogicalRange && Number.isFinite(preserveLogicalRange.from) && Number.isFinite(preserveLogicalRange.to)) chart.timeScale().setVisibleLogicalRange(preserveLogicalRange);
    else chart.timeScale().fitContent();
  }

  function removePriceLines() {
    if (!candleSeries) return;
    Object.values(priceLines).forEach((line) => { try { candleSeries.removePriceLine(line); } catch (error) { /* already removed */ } });
    priceLines = {};
  }

  function renderNativePriceLines() {
    if (!candleSeries || !chartData.length) return;
    removePriceLines();
    Object.entries(markerConfig).forEach(([name, config]) => {
      const value = finitePrice(number(config.input), NaN);
      if (!Number.isFinite(value)) return;
      priceLines[name] = candleSeries.createPriceLine({ price: value, color: config.color, lineWidth: 2, lineStyle: 0, axisLabelVisible: true, title: config.title });
    });
  }

  function nearestMarker(y) {
    if (!candleSeries) return null;
    const candidates = Object.entries(markerConfig).map(([name, config]) => {
      const price = finitePrice(number(config.input), NaN);
      const coordinate = Number.isFinite(price) ? candleSeries.priceToCoordinate(price) : null;
      return { name, coordinate };
    }).filter((item) => Number.isFinite(item.coordinate));
    candidates.sort((a, b) => Math.abs(a.coordinate - y) - Math.abs(b.coordinate - y));
    return candidates[0] && Math.abs(candidates[0].coordinate - y) <= 16 ? candidates[0].name : null;
  }

  function beginNativeDrag(event) {
    if (!candleSeries || !chartData.length || event.button !== 0) return;
    const rect = $('rr-chart').getBoundingClientRect();
    const marker = nearestMarker(event.clientY - rect.top);
    if (!marker) return;
    dragState = { marker, pointerId: event.pointerId };
    $('rr-chart').setPointerCapture?.(event.pointerId);
    document.body.classList.add('is-dragging-price');
    event.preventDefault();
  }

  function moveNativeDrag(event) {
    if (!dragState || !candleSeries) return;
    const rect = $('rr-chart').getBoundingClientRect();
    const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
    const price = finitePrice(candleSeries.coordinateToPrice(y), NaN);
    const input = $(markerConfig[dragState.marker].input);
    if (!input || !Number.isFinite(price)) return;
    input.value = price.toFixed(priceDigits(price));
    if (dragState.marker === 'entry') entryPinnedToLive = false;
    calculate();
    event.preventDefault();
  }

  function endNativeDrag() {
    if (!dragState) return;
    dragState = null;
    document.body.classList.remove('is-dragging-price');
  }

  function calculate() {
    const entry = finitePrice(number('rr-entry-price'), NaN);
    const stop = finitePrice(number('rr-stop-price'), NaN);
    const target = finitePrice(number('rr-target-price'), NaN);
    const capital = Math.max(0, number('rr-capital'));
    const riskPercent = Math.min(100, Math.max(0, number('rr-risk-percent')));
    const unitRisk = Math.abs(entry - stop);
    const unitReward = Math.abs(target - entry);
    const validNumbers = [entry, stop, target, capital, riskPercent].every(Number.isFinite) && unitRisk > 0 && unitReward > 0;
    const isLong = validNumbers && target > entry && entry > stop;
    const isShort = validNumbers && target < entry && entry < stop;
    const direction = isLong ? '多頭計畫 / LONG' : isShort ? '空頭計畫 / SHORT' : validNumbers ? '價格方向不一致' : '等待輸入';
    const budget = capital * riskPercent / 100;
    const position = validNumbers ? Math.floor(budget / unitRisk) : 0;
    const ratio = validNumbers ? unitReward / unitRisk : NaN;
    const notional = position * entry;
    const profit = position * unitReward;
    setText('rr-ratio', Number.isFinite(ratio) ? `${ratio.toFixed(2)}R` : '—');
    setText('rr-direction', direction);
    setText('rr-hud-position', validNumbers ? position.toLocaleString('zh-TW') : '—');
    setText('rr-position-size', validNumbers ? position.toLocaleString('zh-TW') : '—');
    setText('rr-hud-budget', Number.isFinite(budget) ? `風險預算 ${formatMoney(budget)}` : '風險預算 —');
    setText('rr-status', !validNumbers ? '請輸入有效的正數價格、資金與風險百分比。' : (!isLong && !isShort ? '進出場方向不一致：多頭需目標 ＞ 進場 ＞ 停損，空頭需目標 ＜ 進場 ＜ 停損。' : `建議 ${position.toLocaleString('zh-TW')} 單位；名目部位 ${formatMoney(notional)}；模型潛在獲利 ${formatMoney(profit)}，尚未扣除費用、滑價與跳空。`));
    $('rr-hud')?.classList.toggle('is-invalid', validNumbers && !isLong && !isShort);
    renderNativePriceLines();
    saveState();
  }

  function getSwingLevels(data, lookbackCount = 120) {
    const lookback = (data || []).slice(-Math.min(lookbackCount, (data || []).length));
    if (!lookback.length) return null;
    const current = finitePrice(lookback[lookback.length - 1].close, NaN);
    const swingHigh = finitePrice(Math.max(...lookback.map((row) => row.high)), NaN);
    const swingLow = finitePrice(Math.min(...lookback.map((row) => row.low)), NaN);
    return { lookback, current, swingHigh, swingLow };
  }

  function calculateStructure(data) {
    const swing = getSwingLevels(data);
    if (!swing || !Number.isFinite(swing.current) || !Number.isFinite(swing.swingHigh) || !Number.isFinite(swing.swingLow)) return;
    const { lookback, current, swingHigh, swingLow } = swing;
    const trs = lookback.slice(1).map((row, index) => Math.max(row.high - row.low, Math.abs(row.high - lookback[index].close), Math.abs(row.low - lookback[index].close))).filter(Number.isFinite);
    const atr = trs.slice(-14).reduce((sum, value) => sum + value, 0) / Math.max(1, Math.min(14, trs.length));
    const atrPercent = current ? (atr / current) * 100 : NaN;
    setText('rr-support-level', formatPrice(swingLow));
    setText('rr-resistance-level', formatPrice(swingHigh));
    setText('rr-volatility-level', Number.isFinite(atrPercent) ? `${percent(atrPercent)} ATR` : '—');
    setText('rr-structure-note', `近 ${lookback.length} 根 K 線；最新價 ${formatPrice(current)}；停損最低 ${formatPrice(swingLow)}／目標最高 ${formatPrice(swingHigh)}`);
    $('rr-use-support')?.setAttribute('data-price', String(swingLow));
    $('rr-use-resistance')?.setAttribute('data-price', String(swingHigh));
  }

  function setPlanAround(lastClose, data = chartData) {
    const swing = getSwingLevels(data);
    const current = finitePrice(lastClose, NaN);
    if (!swing || !Number.isFinite(current)) return;
    const digits = priceDigits(current);
    const entry = Number(current.toFixed(digits));
    const stopBase = swing.swingLow < current ? swing.swingLow : current * 0.97;
    const targetBase = swing.swingHigh > current ? swing.swingHigh : current * 1.06;
    $('rr-entry-price').value = entry;
    $('rr-stop-price').value = Number(finitePrice(stopBase, current * 0.97).toFixed(digits));
    $('rr-target-price').value = Number(finitePrice(targetBase, current * 1.06).toFixed(digits));
    entryPinnedToLive = true;
  }

  function updateLivePrice(price, source = 'WebSocket') {
    const next = finitePrice(price, NaN);
    if (!Number.isFinite(next)) return;
    livePrice = next;
    setText('rr-hud-live-price', formatPrice(next));
    if (entryPinnedToLive) {
      $('rr-entry-price').value = next.toFixed(priceDigits(next));
      calculate();
    }
    setText('rr-stream-status', `${source} · ${new Date().toLocaleTimeString('zh-TW', { hour12: false })}`);
  }

  function closeLiveStream() {
    liveGeneration += 1;
    window.clearTimeout(liveReconnectTimer);
    liveReconnectTimer = null;
    if (liveSocket) { try { liveSocket.close(); } catch (error) { /* already closed */ } liveSocket = null; }
    $('rr-hud')?.classList.remove('is-stream-connected');
    setText('rr-stream-status', 'WebSocket 未連線');
  }

  function scheduleLiveReconnect(generation) {
    if (generation !== liveGeneration || document.hidden || !activeMeta.binance) return;
    window.clearTimeout(liveReconnectTimer);
    liveReconnectTimer = window.setTimeout(() => connectLiveStream(), liveReconnectDelay);
    liveReconnectDelay = Math.min(30000, Math.round(liveReconnectDelay * 1.7));
  }

  function connectLiveStream() {
    closeLiveStream();
    if (!activeMeta.binance || typeof WebSocket === 'undefined' || document.hidden) {
      setText('rr-stream-status', activeMeta.binance ? '瀏覽器不支援 WebSocket' : '非 Binance 全球商品使用 TradingView 圖表');
      return;
    }
    const generation = liveGeneration;
    const stream = `${activeMeta.symbol.toLowerCase()}@ticker`;
    try {
      liveSocket = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`);
      liveSocket.addEventListener('open', () => {
        if (generation !== liveGeneration) return;
        liveReconnectDelay = 1200;
        $('rr-hud')?.classList.add('is-stream-connected');
        setText('rr-stream-status', 'Binance WebSocket 已連線 · ticker');
      });
      liveSocket.addEventListener('message', (event) => {
        if (generation !== liveGeneration) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload?.s === activeMeta.symbol) updateLivePrice(payload.c, 'Binance ticker');
        } catch (error) { /* ignore malformed frames */ }
      });
      liveSocket.addEventListener('error', () => setText('rr-stream-status', 'WebSocket 連線異常，準備重連'));
      liveSocket.addEventListener('close', () => {
        if (generation !== liveGeneration) return;
        $('rr-hud')?.classList.remove('is-stream-connected');
        setText('rr-stream-status', 'WebSocket 已斷線，準備重連');
        scheduleLiveReconnect(generation);
      });
    } catch (error) {
      setText('rr-stream-status', 'WebSocket 無法建立，準備重連');
      scheduleLiveReconnect(generation);
    }
  }

  async function loadOlderHistory() {
    if (!activeMeta.binance || historyLoading || historyExhausted || !chartData.length) return;
    historyLoading = true;
    const oldRange = chart?.timeScale().getVisibleLogicalRange?.();
    setText('rr-history-status', '正在載入更早歷史…');
    $('rr-load-older')?.setAttribute('disabled', 'disabled');
    try {
      const oldest = chartData[0].time * 1000 - 1;
      const older = await fetchBinancePage(activeMeta.symbol, activeTimeframe, oldest, 14000);
      const beforeCount = chartData.length;
      chartData = mergeCandles(older, chartData);
      const added = chartData.length - beforeCount;
      if (added < 10 || older.length < (timeframeConfig[activeTimeframe]?.binanceLimit || 1000)) historyExhausted = true;
      renderChart(oldRange && added ? { from: oldRange.from + added, to: oldRange.to + added } : oldRange);
      calculateStructure(chartData);
      calculate();
      setText('rr-history-status', historyExhausted ? `歷史已接近資料起點 · ${chartData.length.toLocaleString()} 根` : `已載入 ${chartData.length.toLocaleString()} 根 · 可繼續向左捲動`);
    } catch (error) {
      setText('rr-history-status', `歷史載入失敗：${error.name === 'AbortError' ? '逾時' : '稍後重試'}`);
    } finally {
      historyLoading = false;
      $('rr-load-older')?.removeAttribute('disabled');
    }
  }

  function renderTradingViewWidget(symbol, reason = '公開行情端點暫時無法連線') {
    const widget = $('rr-tv-widget');
    if (!widget) return;
    const meta = findMeta(symbol);
    const interval = ({ '1m': '1', '5m': '5', '15m': '15', '1h': '60', '4h': '240', '1d': 'D', '1w': 'W' })[$('rr-timeframe')?.value] || 'D';
    const src = `https://www.tradingview.com/widgetembed/?symbol=${encodeURIComponent(meta.tv)}&interval=${interval}&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=%2307131d&theme=dark&style=1&timezone=Asia%2FTaipei&withdateranges=1&hideideas=1&studies=Volume%40tv-basicstudies`;
    widget.innerHTML = `<div class="rr-tv-fallback-note"><i class="fa-solid fa-chart-line"></i><strong>${reason}</strong><span>目前顯示 TradingView Advanced Chart；原生價格線需在公開行情可用時使用，HUD 數值欄位仍可調整。</span></div><iframe title="TradingView ${meta.symbol} 即時圖表" src="${src}" loading="eager" allow="fullscreen" referrerpolicy="origin"></iframe>`;
    widget.classList.add('is-visible');
    $('rr-chart')?.classList.add('is-fallback-hidden');
  }

  function syncQuickSymbol(symbol) {
    const quick = $('rr-quick-symbol');
    if (!quick) return;
    const normalized = cleanSymbol(symbol);
    quick.value = Array.from(quick.options).some((option) => option.value === normalized) ? normalized : '';
  }

  async function loadSymbol(value = $('rr-symbol-search')?.value) {
    const meta = findMeta(value);
    const timeframe = $('rr-timeframe')?.value || '1d';
    const requestId = ++loadSequence;
    activeMeta = meta;
    activeTimeframe = timeframe;
    closeLiveStream();
    livePrice = NaN;
    historyExhausted = false;
    if ($('rr-symbol-search')) $('rr-symbol-search').value = meta.symbol;
    syncQuickSymbol(meta.symbol);
    saveState();
    setText('rr-active-symbol', meta.symbol);
    setText('rr-active-name', meta.name);
    setText('rr-hud-live-price', '—');
    setText('rr-data-status', `載入 ${meta.symbol} · ${meta.source}…`);
    setText('rr-history-status', '正在取得長週期歷史…');
    $('rr-tv-widget')?.classList.remove('is-visible');
    $('rr-chart')?.classList.remove('is-fallback-hidden');
    if (!meta.binance) {
      chartData = [];
      if (pendingHydration && pendingHydration.symbol === meta.symbol && pendingHydration.timeframe === timeframe) pendingHydration = null;
      renderTradingViewWidget(meta.symbol, '非 Binance 全球商品由 TradingView Advanced Chart 直接提供');
      setText('rr-data-status', `已切換 TradingView Advanced Chart · ${meta.symbol}`);
      setText('rr-history-status', '全球商品圖表由 TradingView 提供；HUD 參數仍可在瀏覽器端調整。');
      setText('rr-support-level', '—'); setText('rr-resistance-level', '—'); setText('rr-volatility-level', 'TradingView 圖表');
      calculate();
      connectLiveStream();
      return;
    }
    try {
      chartData = await fetchBinanceInitial(meta.symbol, timeframe);
      if (requestId !== loadSequence) return;
      if (!chart) initChart();
      renderChart();
      const lastClose = chartData[chartData.length - 1].close;
      if (pendingHydration && pendingHydration.symbol === meta.symbol && pendingHydration.timeframe === timeframe) {
        applyRestoredParameters(pendingHydration);
        pendingHydration = null;
      } else {
        setPlanAround(lastClose);
      }
      updateLivePrice(lastClose, 'REST snapshot');
      setText('rr-data-status', `${meta.source} · ${chartData.length.toLocaleString()} 根 K 線 · ${new Date(chartData[chartData.length - 1].time * 1000).toLocaleString('zh-TW')}`);
      setText('rr-history-status', meta.binance ? `已載入 ${chartData.length.toLocaleString()} 根 · 向左捲動載入更早資料` : `已載入 ${chartData.length.toLocaleString()} 根 · ${timeframe}`);
      calculateStructure(chartData);
      calculate();
      connectLiveStream();
    } catch (error) {
      if (requestId !== loadSequence) return;
      chartData = [];
      renderTradingViewWidget(meta.symbol, `公開 K 線端點失敗：${error.name === 'AbortError' ? '連線逾時' : error.message}`);
      setText('rr-data-status', `已切換 TradingView · ${meta.symbol}`);
      setText('rr-history-status', '公開歷史暫時不可用；可用數值欄位離線調整風報計畫。');
      setText('rr-support-level', '—'); setText('rr-resistance-level', '—'); setText('rr-volatility-level', '—');
      calculate();
      connectLiveStream();
    }
  }

  function hideSuggestions(inputId = 'rr-symbol-search', boxId = 'rr-symbol-suggestions') {
    const input = $(inputId); const box = $(boxId); if (box) box.classList.remove('is-visible'); if (input) { input.setAttribute('aria-expanded', 'false'); input.removeAttribute('aria-activedescendant'); } suggestionIndex = -1;
  }
  function updateSuggestions() {
    const input = $('rr-symbol-search'); const box = $('rr-symbol-suggestions'); if (!input || !box) return;
    const query = String(input.value || '').trim().toUpperCase().replace(/[\s/:-]/g, '');
    const matches = (query ? symbolCatalog.filter((item) => item.symbol.includes(query) || item.name.toUpperCase().includes(query) || item.market.includes(query) || item.group.toUpperCase().includes(query)) : symbolCatalog).slice(0, 8);
    const normalizedQuery = query ? cleanSymbol(query) : '';
    const hasExactCatalogMatch = normalizedQuery && symbolCatalog.some((item) => item.symbol === normalizedQuery);
    const freeEntry = query.length >= 2 && !hasExactCatalogMatch ? `<button type="button" role="option" id="rr-suggestion-free" data-symbol="${escapeHtml(normalizedQuery)}" aria-selected="false"><span class="rr-suggestion-main"><b>${escapeHtml(normalizedQuery)}</b><em>任意標準代碼</em></span><span class="rr-suggestion-market global">自動判斷資料來源<small>Binance／TradingView</small></span></button>` : '';
    suggestionIndex = -1;
    box.innerHTML = matches.map((item, index) => `<button type="button" role="option" id="rr-suggestion-${index}" data-symbol="${item.symbol}" aria-selected="false"><span class="rr-suggestion-main"><b>${item.symbol}</b><em>${item.name}</em></span><span class="rr-suggestion-market ${item.category}">${item.market}<small>${item.group}</small></span></button>`).join('') + freeEntry || '<div class="rr-suggestions-empty">找不到符合的商品，請改用代號或名稱。</div>';
    const visible = Boolean((matches.length || freeEntry) && document.activeElement === input);
    box.classList.toggle('is-visible', visible); input.setAttribute('aria-expanded', String(visible));
  }
  function activateSuggestion(index) {
    const box = $('rr-symbol-suggestions'); const buttons = box ? [...box.querySelectorAll('button[data-symbol]')] : []; if (!buttons.length) return false;
    suggestionIndex = Math.max(0, Math.min(index, buttons.length - 1)); buttons.forEach((button, itemIndex) => { const active = itemIndex === suggestionIndex; button.classList.toggle('is-active', active); button.setAttribute('aria-selected', String(active)); if (active) { button.scrollIntoView({ block: 'nearest' }); $('rr-symbol-search')?.setAttribute('aria-activedescendant', button.id); } }); return true;
  }
  function chooseSuggestion(symbol) {
    const normalized = cleanSymbol(symbol); if ($('rr-symbol-search')) $('rr-symbol-search').value = normalized; hideSuggestions(); loadSymbol(normalized);
  }

  const scannerPool = [
    { symbol: 'BTCUSDT', name: 'Bitcoin', category: 'crypto' }, { symbol: 'ETHUSDT', name: 'Ethereum', category: 'crypto' }, { symbol: 'SOLUSDT', name: 'Solana', category: 'crypto' }, { symbol: 'BNBUSDT', name: 'BNB', category: 'crypto' }, { symbol: 'XRPUSDT', name: 'XRP', category: 'crypto' }, { symbol: 'DOGEUSDT', name: 'Dogecoin', category: 'crypto' },
    { symbol: 'NQ', name: 'Nasdaq-100 Futures', category: 'global' }, { symbol: 'ES', name: 'S&P 500 Futures', category: 'global' }, { symbol: 'GOLD', name: 'Gold', category: 'global' }, { symbol: 'OIL', name: 'Crude Oil', category: 'global' }, { symbol: 'EURUSD', name: 'Euro / U.S. Dollar', category: 'forex' },
    { symbol: 'AAPL', name: 'Apple', category: 'us' }, { symbol: 'MSFT', name: 'Microsoft', category: 'us' }, { symbol: 'NVDA', name: 'NVIDIA', category: 'us' }, { symbol: 'TSLA', name: 'Tesla', category: 'us' }, { symbol: 'AMZN', name: 'Amazon', category: 'us' }, { symbol: 'QQQ', name: 'Nasdaq-100 ETF', category: 'global' }
  ];
  let scannerCategory = 'all';
  let scannerSequence = 0;

  function escapeHtml(value) { return String(value).replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character])); }
  function scannerUniverse() { return scannerPool.filter((item) => scannerCategory === 'all' || item.category === scannerCategory); }
  function scannerLabel(category) { return category === 'crypto' ? '加密貨幣' : category === 'us' ? '美股科技' : category === 'forex' ? '外匯' : '全球商品／指數'; }
  function valueOfScanner(id, fallback) { const parsed = Number($(id)?.value); return Number.isFinite(parsed) ? parsed : fallback; }
  function analyzeScannerData(meta, data, lookbackCount) {
    const swing = getSwingLevels(data, lookbackCount);
    if (!swing || !Number.isFinite(swing.current) || !Number.isFinite(swing.swingHigh) || !Number.isFinite(swing.swingLow) || swing.current <= 0) return null;
    const riskDistance = swing.current - swing.swingLow; const rewardDistance = swing.swingHigh - swing.current;
    if (!(riskDistance > 0) || !(rewardDistance > 0)) return null;
    const range = Math.max(swing.swingHigh - swing.swingLow, swing.current * 1e-8); const rr = rewardDistance / riskDistance;
    const riskPercent = (riskDistance / swing.current) * 100; const rewardPercent = (rewardDistance / swing.current) * 100;
    const min = Math.max(0, valueOfScanner('rr-scanner-min-rr', 2)); const nearSupport = riskDistance / range <= 0.22; const nearResistance = rewardDistance / range <= 0.22;
    const status = rr >= min ? '高風報機會' : nearSupport ? '接近支撐' : nearResistance ? '接近波段高點' : '觀察中';
    const statusClass = rr >= min ? 'is-opportunity' : nearSupport ? 'is-support' : nearResistance ? 'is-resistance' : 'is-neutral';
    return { meta, current: swing.current, swingLow: swing.swingLow, swingHigh: swing.swingHigh, rr, riskPercent, rewardPercent, status, statusClass };
  }
  async function fetchScannerCandles(item, timeframe) { const meta = findMeta(item.symbol); return meta.binance ? fetchBinancePage(meta.symbol, timeframe, undefined, 8000) : fetchYahoo(meta.yahoo || meta.symbol, timeframe, 8000); }
  function renderScannerResults(results, minRR) {
    const body = $('rr-scanner-body'); if (!body) return; const ordered = results.slice().sort((a, b) => b.rr - a.rr); setText('rr-scanner-success', String(ordered.length));
    if (!ordered.length) { body.innerHTML = '<tr><td colspan="8" class="rr-scanner-empty"><i class="fa-solid fa-circle-question"></i> 目前條件沒有可用資料；可切換週期或稍後重試。</td></tr>'; return; }
    body.innerHTML = ordered.map((result) => { const meets = result.rr >= minRR; return `<tr class="rr-scanner-row" data-scanner-symbol="${escapeHtml(result.meta.symbol)}" data-scanner-timeframe="${escapeHtml($('rr-scanner-timeframe')?.value || '1d')}"><td><button type="button" class="rr-scanner-symbol" data-scanner-symbol="${escapeHtml(result.meta.symbol)}"><strong>${escapeHtml(result.meta.symbol)}</strong><span>${escapeHtml(result.meta.name)}</span></button></td><td><span class="rr-scanner-market">${scannerLabel(result.meta.category)}</span></td><td>${formatPrice(result.current)}</td><td class="rr-scanner-low">${formatPrice(result.swingLow)}<small> −${percent(result.riskPercent)}</small></td><td class="rr-scanner-high">${formatPrice(result.swingHigh)}<small> +${percent(result.rewardPercent)}</small></td><td>${percent(result.riskPercent)}</td><td><strong class="rr-scanner-rr ${meets ? 'is-opportunity' : ''}">${result.rr.toFixed(2)}R</strong></td><td><span class="rr-scanner-status ${result.statusClass}">${escapeHtml(result.status)}</span><button type="button" class="rr-scanner-load" data-scanner-symbol="${escapeHtml(result.meta.symbol)}" data-scanner-timeframe="${escapeHtml($('rr-scanner-timeframe')?.value || '1d')}">帶入圖表</button></td></tr>`; }).join('');
  }
  async function startScanner() {
    const runId = ++scannerSequence; const timeframe = $('rr-scanner-timeframe')?.value || '1d'; const lookback = Math.max(30, Math.min(250, Math.floor(valueOfScanner('rr-scanner-lookback', 120)))); const minRR = Math.max(0, Math.min(20, valueOfScanner('rr-scanner-min-rr', 2))); const universe = scannerUniverse();
    const progressWrap = $('rr-scanner-progress-wrap'); const progressBar = $('rr-scanner-progress-bar'); const progressText = $('rr-scanner-progress-text'); const status = $('rr-scanner-status'); const button = $('rr-scanner-start');
    progressWrap?.removeAttribute('hidden'); if (button) button.disabled = true; if ($('rr-scanner-body')) $('rr-scanner-body').innerHTML = '<tr><td colspan="8" class="rr-scanner-empty"><i class="fa-solid fa-spinner fa-spin"></i> 正在批次讀取公開行情…</td></tr>'; setText('rr-scanner-success', '0');
    const results = []; const batchSize = 4;
    for (let start = 0; start < universe.length; start += batchSize) {
      const batch = universe.slice(start, start + batchSize); const batchResults = await Promise.all(batch.map(async (item) => { try { return analyzeScannerData({ ...item, category: item.category }, await fetchScannerCandles(item, timeframe), lookback); } catch (error) { return null; } }));
      if (runId !== scannerSequence) return; results.push(...batchResults.filter(Boolean)); const completed = Math.min(universe.length, start + batch.length); const progress = Math.round((completed / Math.max(1, universe.length)) * 100); if (progressBar) progressBar.style.width = `${progress}%`; setText('rr-scanner-progress-text', `${progress}%`); setText('rr-scanner-status', `已完成 ${completed}/${universe.length} 個標的，正在整理波段高低點`);
    }
    if (runId !== scannerSequence) return; renderScannerResults(results, minRR); setText('rr-scanner-status', `掃描完成：${results.length}/${universe.length} 個標的可用；結果依 R:R 由高至低排序`); if (button) button.disabled = false;
  }
  function loadScannerSelection(symbol, timeframe) { const nextTimeframe = timeframeConfig[timeframe] ? timeframe : '1d'; if ($('rr-timeframe')) $('rr-timeframe').value = nextTimeframe; syncTimeframeButtons(nextTimeframe); if ($('rr-symbol-search')) $('rr-symbol-search').value = cleanSymbol(symbol); $('rr-symbol-suggestions')?.classList.remove('is-visible'); loadSymbol(symbol); $('rr-chart-shell')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  function resetLines() { if (chartData.length) setPlanAround(chartData[chartData.length - 1].close, chartData); calculate(); }
  function syncTimeframeButtons(value) { document.querySelectorAll('[data-rr-timeframe]').forEach((button) => button.classList.toggle('is-active', button.dataset.rrTimeframe === value)); }

  function bind() {
    ['rr-stop-price', 'rr-target-price', 'rr-capital', 'rr-risk-percent'].forEach((id) => $(id)?.addEventListener('input', calculate));
    $('rr-entry-price')?.addEventListener('input', () => { entryPinnedToLive = false; calculate(); });
    $('rr-load-symbol')?.addEventListener('click', () => loadSymbol());
    window.GugoWatchlist?.mount({ prefix: 'rr', cleanSymbol, findMeta, onSelect: (symbol) => loadSymbol(symbol) });
    $('rr-quick-symbol')?.addEventListener('change', () => loadSymbol($('rr-quick-symbol').value));
    $('rr-timeframe')?.addEventListener('change', () => { syncTimeframeButtons($('rr-timeframe').value); loadSymbol(); });
    document.querySelectorAll('[data-rr-timeframe]').forEach((button) => button.addEventListener('click', () => { const timeframe = button.dataset.rrTimeframe; if (!$('rr-timeframe')) return; $('rr-timeframe').value = timeframe; syncTimeframeButtons(timeframe); loadSymbol(); }));
    $('rr-symbol-search')?.addEventListener('input', updateSuggestions); $('rr-symbol-search')?.addEventListener('focus', updateSuggestions);
    $('rr-symbol-search')?.addEventListener('keydown', (event) => {
      const box = $('rr-symbol-suggestions');
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { if (!box?.classList.contains('is-visible')) updateSuggestions(); const buttons = box ? [...box.querySelectorAll('button[data-symbol]')] : []; const next = event.key === 'ArrowDown' ? suggestionIndex + 1 : suggestionIndex - 1; if (activateSuggestion((next + buttons.length) % Math.max(1, buttons.length))) event.preventDefault(); }
      else if (event.key === 'Enter') { event.preventDefault(); const buttons = box ? [...box.querySelectorAll('button[data-symbol]')] : []; const active = buttons[suggestionIndex >= 0 ? suggestionIndex : 0]; active && box?.classList.contains('is-visible') ? chooseSuggestion(active.dataset.symbol) : loadSymbol(); if (!active || !box?.classList.contains('is-visible')) hideSuggestions(); }
      else if (event.key === 'Escape') { hideSuggestions(); }
    });
    $('rr-symbol-suggestions')?.addEventListener('click', (event) => { const button = event.target.closest('button[data-symbol]'); if (button) chooseSuggestion(button.dataset.symbol); });
    document.addEventListener('click', (event) => { if (!event.target.closest('.rr-search-wrap')) hideSuggestions(); });
    $('rr-use-support')?.addEventListener('click', () => { $('rr-stop-price').value = $('rr-use-support').dataset.price || ''; calculate(); });
    $('rr-use-resistance')?.addEventListener('click', () => { $('rr-target-price').value = $('rr-use-resistance').dataset.price || ''; calculate(); });
    $('rr-reset-lines')?.addEventListener('click', resetLines); $('rr-load-older')?.addEventListener('click', loadOlderHistory);
    document.querySelectorAll('[data-scanner-filter]').forEach((button) => button.addEventListener('click', () => { scannerCategory = button.dataset.scannerFilter || 'all'; document.querySelectorAll('[data-scanner-filter]').forEach((item) => item.classList.toggle('is-active', item === button)); }));
    $('rr-scanner-start')?.addEventListener('click', startScanner);
    $('rr-scanner-body')?.addEventListener('click', (event) => { const target = event.target.closest('[data-scanner-symbol]'); if (!target) return; loadScannerSelection(target.dataset.scannerSymbol, target.dataset.scannerTimeframe || $('rr-scanner-timeframe')?.value || '1d'); });
    document.addEventListener('visibilitychange', () => { if (document.hidden) closeLiveStream(); else connectLiveStream(); });
    pendingHydration = hydrateState();
    const params = new URLSearchParams(window.location.search); const requestedTimeframe = params.get('timeframe') || pendingHydration?.timeframe; if (timeframeConfig[requestedTimeframe]) { $('rr-timeframe').value = requestedTimeframe; syncTimeframeButtons(requestedTimeframe); }
    const requestedSymbol = params.get('symbol') || pendingHydration?.symbol || 'BTCUSDT'; $('rr-symbol-search').value = cleanSymbol(requestedSymbol); loadSymbol(requestedSymbol);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
