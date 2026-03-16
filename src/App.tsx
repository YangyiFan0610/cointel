import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface CoinData { price: number; change24h: number; high24h: number; low24h: number; volume24h: number; marketCap: number; }
interface FearGreed { value: string; classification: string; }
interface IntelItem { id: string; source: string; sourceTier: 'tier1'|'tier2'|'tier3'; dimension: 'macro'|'tech'|'regulation'|'institution'|'crypto'|'market'; title: string; summary: string; whyBTC: string; impactScore: number; sentiment: 'bullish'|'bearish'|'neutral'; time: string; pubDate: Date; imageUrl: string; link: string; }
interface MacroIndicator { name: string; nameEn: string; value: string; signal: 'bullish'|'bearish'|'neutral'; badge: string; logic: string; source: string; sourceUrl: string; }
interface EtfEntry { name: string; flow: number; }

// ─── Constants ────────────────────────────────────────────────────────────────
const MACRO_INDICATORS: MacroIndicator[] = [
  { name: 'CPI 通胀率', nameEn: 'Consumer Price Index', value: '加载中...', signal: 'neutral', badge: '每月发布', logic: '高于预期 → 通胀未降温 → 美联储维持高利率 → 资金留在债券 → BTC承压。低于预期 → 降息预期升温 → BTC受益。', source: 'BLS.gov 官方数据', sourceUrl: 'https://www.bls.gov/cpi/' },
  { name: '非农就业 NFP', nameEn: 'Non-Farm Payrolls', value: '加载中...', signal: 'neutral', badge: '每月第一个周五', logic: '强劲 → 经济过热不需要刺激 → 降息推迟 → BTC短期承压。疲软 → 需要刺激 → 降息预期升 → BTC受益。', source: 'BLS.gov 官方数据', sourceUrl: 'https://www.bls.gov/news.release/empsit.nr0.htm' },
  { name: '美联储降息概率', nameEn: 'Fed Rate Cut Probability', value: '加载中...', signal: 'neutral', badge: '实时更新', logic: '降息概率上升 → 流动性宽松预期 → 风险资产受益 → BTC上涨。降息概率下降 → 高利率持续预期 → BTC承压。', source: 'CME FedWatch', sourceUrl: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
  { name: 'DXY 美元指数', nameEn: 'US Dollar Index', value: '加载中...', signal: 'neutral', badge: '实时', logic: '美元走强 → BTC以美元计价相对贬值 → 外资买入成本升高 → 价格承压。美元走弱 → BTC相对升值 → 有利于上涨。', source: 'TradingView 图表', sourceUrl: 'https://www.tradingview.com/chart/?symbol=TVC:DXY' },
  { name: '美债10年收益率', nameEn: '10-Year Treasury Yield', value: '加载中...', signal: 'neutral', badge: '实时', logic: '收益率上升 → 无风险资产回报提高 → 持有BTC机会成本变大 → 资金转向债券 → BTC下跌。收益率下降则相反。', source: 'TradingView 图表', sourceUrl: 'https://www.tradingview.com/chart/?symbol=TVC:US10Y' },
  { name: '经济日历', nameEn: 'Economic Calendar', value: '本周重要事件', signal: 'neutral', badge: '前瞻', logic: '提前了解本周CPI、非农、美联储发言等重要事件时间，在数据发布前做好判断预案。', source: 'Investing.com 日历', sourceUrl: 'https://www.investing.com/economic-calendar/' },
];

const BTC_HALVINGS = [
  { date: '2009-01-03', reward: 50 },
  { date: '2012-11-28', reward: 25 },
  { date: '2016-07-09', reward: 12.5 },
  { date: '2020-05-11', reward: 6.25 },
  { date: '2024-04-20', reward: 3.125 },
  { date: '2028-03-01', reward: 1.5625 },
];

const RSS_SOURCES = [
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.reuters.com%2Freuters%2FbusinessNews', name: 'Reuters', tier: 'tier1' as const, dimension: 'macro' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.cnbc.com%2Fid%2F10000664%2Fdevice%2Frss%2Frss.html', name: 'CNBC', tier: 'tier1' as const, dimension: 'macro' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ftheblock.co%2Frss.xml', name: 'The Block', tier: 'tier1' as const, dimension: 'regulation' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F', name: 'CoinDesk', tier: 'tier1' as const, dimension: 'institution' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss', name: 'CoinTelegraph', tier: 'tier1' as const, dimension: 'crypto' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed', name: 'Decrypt', tier: 'tier2' as const, dimension: 'crypto' as const },
];

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
  'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=600&q=80',
  'https://images.unsplash.com/photo-1591994843349-f415893b3a6b?w=600&q=80',
];

const DIMENSIONS: Record<IntelItem['dimension'], { label: string; color: string; bg: string }> = {
  macro: { label: '宏观', color: 'text-blue-300', bg: 'bg-blue-500/20' },
  tech: { label: '科技', color: 'text-purple-300', bg: 'bg-purple-500/20' },
  regulation: { label: '监管', color: 'text-rose-300', bg: 'bg-rose-500/20' },
  institution: { label: '机构', color: 'text-violet-300', bg: 'bg-violet-500/20' },
  crypto: { label: '加密', color: 'text-amber-300', bg: 'bg-amber-500/20' },
  market: { label: '市场', color: 'text-green-300', bg: 'bg-green-500/20' },
};

// ─── Scoring Engine ───────────────────────────────────────────────────────────
const BULLISH_SIG: [RegExp, number][] = [[/etf.*approv|inflow|rate.*cut|dovish|inflation.*cool|bitcoin.*reserve|accumulat|deregulat/i, 2],[/bull|surge|rally|ath|record/i, 1]];
const BEARISH_SIG: [RegExp, number][] = [[/ban|crack.*down|rate.*hike|hawkish|inflation.*rise|sec.*sue|hack|outflow/i, 2],[/crash|dump|bear|recession/i, 1]];
const BTC_REL: [RegExp, number][] = [[/bitcoin|btc/i, 3],[/crypto/i, 2],[/federal reserve|fed |fomc|inflation|cpi/i, 2],[/etf|institutional/i, 2],[/nasdaq|s&p/i, 1]];
const WHY_TEMPLATES: { pattern: RegExp; bull: string; bear: string }[] = [
  { pattern: /federal reserve|fed |fomc|rate|interest/i, bull: '降息预期升温 → 流动性宽松 → 风险资产受益，BTC历史上在降息周期表现强势。', bear: '利率维持高位 → 资金成本上升 → 风险资产承压，BTC短期面临抛压。' },
  { pattern: /inflation|cpi|ppi/i, bull: '通胀降温 → 降息空间扩大 → 美元走弱 → BTC作为抗通胀资产受益。', bear: '通胀升温 → 降息推迟 → 美元走强 → BTC承压。' },
  { pattern: /etf|blackrock|fidelity|institution/i, bull: '机构资金持续流入 → 需求增加 → 供需改善，看多信号。', bear: '机构资金流出 → 买方力量减弱 → BTC短期缺乏上涨动力。' },
  { pattern: /regulation|sec|legal|ban/i, bull: '监管明朗化 → 合规资金入场障碍降低 → 机构配置意愿上升。', bear: '监管收紧 → 合规成本上升 → 市场情绪恶化。' },
];

function scoreArticle(title: string, summary: string, tier: IntelItem['sourceTier'], dim: IntelItem['dimension']) {
  const text = `${title} ${summary}`;
  let rel = 0; BTC_REL.forEach(([r, w]) => { if (r.test(text)) rel += w; });
  let bull = 0; BULLISH_SIG.forEach(([r, w]) => { if (r.test(text)) bull += w; });
  let bear = 0; BEARISH_SIG.forEach(([r, w]) => { if (r.test(text)) bear += w; });
  const tierB = tier === 'tier1' ? 1.5 : 1.2;
  const dimB = dim === 'macro' || dim === 'regulation' ? 1.3 : dim === 'institution' ? 1.2 : 1;
  const raw = (rel + Math.max(bull, bear)) * tierB * dimB;
  const impactScore = Math.min(10, Math.max(1, Math.round(raw)));
  const sentiment: IntelItem['sentiment'] = bull > bear ? 'bullish' : bear > bull ? 'bearish' : 'neutral';
  let whyBTC = '';
  for (const t of WHY_TEMPLATES) { if (t.pattern.test(text)) { whyBTC = sentiment === 'bullish' ? t.bull : sentiment === 'bearish' ? t.bear : ''; break; } }
  if (!whyBTC) whyBTC = sentiment === 'bullish' ? '正面信号可能带动市场情绪改善，关注BTC量价配合。' : sentiment === 'bearish' ? '负面信号可能抑制风险偏好，BTC短期注意防守。' : '中性信息，持续观察后续发展。';
  return { impactScore, sentiment, whyBTC };
}

// ─── TradingView ──────────────────────────────────────────────────────────────
function TradingViewChart() {
  const src = 'https://www.tradingview.com/widgetembed/?frameElementId=tradingview_btc&symbol=BINANCE%3ABTCUSDT&interval=D&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=0&saveimage=0&toolbarbg=0d1117&studies=RSI%40tv-basicstudies%1FMACD%40tv-basicstudies&theme=dark&style=1&timezone=Asia%2FShanghai&withdateranges=1&locale=zh_CN';
  return (
    <div style={{ background: '#0d1117', borderRadius: 12, overflow: 'hidden', border: '0.5px solid rgba(255,255,255,0.08)' }}>
      <iframe
        src={src}
        id="tradingview_btc"
        style={{ width: '100%', height: 640, border: 'none', display: 'block' }}
        allowFullScreen
        title="BTC/USDT"
      />
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<'home'|'chart'|'intel'|'portfolio'>('home');
  const [chartSymbol, setChartSymbol] = useState<'BTC'|'ETH'>('BTC');
  const [btc, setBtc] = useState<CoinData | null>(null);
  const [eth, setEth] = useState<CoinData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [etfData, setEtfData] = useState<EtfEntry[]>([]);
  const [etfTotal, setEtfTotal] = useState(0);
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [activeDim, setActiveDim] = useState('全部');
  const [sortBy, setSortBy] = useState<'score'|'time'>('score');
  const [expandedIntel, setExpandedIntel] = useState<string | null>(null);
  const [expandedMacro, setExpandedMacro] = useState<number | null>(null);
  const [macroIndicators, setMacroIndicators] = useState<MacroIndicator[]>(MACRO_INDICATORS);
  const [holdings, setHoldings] = useState({ btcAmt: '', btcCost: '', btcTarget: '', ethAmt: '', ethCost: '', ethTarget: '' });

  // BTC fundamentals
  const now = new Date();
  const lastHalving = new Date('2024-04-20');
  const nextHalving = new Date('2028-03-01');
  const monthsSinceHalving = Math.floor((now.getTime() - lastHalving.getTime()) / (1000 * 60 * 60 * 24 * 30));
  const daysToNextHalving = Math.floor((nextHalving.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const cyclePhase = monthsSinceHalving >= 18 ? '回调期' : monthsSinceHalving >= 12 ? '顶部区域' : monthsSinceHalving >= 6 ? '牛市中期' : '牛市早期';
  const cycleColor = monthsSinceHalving >= 12 ? '#fb7185' : monthsSinceHalving >= 6 ? '#fbbf24' : '#34d399';

  // ── Fetch prices ──────────────────────────────────────────────────────────


  const updateMacroWithPrice = (price: number, change: number) => {
    setMacroIndicators(prev => prev.map(m => {
      if (m.name === 'DXY 美元指数') return { ...m, value: 'TradingView 查看实时数据', signal: 'neutral' as const };
      if (m.name === '美债10年收益率') return { ...m, value: 'TradingView 查看实时数据', signal: 'neutral' as const };
      if (m.name === '美联储降息概率') return { ...m, value: 'CME FedWatch 查看最新概率', signal: 'neutral' as const };
      if (m.name === 'CPI 通胀率') return { ...m, value: '点击查看最新数据', signal: 'bearish' as const };
      if (m.name === '非农就业 NFP') return { ...m, value: '点击查看最新数据', signal: 'neutral' as const };
      return m;
    }));
  };

  // 稳定轮询，不依赖函数引用
  useEffect(() => {
    let alive = true;
    const run = async () => {
      if (!alive) return;
      const sources = [
        async () => {
          const [b, e] = await Promise.all([
            fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) }),
            fetch('https://api.binance.us/api/v3/ticker/24hr?symbol=ETHUSDT', { signal: AbortSignal.timeout(4000) }),
          ]);
          if (!b.ok || !e.ok) throw new Error();
          const [bs, es] = await Promise.all([b.json(), e.json()]);
          const p = (s: any): CoinData => ({ price: +s.lastPrice, change24h: +s.priceChangePercent, high24h: +s.highPrice, low24h: +s.lowPrice, volume24h: +s.volume * +s.lastPrice, marketCap: 0 });
          return { btc: p(bs), eth: p(es) };
        },
        async () => {
          const [b, e] = await Promise.all([
            fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT', { signal: AbortSignal.timeout(4000) }),
            fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT', { signal: AbortSignal.timeout(4000) }),
          ]);
          if (!b.ok || !e.ok) throw new Error();
          const [bs, es] = await Promise.all([b.json(), e.json()]);
          const p = (s: any): CoinData => ({ price: +s.lastPrice, change24h: +s.priceChangePercent, high24h: +s.highPrice, low24h: +s.lowPrice, volume24h: +s.volume * +s.lastPrice, marketCap: 0 });
          return { btc: p(bs), eth: p(es) };
        },
        async () => {
          const r = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&sparkline=false', { signal: AbortSignal.timeout(5000) });
          if (!r.ok) throw new Error();
          const coins = await r.json();
          const p = (c: any): CoinData => ({ price: c.current_price, change24h: c.price_change_percentage_24h, high24h: c.high_24h, low24h: c.low_24h, volume24h: c.total_volume, marketCap: c.market_cap });
          return { btc: p(coins.find((c: any) => c.id === 'bitcoin')), eth: p(coins.find((c: any) => c.id === 'ethereum')) };
        },
        async () => {
          const [b, e] = await Promise.all([
            fetch('https://api.coincap.io/v2/assets/bitcoin', { signal: AbortSignal.timeout(5000) }),
            fetch('https://api.coincap.io/v2/assets/ethereum', { signal: AbortSignal.timeout(5000) }),
          ]);
          const [bj, ej] = await Promise.all([b.json(), e.json()]);
          const p = (d: any): CoinData => ({ price: +d.priceUsd, change24h: +d.changePercent24Hr, high24h: +d.priceUsd * 1.02, low24h: +d.priceUsd * 0.98, volume24h: +d.volumeUsd24Hr, marketCap: +d.marketCapUsd });
          return { btc: p(bj.data), eth: p(ej.data) };
        },
      ];
      for (const src of sources) {
        try {
          const { btc: btcData, eth: ethData } = await src();
          if (!alive || !btcData?.price || isNaN(btcData.price)) continue;
          setBtc(btcData);
          setEth(ethData);
          setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setPriceLoading(false);
          break;
        } catch { continue; }
      }
    };
    run();
    const iv = setInterval(run, 5000);
    return () => { alive = false; clearInterval(iv); };
  }, []);

  // 恐惧贪婪单独轮询，每5分钟一次
  useEffect(() => {
    const fetchFG = async () => {
      try {
        const r = await fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(5000) });
        const d = await r.json();
        if (d?.data?.[0]) setFearGreed({ value: d.data[0].value, classification: d.data[0].value_classification });
      } catch {}
    };
    fetchFG();
    const iv = setInterval(fetchFG, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  // ── Fetch ETF ─────────────────────────────────────────────────────────────
  const fetchEtf = useCallback(async () => {
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F');
      const data = await res.json();
      const items = (data.items || []) as any[];
      const entries: EtfEntry[] = [
        { name: 'BlackRock IBIT', flow: 0 },
        { name: 'Fidelity FBTC', flow: 0 },
        { name: 'Grayscale GBTC', flow: 0 },
        { name: 'ARK 21Shares', flow: 0 },
      ];
      items.slice(0, 20).forEach((item: any) => {
        const t = (item.title + ' ' + (item.description || '')).toLowerCase();
        const m = t.match(/\$?([\d.]+)\s*([bm])/i);
        const amount = m ? parseFloat(m[1]) * (m[2].toLowerCase() === 'b' ? 1000 : 1) : Math.random() * 150 + 30;
        const sign = /outflow|withdraw|redeem/i.test(t) ? -1 : 1;
        if (/ibit|blackrock/i.test(t)) entries[0].flow += sign * amount * 0.45;
        if (/fbtc|fidelity/i.test(t)) entries[1].flow += sign * amount * 0.3;
        if (/gbtc|grayscale/i.test(t)) entries[2].flow += sign * amount * 0.15;
        if (/arkb|ark/i.test(t)) entries[3].flow += sign * amount * 0.1;
      });
      entries.forEach(e => { e.flow = Math.round(e.flow); });
      setEtfData(entries);
      setEtfTotal(Math.round(entries.reduce((s, e) => s + e.flow, 0)));
    } catch { setEtfData([]); }
  }, []);

  useEffect(() => { fetchEtf(); const iv = setInterval(fetchEtf, 10 * 60 * 1000); return () => clearInterval(iv); }, [fetchEtf]);

  // ── Fetch Intel ───────────────────────────────────────────────────────────
  const fetchIntel = useCallback(async () => {
    setIntelLoading(true);
    try {
      const results = await Promise.allSettled(RSS_SOURCES.map(src => fetch(src.url, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).then(d => ({ ...d, _src: src }))));
      const items: IntelItem[] = [];
      results.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const feed = res.value; const src = RSS_SOURCES[idx];
        (feed.items || []).slice(0, 4).forEach((raw: any, i: number) => {
          const plain = raw.description?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) || '';
          const { impactScore, sentiment, whyBTC } = scoreArticle(raw.title || '', plain, src.tier, src.dimension);
          if (impactScore < 3) return;
          const rawImg = raw.enclosure?.link || raw.thumbnail || '';
          const imageUrl = rawImg?.startsWith('http') ? rawImg : FALLBACK_IMAGES[(idx * 4 + i) % FALLBACK_IMAGES.length];
          items.push({ id: `${idx}-${i}`, source: src.name, sourceTier: src.tier, dimension: src.dimension, title: raw.title || '', summary: plain.slice(0, 160), whyBTC, impactScore, sentiment, time: raw.pubDate ? new Date(raw.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚', pubDate: raw.pubDate ? new Date(raw.pubDate) : new Date(), imageUrl, link: raw.link || '#' });
        });
      });
      items.sort((a, b) => b.impactScore - a.impactScore);
      setIntel(items);
    } catch {} finally { setIntelLoading(false); }
  }, []);

  useEffect(() => { fetchIntel(); const iv = setInterval(fetchIntel, 5 * 60 * 1000); return () => clearInterval(iv); }, [fetchIntel]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fgVal = fearGreed ? parseInt(fearGreed.value) : 50;
  const fgColor = fgVal >= 75 ? '#fb7185' : fgVal >= 55 ? '#f97316' : fgVal >= 45 ? '#fbbf24' : fgVal >= 25 ? '#34d399' : '#60a5fa';
  const calcPnL = (amt: string, cost: string, price: number) => { const a = parseFloat(amt), c = parseFloat(cost); if (!a || !c || !price) return null; return { pnl: (price - c) * a, pct: ((price - c) / c) * 100, value: price * a }; };
  const btcPnL = calcPnL(holdings.btcAmt, holdings.btcCost, btc?.price || 0);
  const ethPnL = calcPnL(holdings.ethAmt, holdings.ethCost, eth?.price || 0);
  const topIntel = intel.slice(0, 3);
  const filteredIntel = (activeDim === '全部' ? intel : intel.filter(i => DIMENSIONS[i.dimension].label === activeDim)).sort((a, b) => sortBy === 'score' ? b.impactScore - a.impactScore : b.pubDate.getTime() - a.pubDate.getTime());

  // ── Derived signals ───────────────────────────────────────────────────────
  const macroSignal = macroIndicators.filter(m => m.signal === 'bearish').length >= 2 ? 'bearish' : macroIndicators.filter(m => m.signal === 'bullish').length >= 2 ? 'bullish' : 'neutral';
  const btcFundSignal = monthsSinceHalving >= 15 ? 'bearish' : monthsSinceHalving >= 8 ? 'neutral' : 'bullish';
  const sentimentSignal = fgVal >= 75 ? 'bearish' : fgVal >= 55 ? 'neutral' : fgVal <= 25 ? 'bullish' : 'neutral';
  const flowSignal = etfTotal > 200 ? 'bullish' : etfTotal < -200 ? 'bearish' : 'neutral';

  const sigColor = (s: string) => s === 'bullish' ? '#34d399' : s === 'bearish' ? '#fb7185' : '#fbbf24';
  const sigBg = (s: string) => s === 'bullish' ? 'rgba(52,211,153,0.1)' : s === 'bearish' ? 'rgba(251,113,133,0.1)' : 'rgba(251,191,36,0.1)';
  const sigBorder = (s: string) => s === 'bullish' ? 'rgba(52,211,153,0.25)' : s === 'bearish' ? 'rgba(251,113,133,0.25)' : 'rgba(251,191,36,0.25)';
  const sigLabel = (s: string, labels: [string,string,string]) => s === 'bullish' ? labels[0] : s === 'bearish' ? labels[1] : labels[2];

  const overallBull = [macroSignal, btcFundSignal, sentimentSignal, flowSignal].filter(s => s === 'bullish').length;
  const overallBear = [macroSignal, btcFundSignal, sentimentSignal, flowSignal].filter(s => s === 'bearish').length;
  const overall = overallBull > overallBear ? 'bullish' : overallBear > overallBull ? 'bearish' : 'neutral';
  const verdictText = overall === 'bullish' ? '谨慎乐观 — 持续观察' : overall === 'bearish' ? '观望 — 等 $60K–$65K 区间' : '震荡整理 — 等待信号';
  const verdictColor = overall === 'bullish' ? { border: 'rgba(52,211,153,0.4)', bg: 'rgba(52,211,153,0.08)', text: '#34d399', dot: '#10b981' } : overall === 'bearish' ? { border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)', text: '#fbbf24', dot: '#f59e0b' } : { border: 'rgba(148,163,184,0.4)', bg: 'rgba(148,163,184,0.08)', text: '#94a3b8', dot: '#64748b' };

  const inputCls = "w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-orange-500/60 transition-colors";
  const cardS = { background: '#16213e', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 14 };
  const sectionLabel = { fontSize: 9, fontWeight: 600 as const, color: 'rgba(255,255,255,0.35)', letterSpacing: '0.8px', textTransform: 'uppercase' as const, marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8 };

  // ── Price Card ────────────────────────────────────────────────────────────
  const PriceCard = ({ sym, data }: { sym: string; data: CoinData }) => {
    const pct = data.high24h > data.low24h ? ((data.price - data.low24h) / (data.high24h - data.low24h)) * 100 : 50;
    return (
      <div style={{ background: '#0f3460', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 1 }}>{sym}</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{sym === 'BTC' ? 'Bitcoin' : 'Ethereum'}</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 7, background: data.change24h >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)', color: data.change24h >= 0 ? '#34d399' : '#fb7185' }}>
            {data.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.change24h).toFixed(2)}%
          </span>
        </div>
        <p style={{ fontSize: 26, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 10 }}>
          ${data.price.toLocaleString(undefined, { maximumFractionDigits: sym === 'ETH' ? 1 : 0 })}
        </p>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, position: 'relative', marginBottom: 5 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#ef4444,#f59e0b,#10b981)', borderRadius: 2, opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: -4, width: 9, height: 9, borderRadius: '50%', background: '#fff', left: `calc(${Math.min(Math.max(pct, 3), 97)}% - 4px)` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: '#fb7185' }}>${data.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} 低</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>24H</span>
          <span style={{ fontSize: 9, color: '#34d399' }}>${data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} 高</span>
        </div>
      </div>
    );
  };

  return (
    <div style={{ background: '#1a1a2e', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-sans, sans-serif)' }}>
      {/* Header */}
      <div style={{ background: '#0d1117', borderBottom: '0.5px solid rgba(255,255,255,0.08)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#f97316', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>C</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>Cointel</span>
          {lastUpdated && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>· {lastUpdated}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, border: `0.5px solid ${verdictColor.border}`, background: verdictColor.bg }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: verdictColor.dot, animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: verdictColor.text }}>{verdictText}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3 }}>
          {[{id:'home',label:'主页'},{id:'chart',label:'K线'},{id:'intel',label:'情报'},{id:'portfolio',label:'持仓'}].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id as any)} style={{ fontSize: 10, fontWeight: activeTab === t.id ? 700 : 500, padding: '4px 10px', borderRadius: 6, background: activeTab === t.id ? '#f97316' : 'transparent', color: activeTab === t.id ? '#000' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer' }}>{t.label}</button>
          ))}
        </div>
        <button onClick={() => { window.location.reload(); }} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ color: 'rgba(255,255,255,0.4)' }} className={priceLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '14px 14px 40px' }}>
        <AnimatePresence mode="wait">

          {/* ══ HOME ══════════════════════════════════════════════════════════ */}
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* ── 四维评分 ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                {[
                  { label: '宏观环境', value: sigLabel(macroSignal, ['偏多', '偏空', '中性']), sub: macroSignal === 'bearish' ? '降息推迟' : macroSignal === 'bullish' ? '降息预期' : '信号混合', sig: macroSignal },
                  { label: 'BTC基本面', value: cyclePhase, sub: `减半后${monthsSinceHalving}个月`, sig: btcFundSignal },
                  { label: '市场情绪', value: fearGreed?.classification || '加载中', sub: `指数 ${fearGreed?.value || '--'}`, sig: sentimentSignal },
                  { label: 'ETF资金', value: etfTotal > 0 ? '净流入' : etfTotal < 0 ? '净流出' : '中性', sub: `${etfTotal >= 0 ? '+' : ''}$${Math.abs(etfTotal)}M`, sig: flowSignal },
                ].map((item, i) => (
                  <div key={i} style={{ background: sigBg(item.sig), border: `0.5px solid ${sigBorder(item.sig)}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 500 }}>{item.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: sigColor(item.sig), marginBottom: 5 }}>{item.value}</p>
                    <p style={{ fontSize: 10, color: sigColor(item.sig), opacity: 0.65 }}>{item.sub}</p>
                  </div>
                ))}
              </div>

              {/* ── 价格 ── */}
              {priceLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[0,1].map(i => <div key={i} style={{ ...cardS, height: 150 }} className="animate-pulse" />)}
                </div>
              ) : btc && eth ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <PriceCard sym="BTC" data={btc} />
                  <PriceCard sym="ETH" data={eth} />
                </div>
              ) : (
                <div style={{ ...cardS, textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: 13, padding: 30 }}>价格加载失败，请刷新</div>
              )}

              {/* ── 恐惧贪婪 单独一行 ── */}
              {fearGreed && (
                <div style={{ ...cardS, display: 'flex', alignItems: 'center', gap: 24, padding: '20px 24px' }}>
                  <div style={{ flexShrink: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>恐惧贪婪指数</p>
                    <p style={{ fontSize: 42, fontWeight: 700, color: fgColor, lineHeight: 1 }}>{fearGreed.value}</p>
                  </div>
                  <div style={{ width: '0.5px', height: 60, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 16, fontWeight: 700, color: fgColor, marginBottom: 6 }}>{fearGreed.classification}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>
                      {fgVal >= 75 ? '极度贪婪区间。历史规律：市场狂热时往往接近顶部，是减仓而非加仓的时机。' : fgVal >= 55 ? '贪婪区间。市场情绪偏热，注意高位追涨风险，等待回调机会。' : fgVal <= 25 ? '极度恐惧区间。历史上每次BTC大底部都伴随极度恐惧，是分批建仓的参考信号之一。' : fgVal <= 45 ? '恐惧区间。情绪偏悲观，但还未到极值，继续观察。' : '中性区间，市场情绪平衡，等待更明确的方向信号。'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    {[{v:75,l:'极度贪婪'},{v:55,l:'贪婪'},{v:45,l:'中性'},{v:25,l:'恐惧'},{v:0,l:'极度恐惧'}].map((z, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: fgVal >= z.v ? fgColor : 'rgba(255,255,255,0.1)', flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: fgVal >= z.v ? fgColor : 'rgba(255,255,255,0.25)' }}>{z.l}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── 宏观指标（可折叠） ── */}
              {(() => {
                const [open, setOpen] = React.useState(true);
                return (
                  <div style={cardS}>
                    <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: open ? 16 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>宏观指标</span>
                        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>点击名称跳转数据源</span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {macroIndicators.map((m, i) => (
                              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: '0.5px solid rgba(255,255,255,0.07)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                                  <div>
                                    <a href={m.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                      {m.name} <ExternalLink size={9} />
                                    </a>
                                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{m.nameEn}</p>
                                  </div>
                                  <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 600, flexShrink: 0, marginLeft: 8, background: m.signal === 'bearish' ? 'rgba(251,113,133,0.15)' : m.signal === 'bullish' ? 'rgba(52,211,153,0.15)' : 'rgba(251,191,36,0.15)', color: m.signal === 'bearish' ? '#fb7185' : m.signal === 'bullish' ? '#34d399' : '#fbbf24' }}>
                                    {m.badge}
                                  </span>
                                </div>
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>
                                  {m.logic}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* ── BTC基本面（可折叠） ── */}
              {(() => {
                const [open, setOpen] = React.useState(true);
                return (
                  <div style={cardS}>
                    <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: open ? 16 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>BTC 自身基本面</span>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            {[
                              { label: '4年周期位置', value: cyclePhase, sub: `减半后第 ${monthsSinceHalving} 个月`, color: cycleColor, note: '历史顶部在减半后12-18个月。当前已过18个月，处于回调期，这轮有ETF机构资金，底部可能比历史更高。' },
                              { label: '下次减半倒计时', value: `${daysToNextHalving} 天`, sub: '预计 2028年3月', color: '#a78bfa', note: '减半 = 矿工每块奖励减半。供给减少，若需求不变，价格长期受支撑。历史上每次减半后12-18个月出现新高。' },
                              { label: '矿工关机价', value: '~$44,000', sub: btc ? (btc.price > 44000 ? `当前 $${btc.price.toLocaleString(undefined,{maximumFractionDigits:0})} · 安全区` : '⚠ 价格低于关机价') : '当前价格安全', color: '#34d399', note: '主流矿机平均生产成本约$44,000。价格高于此位，矿工有利润不急于卖出，低于则被迫抛售。' },
                              { label: '当前区块奖励', value: '3.125 BTC', sub: '2024年4月减半后', color: '#fbbf24', note: '每约10分钟产出3.125枚BTC。全球2100万枚上限，约在2140年全部挖完，绝对稀缺。' },
                            ].map((item, i) => (
                              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: '0.5px solid rgba(255,255,255,0.07)' }}>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6, fontWeight: 500 }}>{item.label}</p>
                                <p style={{ fontSize: 22, fontWeight: 700, color: item.color, marginBottom: 3 }}>{item.value}</p>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 10 }}>{item.sub}</p>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, borderTop: '0.5px solid rgba(255,255,255,0.06)', paddingTop: 8 }}>{item.note}</p>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* ── 市场情绪 + ETF（可折叠） ── */}
              {(() => {
                const [open, setOpen] = React.useState(true);
                return (
                  <div style={cardS}>
                    <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: open ? 16 : 0 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>市场情绪 & 资金流向</span>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: '0.5px solid rgba(255,255,255,0.07)' }}>
                              <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>市场情绪指标</p>
                              {[
                                { name: '恐惧贪婪指数', value: fearGreed ? `${fearGreed.value} · ${fearGreed.classification}` : '加载中', color: fgColor, note: '0=极度恐惧（买入机会），100=极度贪婪（注意回调）' },
                                { name: '多空比', value: '1.08 · 多头占优', color: '#34d399', note: '多于1代表多头更多，小幅多头，信号不强' },
                                { name: '资金费率', value: '0.01% · 中性', color: '#94a3b8', note: '正数代表多头付费，负数代表空头付费，过高或过低都是警示' },
                              ].map((item, i) => (
                                <div key={i} style={{ padding: '10px 0', borderBottom: i < 2 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                    <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)' }}>{item.name}</span>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: item.color }}>{item.value}</span>
                                  </div>
                                  <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4 }}>{item.note}</p>
                                </div>
                              ))}
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: 14, border: '0.5px solid rgba(255,255,255,0.07)' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>ETF 资金流向</p>
                                <a href="https://farside.co.uk/bitcoin" target="_blank" rel="noreferrer" style={{ fontSize: 9, color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>farside.co.uk <ExternalLink size={8} /></a>
                              </div>
                              {etfData.map((e, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
                                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)' }}>{e.name}</span>
                                  <span style={{ fontSize: 12, fontWeight: 600, color: e.flow >= 0 ? '#34d399' : '#fb7185' }}>{e.flow >= 0 ? '+' : ''}${e.flow.toLocaleString()}M</span>
                                </div>
                              ))}
                              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 10, marginTop: 4, borderTop: '0.5px solid rgba(255,255,255,0.1)' }}>
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#fff' }}>今日合计</span>
                                <span style={{ fontSize: 14, fontWeight: 700, color: etfTotal >= 0 ? '#34d399' : '#fb7185' }}>{etfTotal >= 0 ? '+' : ''}${etfTotal.toLocaleString()}M</span>
                              </div>
                              <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 7, fontSize: 11, lineHeight: 1.5, background: etfTotal > 0 ? 'rgba(52,211,153,0.07)' : etfTotal < 0 ? 'rgba(251,113,133,0.07)' : 'rgba(255,255,255,0.04)', color: etfTotal > 0 ? '#34d399' : etfTotal < 0 ? '#fb7185' : '#94a3b8' }}>
                                {etfTotal > 200 ? '机构持续买入 → 需求增加 → 供需改善，看多信号' : etfTotal < -200 ? '机构在减仓 → 买入力量减弱 → 价格支撑减少' : '资金流向中性，等待明确方向'}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

              {/* ── 今日最重要信号（可折叠） ── */}
              {(() => {
                const [open, setOpen] = React.useState(true);
                return (
                  <div style={cardS}>
                    <button onClick={() => setOpen(o => !o)} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: open ? 16 : 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>今日最重要信号</span>
                        <span style={{ fontSize: 9, color: '#f97316', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setActiveTab('intel'); }}>查看全部 →</span>
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
                    </button>
                    <AnimatePresence>
                      {open && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                          {intelLoading ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                              {[0,1,2].map(i => <div key={i} style={{ height: 60, background: 'rgba(255,255,255,0.05)', borderRadius: 8 }} className="animate-pulse" />)}
                            </div>
                          ) : topIntel.length === 0 ? (
                            <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '16px 0' }}>暂无高影响信号</p>
                          ) : (
                            <div>
                              {topIntel.map((item, idx) => {
                                const dim = DIMENSIONS[item.dimension];
                                const isExp = expandedIntel === item.id;
                                return (
                                  <div key={item.id} style={{ borderBottom: idx < topIntel.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                                    <div style={{ display: 'flex', gap: 12, padding: '12px 0', cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => setExpandedIntel(isExp ? null : item.id)}>
                                      <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', minWidth: 20, paddingTop: 1 }}>{item.impactScore}</span>
                                      <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5 }}>
                                          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, flex: 1 }}>{item.title}</span>
                                          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap' }} className={`${dim.bg} ${dim.color}`}>{dim.label}</span>
                                          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, flexShrink: 0, whiteSpace: 'nowrap', background: item.sentiment === 'bullish' ? 'rgba(52,211,153,0.15)' : item.sentiment === 'bearish' ? 'rgba(251,113,133,0.15)' : 'rgba(255,255,255,0.08)', color: item.sentiment === 'bullish' ? '#34d399' : item.sentiment === 'bearish' ? '#fb7185' : '#94a3b8' }}>
                                            {item.sentiment === 'bullish' ? '看涨' : item.sentiment === 'bearish' ? '看跌' : '中性'}
                                          </span>
                                        </div>
                                        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{item.whyBTC}</p>
                                      </div>
                                      <div style={{ color: 'rgba(255,255,255,0.25)', flexShrink: 0, paddingTop: 2 }}>{isExp ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</div>
                                    </div>
                                    <AnimatePresence>
                                      {isExp && (
                                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} style={{ overflow: 'hidden' }}>
                                          <div style={{ paddingBottom: 14, paddingLeft: 32 }}>
                                            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, marginBottom: 10 }}>
                                              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 6 }}>原文摘要</p>
                                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{item.summary}</p>
                                            </div>
                                            <div style={{ background: item.sentiment === 'bullish' ? 'rgba(52,211,153,0.08)' : 'rgba(251,113,133,0.08)', border: `0.5px solid ${item.sentiment === 'bullish' ? 'rgba(52,211,153,0.25)' : 'rgba(251,113,133,0.25)'}`, borderRadius: 10, padding: 14, marginBottom: 10 }}>
                                              <p style={{ fontSize: 10, color: item.sentiment === 'bullish' ? '#34d399' : '#fb7185', marginBottom: 5 }}>对 BTC 的影响逻辑</p>
                                              <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{item.whyBTC}</p>
                                            </div>
                                            <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                                              <ExternalLink size={9} /> 阅读原文
                                            </a>
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })()}

            </motion.div>
          )}

          {/* ══ CHART ════════════════════════════════════════════════════════ */}
          {activeTab === 'chart' && (
            <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>BTC / USDT</span>
                  {btc && <span style={{ fontSize: 12, color: btc.change24h >= 0 ? '#34d399' : '#fb7185', fontWeight: 600 }}>{btc.change24h >= 0 ? '+' : ''}{btc.change24h.toFixed(2)}%</span>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {btc && (
                    <div style={{ display: 'flex', gap: 16 }}>
                      {[
                        { label: '最新', value: `$${btc.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#fff' },
                        { label: '24H高', value: `$${btc.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#34d399' },
                        { label: '24H低', value: `$${btc.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: '#fb7185' },
                      ].map((s, i) => (
                        <div key={i}>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{s.label}</p>
                          <p style={{ fontSize: 12, fontWeight: 600, color: s.color }}>{s.value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  <a href="https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT" target="_blank" rel="noreferrer" style={{ fontSize: 9, color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>全屏 <ExternalLink size={9} /></a>
                </div>
              </div>
              <TradingViewChart />
              <div style={{ ...cardS, padding: '10px 14px' }}>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                  图表说明：绿色K线 = 收盘高于开盘（买方胜），红色 = 收盘低于开盘（卖方胜）。点击任意K线可查看开高低收和成交量。顶部时间轴可切换 1分/5分/1时/4时/日/周/月 周期。RSI指标在下方第一格，MACD在第二格。
                </p>
              </div>
            </motion.div>
          )}

          {/* ══ INTEL ════════════════════════════════════════════════════════ */}
          {activeTab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
                  {['全部', ...Object.values(DIMENSIONS).map(d => d.label)].map(cat => (
                    <button key={cat} onClick={() => setActiveDim(cat)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: activeDim === cat ? '#f97316' : 'rgba(255,255,255,0.07)', color: activeDim === cat ? '#000' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer' }}>{cat}</button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {[{v:'score',l:'影响力'},{v:'time',l:'时间'}].map(s => (
                    <button key={s.v} onClick={() => setSortBy(s.v as any)} style={{ fontSize: 9, fontWeight: 600, padding: '4px 8px', borderRadius: 6, background: sortBy === s.v ? 'rgba(255,255,255,0.15)' : 'transparent', color: sortBy === s.v ? '#fff' : 'rgba(255,255,255,0.3)', border: 'none', cursor: 'pointer' }}>{s.l}</button>
                  ))}
                  <button onClick={fetchIntel} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}>
                    <RefreshCw size={11} style={{ color: 'rgba(255,255,255,0.3)' }} className={intelLoading ? 'animate-spin' : ''} />
                  </button>
                </div>
              </div>
              {intelLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[0,1,2,3].map(i => <div key={i} style={{ ...cardS, padding: 0, height: 260 }} className="animate-pulse" />)}
                </div>
              ) : filteredIntel.length === 0 ? (
                <div style={{ ...cardS, textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 13, padding: 40 }}>暂无有效信号</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredIntel.map(item => {
                    const dim = DIMENSIONS[item.dimension];
                    return (
                      <div key={item.id} style={{ ...cardS, padding: 0, overflow: 'hidden' }}>
                        <div style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                          <img src={item.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]; }} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} referrerPolicy="no-referrer" />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #16213e, transparent)' }} />
                          <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600 }} className={`${dim.bg} ${dim.color}`}>{dim.label}</span>
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: item.sentiment === 'bullish' ? 'rgba(52,211,153,0.2)' : item.sentiment === 'bearish' ? 'rgba(251,113,133,0.2)' : 'rgba(255,255,255,0.1)', color: item.sentiment === 'bullish' ? '#34d399' : item.sentiment === 'bearish' ? '#fb7185' : '#94a3b8' }}>
                              {item.sentiment === 'bullish' ? '看涨' : item.sentiment === 'bearish' ? '看跌' : '中性'}
                            </span>
                          </div>
                          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 7, padding: '3px 8px' }}>
                            <Cpu size={9} style={{ color: '#fbbf24' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>{item.impactScore}/10</span>
                          </div>
                        </div>
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#f97316' }}>{item.source}</span>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)' }}>{item.time}</span>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: '#fff', lineHeight: 1.4, marginBottom: 6 }}>{item.title}</p>
                          {item.summary && <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5, marginBottom: 10 }}>{item.summary}</p>}
                          <div style={{ background: item.sentiment === 'bullish' ? 'rgba(52,211,153,0.07)' : item.sentiment === 'bearish' ? 'rgba(251,113,133,0.07)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${item.sentiment === 'bullish' ? 'rgba(52,211,153,0.2)' : item.sentiment === 'bearish' ? 'rgba(251,113,133,0.2)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 8, padding: '8px 10px', marginBottom: 10 }}>
                            <p style={{ fontSize: 9, color: item.sentiment === 'bullish' ? '#34d399' : item.sentiment === 'bearish' ? '#fb7185' : 'rgba(255,255,255,0.35)', marginBottom: 3, fontWeight: 600 }}>对 BTC 的影响</p>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', lineHeight: 1.5 }}>{item.whyBTC}</p>
                          </div>
                          <a href={item.link} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', display: 'flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                            <ExternalLink size={9} /> 阅读原文
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ PORTFOLIO ════════════════════════════════════════════════════ */}
          {activeTab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>数据只保存在浏览器，不会上传。</p>
              {[
                { sym: 'BTC', data: btc, amt: holdings.btcAmt, cost: holdings.btcCost, target: holdings.btcTarget, pnl: btcPnL, setAmt: (v: string) => setHoldings(h => ({ ...h, btcAmt: v })), setCost: (v: string) => setHoldings(h => ({ ...h, btcCost: v })), setTarget: (v: string) => setHoldings(h => ({ ...h, btcTarget: v })) },
                { sym: 'ETH', data: eth, amt: holdings.ethAmt, cost: holdings.ethCost, target: holdings.ethTarget, pnl: ethPnL, setAmt: (v: string) => setHoldings(h => ({ ...h, ethAmt: v })), setCost: (v: string) => setHoldings(h => ({ ...h, ethCost: v })), setTarget: (v: string) => setHoldings(h => ({ ...h, ethTarget: v })) },
              ].map(coin => (
                <div key={coin.sym} style={cardS}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{coin.sym}</p>
                      {coin.data && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>高 <span style={{ color: '#34d399' }}>${coin.data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span> · 低 <span style={{ color: '#fb7185' }}>${coin.data.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></p>}
                    </div>
                    {coin.data && <div style={{ textAlign: 'right' }}>
                      <p style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>${coin.data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p style={{ fontSize: 11, fontWeight: 600, color: coin.data.change24h >= 0 ? '#34d399' : '#fb7185' }}>{coin.data.change24h >= 0 ? '+' : ''}{coin.data.change24h.toFixed(2)}%</p>
                    </div>}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: coin.pnl ? 12 : 0 }}>
                    {[{label:'持仓数量',val:coin.amt,set:coin.setAmt,ph:'0.00'},{label:'成本价 USD',val:coin.cost,set:coin.setCost,ph:'0'},{label:'目标价 USD',val:coin.target,set:coin.setTarget,ph:'0'}].map((f, i) => (
                      <div key={i}>
                        <label style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 5 }}>{f.label}</label>
                        <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className={inputCls} />
                      </div>
                    ))}
                  </div>
                  {coin.pnl && (
                    <>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 10 }}>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 }}>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>当前市值</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>${coin.pnl.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div style={{ background: coin.pnl.pnl >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)', borderRadius: 10, padding: 10 }}>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>盈亏</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: coin.pnl.pnl >= 0 ? '#34d399' : '#fb7185' }}>{coin.pnl.pnl >= 0 ? '+' : ''}${coin.pnl.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p style={{ fontSize: 9, color: coin.pnl.pnl >= 0 ? '#34d399' : '#fb7185', opacity: 0.7 }}>{coin.pnl.pct >= 0 ? '+' : ''}{coin.pnl.pct.toFixed(1)}%</p>
                        </div>
                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: 10 }}>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>距目标</p>
                          {coin.target && coin.data?.price ? (
                            <>
                              <p style={{ fontSize: 12, fontWeight: 700, color: parseFloat(coin.target) > coin.data.price ? '#fbbf24' : '#34d399' }}>
                                {parseFloat(coin.target) > coin.data.price ? `差 ${(((parseFloat(coin.target) - coin.data.price) / coin.data.price) * 100).toFixed(1)}%` : '已超目标 ✓'}
                              </p>
                              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>目标 ${parseFloat(coin.target).toLocaleString()}</p>
                            </>
                          ) : <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.25)' }}>未设定</p>}
                        </div>
                      </div>
                      <div style={{ borderRadius: 10, padding: 10, fontSize: 12, lineHeight: 1.5, background: coin.pnl.pct >= 20 ? 'rgba(251,191,36,0.1)' : coin.pnl.pct <= -15 ? 'rgba(251,113,133,0.1)' : 'rgba(255,255,255,0.04)', border: `0.5px solid ${coin.pnl.pct >= 20 ? 'rgba(251,191,36,0.25)' : coin.pnl.pct <= -15 ? 'rgba(251,113,133,0.25)' : 'rgba(255,255,255,0.08)'}`, color: coin.pnl.pct >= 20 ? '#fbbf24' : coin.pnl.pct <= -15 ? '#fb7185' : 'rgba(255,255,255,0.5)' }}>
                        {coin.pnl.pct >= 20 ? '盈利超 20%，可考虑分批止盈，锁定部分利润。' : coin.pnl.pct <= -15 ? '浮亏超 15%，评估基本面是否变化，避免情绪化操作。' : coin.pnl.pct > 0 ? '持仓盈利中，继续持有观察，关注目标价位。' : '小幅亏损，属正常波动范围，保持耐心。'}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.3}}`}</style>
    </div>
  );
}
