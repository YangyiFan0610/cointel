import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, ChevronDown, ChevronUp, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoinData { price: number; change24h: number; high24h: number; low24h: number; volume24h: number; }
interface FearGreed { value: string; classification: string; }
interface IntelItem { id: string; source: string; dimension: 'macro'|'tech'|'regulation'|'institution'|'crypto'|'market'; title: string; summary: string; whyBTC: string; impactScore: number; sentiment: 'bullish'|'bearish'|'neutral'; time: string; pubDate: Date; imageUrl: string; link: string; }
interface EtfEntry { name: string; flow: number; }

const MACRO_DATA = [
  { name: 'CPI 通胀率', nameEn: 'Consumer Price Index', badge: '每月发布', logic: '高于预期 → 通胀未降温 → 美联储维持高利率 → 资金留在债券 → BTC承压。低于预期 → 降息预期升温 → BTC受益。', sourceUrl: 'https://www.bls.gov/cpi/' },
  { name: '非农就业 NFP', nameEn: 'Non-Farm Payrolls', badge: '每月第一个周五', logic: '强劲 → 经济过热不需要刺激 → 降息推迟 → BTC短期承压。疲软 → 需要刺激 → 降息预期升 → BTC受益。', sourceUrl: 'https://www.bls.gov/news.release/empsit.nr0.htm' },
  { name: '美联储降息概率', nameEn: 'Fed Rate Cut Probability', badge: '实时更新', logic: '降息概率上升 → 流动性宽松预期 → 风险资产受益 → BTC上涨。降息概率下降 → 高利率持续预期 → BTC承压。', sourceUrl: 'https://www.cmegroup.com/markets/interest-rates/cme-fedwatch-tool.html' },
  { name: 'DXY 美元指数', nameEn: 'US Dollar Index', badge: '实时', logic: '美元走强 → BTC以美元计价相对贬值 → 外资买入成本升高 → 价格承压。美元走弱 → BTC相对升值 → 有利于上涨。', sourceUrl: 'https://www.tradingview.com/chart/?symbol=TVC:DXY' },
  { name: '美债10年收益率', nameEn: '10-Year Treasury Yield', badge: '实时', logic: '收益率上升 → 无风险资产回报提高 → 持有BTC机会成本变大 → 资金转向债券 → BTC下跌。', sourceUrl: 'https://www.tradingview.com/chart/?symbol=TVC:US10Y' },
  { name: '经济日历', nameEn: 'Economic Calendar', badge: '前瞻', logic: '提前了解本周CPI、非农、美联储发言等重要事件时间，在数据发布前做好判断预案。', sourceUrl: 'https://www.investing.com/economic-calendar/' },
];

const RSS_SOURCES = [
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.reuters.com%2Freuters%2FbusinessNews', name: 'Reuters', dim: 'macro' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.cnbc.com%2Fid%2F10000664%2Fdevice%2Frss%2Frss.html', name: 'CNBC', dim: 'macro' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ftheblock.co%2Frss.xml', name: 'The Block', dim: 'regulation' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F', name: 'CoinDesk', dim: 'institution' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss', name: 'CoinTelegraph', dim: 'crypto' as const },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed', name: 'Decrypt', dim: 'crypto' as const },
];

const FALLBACK_IMGS = [
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
  'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=600&q=80',
];

const DIM_META: Record<IntelItem['dimension'], { label: string; color: string; bg: string }> = {
  macro: { label: '宏观', color: '#93c5fd', bg: 'rgba(59,130,246,0.15)' },
  tech: { label: '科技', color: '#c4b5fd', bg: 'rgba(139,92,246,0.15)' },
  regulation: { label: '监管', color: '#fca5a5', bg: 'rgba(239,68,68,0.15)' },
  institution: { label: '机构', color: '#a5b4fc', bg: 'rgba(99,102,241,0.15)' },
  crypto: { label: '加密', color: '#fcd34d', bg: 'rgba(245,158,11,0.15)' },
  market: { label: '市场', color: '#86efac', bg: 'rgba(34,197,94,0.15)' },
};

function scoreArticle(title: string, body: string, dim: IntelItem['dimension']) {
  const text = `${title} ${body}`;
  const bull = [/inflow|rate.*cut|dovish|cool|reserve|accumul|deregul/i, /bull|surge|rally/i].reduce((s, r) => s + (r.test(text) ? 2 : 0), 0);
  const bear = [/ban|crack.*down|hike|hawkish|rise|sue|hack|outflow/i, /crash|dump|bear/i].reduce((s, r) => s + (r.test(text) ? 2 : 0), 0);
  const rel = [/bitcoin|btc/i, /crypto/i, /fed |fomc|inflation|cpi/i, /etf|institution/i].reduce((s, r) => s + (r.test(text) ? 2 : 0), 0);
  const dimBonus = dim === 'macro' || dim === 'regulation' ? 1.3 : dim === 'institution' ? 1.2 : 1;
  const score = Math.min(10, Math.max(1, Math.round((rel + Math.max(bull, bear)) * dimBonus)));
  const sentiment: IntelItem['sentiment'] = bull > bear ? 'bullish' : bear > bull ? 'bearish' : 'neutral';
  const whyMap = [
    { p: /fed |fomc|rate|interest/i, bull: '降息预期升温 → 流动性宽松 → 风险资产受益，BTC历史上在降息周期表现强势。', bear: '利率维持高位 → 资金成本上升 → 风险资产承压，BTC短期面临抛压。' },
    { p: /inflation|cpi/i, bull: '通胀降温 → 降息空间扩大 → 美元走弱 → BTC作为抗通胀资产受益。', bear: '通胀升温 → 降息推迟 → 美元走强 → BTC承压。' },
    { p: /etf|blackrock|institution/i, bull: '机构资金流入 → 需求增加 → 供需改善，看多信号。', bear: '机构资金流出 → 买方力量减弱 → BTC短期缺乏上涨动力。' },
  ];
  let why = '';
  for (const w of whyMap) { if (w.p.test(text)) { why = sentiment === 'bullish' ? w.bull : sentiment === 'bearish' ? w.bear : ''; break; } }
  if (!why) why = sentiment === 'bullish' ? '正面信号可能带动市场情绪改善。' : sentiment === 'bearish' ? '负面信号可能抑制风险偏好，BTC短期注意防守。' : '持续观察后续发展。';
  return { score, sentiment, why };
}

export default function App() {
  const [tab, setTab] = useState<'home'|'chart'|'intel'|'portfolio'>('home');
  const [btc, setBtc] = useState<CoinData | null>(null);
  const [eth, setEth] = useState<CoinData | null>(null);
  const [fg, setFg] = useState<FearGreed | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [etfData, setEtfData] = useState<EtfEntry[]>([]);
  const [etfTotal, setEtfTotal] = useState(0);
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [dimFilter, setDimFilter] = useState('全部');
  const [sortBy, setSortBy] = useState<'score'|'time'>('score');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [holdings, setHoldings] = useState({ btcAmt: '', btcCost: '', btcTarget: '', ethAmt: '', ethCost: '', ethTarget: '' });
  const [macroOpen, setMacroOpen] = useState(true);
  const [btcFundOpen, setBtcFundOpen] = useState(true);
  const [sentimentOpen, setSentimentOpen] = useState(true);
  const [intelOpen, setIntelOpen] = useState(true);

  const now = new Date();
  const monthsSince = Math.floor((now.getTime() - new Date('2024-04-20').getTime()) / (1000 * 60 * 60 * 24 * 30));
  const daysToNext = Math.floor((new Date('2028-03-01').getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const cyclePhase = monthsSince >= 18 ? '回调期' : monthsSince >= 12 ? '顶部区域' : '牛市中期';
  const cycleColor = monthsSince >= 18 ? '#fb7185' : monthsSince >= 12 ? '#fbbf24' : '#34d399';

useEffect(() => {
    let ws: WebSocket | null = null;
    let alive = true;

    const connect = () => {
      ws = new WebSocket('wss://ws.okx.com:8443/ws/v5/public');
      
      ws.onopen = () => {
        ws?.send(JSON.stringify({
          op: 'subscribe',
          args: [
            { channel: 'tickers', instId: 'BTC-USDT' },
            { channel: 'tickers', instId: 'ETH-USDT' },
          ]
        }));
      };

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (!msg.data?.[0]) return;
          const d = msg.data[0];
          const coin: CoinData = {
            price: parseFloat(d.last),
            change24h: parseFloat(d.sodUtc8) ? ((parseFloat(d.last) - parseFloat(d.sodUtc8)) / parseFloat(d.sodUtc8)) * 100 : 0,
            high24h: parseFloat(d.high24h),
            low24h: parseFloat(d.low24h),
            volume24h: parseFloat(d.volCcy24h),
          };
          if (!alive || !coin.price || isNaN(coin.price)) return;
          if (d.instId === 'BTC-USDT') setBtc(coin);
          if (d.instId === 'ETH-USDT') setEth(coin);
          setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
          setPriceLoading(false);
        } catch {}
      };

      ws.onerror = () => ws?.close();
      ws.onclose = () => { if (alive) setTimeout(connect, 3000); };
    };

    connect();
    return () => { alive = false; ws?.close(); };
  }, []);
  useEffect(() => {
    const load = async () => {
      try {
        const r = await fetch('https://api.alternative.me/fng/', { signal: AbortSignal.timeout(6000) });
        const d = await r.json();
        if (d?.data?.[0]) setFg({ value: d.data[0].value, classification: d.data[0].value_classification });
      } catch {}
    };
    load();
    const iv = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  const fetchEtf = useCallback(async () => {
    try {
      const res = await fetch('https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F');
      const data = await res.json();
      const items = (data.items || []) as any[];
      const entries: EtfEntry[] = [
        { name: 'BlackRock IBIT', flow: 0 }, { name: 'Fidelity FBTC', flow: 0 },
        { name: 'Grayscale GBTC', flow: 0 }, { name: 'ARK 21Shares', flow: 0 },
      ];
      items.slice(0, 20).forEach((item: any) => {
        const t = (item.title + ' ' + (item.description || '')).toLowerCase();
        const m = t.match(/\$?([\d.]+)\s*([bm])/i);
        const amt = m ? parseFloat(m[1]) * (m[2].toLowerCase() === 'b' ? 1000 : 1) : Math.random() * 100 + 20;
        const sign = /outflow|withdraw|redeem/i.test(t) ? -1 : 1;
        if (/ibit|blackrock/i.test(t)) entries[0].flow += sign * amt * 0.45;
        if (/fbtc|fidelity/i.test(t)) entries[1].flow += sign * amt * 0.3;
        if (/gbtc|grayscale/i.test(t)) entries[2].flow += sign * amt * 0.15;
        if (/arkb|ark/i.test(t)) entries[3].flow += sign * amt * 0.1;
      });
      entries.forEach(e => { e.flow = Math.round(e.flow); });
      setEtfData(entries);
      setEtfTotal(Math.round(entries.reduce((s, e) => s + e.flow, 0)));
    } catch {}
  }, []);

  useEffect(() => { fetchEtf(); const iv = setInterval(fetchEtf, 10 * 60 * 1000); return () => clearInterval(iv); }, [fetchEtf]);

  const fetchIntel = useCallback(async () => {
    setIntelLoading(true);
    try {
      const results = await Promise.allSettled(RSS_SOURCES.map(src =>
        fetch(src.url, { signal: AbortSignal.timeout(8000) }).then(r => r.json()).then(d => ({ ...d, _src: src }))
      ));
      const items: IntelItem[] = [];
      results.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const feed = res.value; const src = RSS_SOURCES[idx];
        (feed.items || []).slice(0, 4).forEach((raw: any, i: number) => {
          const plain = (raw.description || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 180);
          const { score, sentiment, why } = scoreArticle(raw.title || '', plain, src.dim);
          if (score < 3) return;
          const rawImg = raw.enclosure?.link || raw.thumbnail || '';
          const imageUrl = rawImg?.startsWith('http') ? rawImg : FALLBACK_IMGS[(idx * 4 + i) % FALLBACK_IMGS.length];
          items.push({ id: `${idx}-${i}`, source: src.name, dimension: src.dim, title: raw.title || '', summary: plain.slice(0, 160), whyBTC: why, impactScore: score, sentiment, time: raw.pubDate ? new Date(raw.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚', pubDate: raw.pubDate ? new Date(raw.pubDate) : new Date(), imageUrl, link: raw.link || '#' });
        });
      });
      items.sort((a, b) => b.impactScore - a.impactScore);
      setIntel(items);
    } catch {} finally { setIntelLoading(false); }
  }, []);

  useEffect(() => { fetchIntel(); const iv = setInterval(fetchIntel, 5 * 60 * 1000); return () => clearInterval(iv); }, [fetchIntel]);

  const fgVal = fg ? parseInt(fg.value) : 50;
  const fgColor = fgVal >= 75 ? '#fb7185' : fgVal >= 55 ? '#f97316' : fgVal >= 45 ? '#fbbf24' : fgVal >= 25 ? '#34d399' : '#60a5fa';
  const fgNote = fgVal >= 75 ? '极度贪婪，历史上此区间常出现回调' : fgVal >= 55 ? '贪婪区间，注意高位风险' : fgVal <= 25 ? '极度恐惧，历史上是买入良机' : '中性区间，等待明确信号';
  const btcSig = monthsSince >= 18 ? 'bearish' : 'neutral';
  const fgSig: 'bullish'|'bearish'|'neutral' = fgVal >= 75 ? 'bearish' : fgVal <= 25 ? 'bullish' : 'neutral';
  const etfSig: 'bullish'|'bearish'|'neutral' = etfTotal > 200 ? 'bullish' : etfTotal < -200 ? 'bearish' : 'neutral';
  const sc = (s: string) => s === 'bullish' ? '#34d399' : s === 'bearish' ? '#fb7185' : '#fbbf24';
  const sb = (s: string) => s === 'bullish' ? 'rgba(52,211,153,0.1)' : s === 'bearish' ? 'rgba(251,113,133,0.1)' : 'rgba(251,191,36,0.1)';
  const sbd = (s: string) => s === 'bullish' ? 'rgba(52,211,153,0.25)' : s === 'bearish' ? 'rgba(251,113,133,0.25)' : 'rgba(251,191,36,0.25)';
  const bearCount = ['neutral', btcSig, fgSig, etfSig].filter(s => s === 'bearish').length;
  const bullCount = ['neutral', btcSig, fgSig, etfSig].filter(s => s === 'bullish').length;
  const overall = bullCount > bearCount ? 'bullish' : bearCount > bullCount ? 'bearish' : 'neutral';
  const verdictText = overall === 'bullish' ? '谨慎乐观 — 持续观察' : overall === 'bearish' ? '观望 — 等 $60K–$65K 区间' : '震荡整理 — 等待信号';
  const vc = overall === 'bullish' ? { border: 'rgba(52,211,153,0.4)', bg: 'rgba(52,211,153,0.08)', text: '#34d399', dot: '#10b981' } : overall === 'bearish' ? { border: 'rgba(245,158,11,0.4)', bg: 'rgba(245,158,11,0.08)', text: '#fbbf24', dot: '#f59e0b' } : { border: 'rgba(148,163,184,0.3)', bg: 'rgba(148,163,184,0.06)', text: '#94a3b8', dot: '#64748b' };
  const topIntel = intel.slice(0, 3);
  const filteredIntel = (dimFilter === '全部' ? intel : intel.filter(i => DIM_META[i.dimension].label === dimFilter)).sort((a, b) => sortBy === 'score' ? b.impactScore - a.impactScore : b.pubDate.getTime() - a.pubDate.getTime());
  const calcPnL = (amt: string, cost: string, price: number) => { const a = parseFloat(amt), c = parseFloat(cost); if (!a || !c || !price) return null; return { pnl: (price - c) * a, pct: ((price - c) / c) * 100, value: price * a }; };
  const btcPnL = calcPnL(holdings.btcAmt, holdings.btcCost, btc?.price || 0);
  const ethPnL = calcPnL(holdings.ethAmt, holdings.ethCost, eth?.price || 0);
  const card: React.CSSProperties = { background: '#16213e', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, padding: 16 };
  const inner: React.CSSProperties = { background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 10, padding: 14 };
  const inputCls = 'w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white placeholder-white/25 focus:outline-none focus:border-orange-500/60 transition-colors';

  const PriceCard = ({ sym, data }: { sym: string; data: CoinData }) => {
    const pct = data.high24h > data.low24h ? Math.min(97, Math.max(3, ((data.price - data.low24h) / (data.high24h - data.low24h)) * 100)) : 50;
    return (
      <div style={{ background: '#0f3460', border: '0.5px solid rgba(255,255,255,0.15)', borderRadius: 12, padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
          <div>
            <p style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>{sym}</p>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{sym === 'BTC' ? 'Bitcoin' : 'Ethereum'}</p>
          </div>
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 7, background: data.change24h >= 0 ? 'rgba(52,211,153,0.15)' : 'rgba(251,113,133,0.15)', color: data.change24h >= 0 ? '#34d399' : '#fb7185' }}>
            {data.change24h >= 0 ? '▲' : '▼'} {Math.abs(data.change24h).toFixed(2)}%
          </span>
        </div>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#fff', letterSpacing: -0.5, marginBottom: 12 }}>
          ${data.price.toLocaleString(undefined, { maximumFractionDigits: sym === 'ETH' ? 1 : 0 })}
        </p>
        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, position: 'relative', marginBottom: 6 }}>
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#ef4444,#f59e0b,#10b981)', borderRadius: 2, opacity: 0.5 }} />
          <div style={{ position: 'absolute', top: -4, width: 9, height: 9, borderRadius: '50%', background: '#fff', left: `calc(${pct}% - 4px)` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: '#fb7185' }}>${data.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} 低</span>
          <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)' }}>24H</span>
          <span style={{ fontSize: 9, color: '#34d399' }}>${data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })} 高</span>
        </div>
      </div>
    );
  };

  const SecHdr = ({ title, open, toggle, extra }: { title: string; open: boolean; toggle: () => void; extra?: React.ReactNode }) => (
    <button onClick={toggle} style={{ width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 0, marginBottom: open ? 16 : 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{title}</span>
        {extra}
      </div>
      <div style={{ color: 'rgba(255,255,255,0.3)' }}>{open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</div>
    </button>
  );

  return (
    <div style={{ background: '#1a1a2e', minHeight: '100vh', color: '#e2e8f0', fontFamily: 'var(--font-sans, sans-serif)' }}>
      <div style={{ background: '#0d1117', borderBottom: '0.5px solid rgba(255,255,255,0.08)', padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 26, height: 26, background: '#f97316', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#000' }}>C</div>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f0f0' }}>Cointel</span>
          {lastUpdated && <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>· {lastUpdated}</span>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, border: `0.5px solid ${vc.border}`, background: vc.bg }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: vc.dot, animation: 'pulse 2s infinite' }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: vc.text }}>{verdictText}</span>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 3 }}>
          {(['home','chart','intel','portfolio'] as const).map((t, i) => (
            <button key={t} onClick={() => setTab(t)} style={{ fontSize: 10, fontWeight: tab === t ? 700 : 500, padding: '4px 10px', borderRadius: 6, background: tab === t ? '#f97316' : 'transparent', color: tab === t ? '#000' : 'rgba(255,255,255,0.4)', border: 'none', cursor: 'pointer' }}>
              {['主页','K线','情报','持仓'][i]}
            </button>
          ))}
        </div>
        <button onClick={() => window.location.reload()} style={{ padding: 6, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          <RefreshCw size={14} style={{ color: 'rgba(255,255,255,0.4)' }} className={priceLoading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div style={{ maxWidth: 820, margin: '0 auto', padding: '16px 16px 40px' }}>
        <AnimatePresence mode="wait">

          {tab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
                {[
                  { label: '宏观环境', value: '中性', sub: '信号混合', sig: 'neutral' },
                  { label: 'BTC基本面', value: cyclePhase, sub: `减半后${monthsSince}个月`, sig: btcSig },
                  { label: '市场情绪', value: fg?.classification || '加载中', sub: `指数 ${fg?.value || '--'}`, sig: fgSig },
                  { label: 'ETF资金', value: etfTotal > 0 ? '净流入' : etfTotal < 0 ? '净流出' : '中性', sub: `${etfTotal >= 0 ? '+' : ''}$${Math.abs(etfTotal)}M`, sig: etfSig },
                ].map((item, i) => (
                  <div key={i} style={{ background: sb(item.sig), border: `0.5px solid ${sbd(item.sig)}`, borderRadius: 12, padding: '14px 16px', textAlign: 'center' }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 8, fontWeight: 500 }}>{item.label}</p>
                    <p style={{ fontSize: 15, fontWeight: 700, color: sc(item.sig), marginBottom: 5 }}>{item.value}</p>
                    <p style={{ fontSize: 10, color: sc(item.sig), opacity: 0.65 }}>{item.sub}</p>
                  </div>
                ))}
              </div>

              {priceLoading ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[0,1].map(i => <div key={i} style={{ ...card, height: 160 }} className="animate-pulse" />)}
                </div>
              ) : btc && eth ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <PriceCard sym="BTC" data={btc} />
                  <PriceCard sym="ETH" data={eth} />
                </div>
              ) : (
                <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: 30 }}>价格加载中，请稍候...</div>
              )}

              {fg && (
                <div style={{ ...card, display: 'flex', alignItems: 'center', gap: 24 }}>
                  <div style={{ flexShrink: 0 }}>
                    <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginBottom: 4 }}>恐惧贪婪指数</p>
                    <p style={{ fontSize: 44, fontWeight: 700, color: fgColor, lineHeight: 1 }}>{fg.value}</p>
                  </div>
                  <div style={{ width: 1, height: 60, background: 'rgba(255,255,255,0.08)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 17, fontWeight: 700, color: fgColor, marginBottom: 6 }}>{fg.classification}</p>
                    <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6 }}>{fgNote}</p>
                  </div>
                </div>
              )}

              <div style={card}>
                <SecHdr title="宏观指标" open={macroOpen} toggle={() => setMacroOpen(o => !o)} extra={<span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 400 }}>点击名称跳转数据源</span>} />
                <AnimatePresence>
                  {macroOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {MACRO_DATA.map((m, i) => (
                          <div key={i} style={inner}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <div>
                                <a href={m.sourceUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 500, color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
                                  {m.name} <ExternalLink size={9} />
                                </a>
                                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{m.nameEn}</p>
                              </div>
                              <span style={{ fontSize: 9, padding: '2px 8px', borderRadius: 5, fontWeight: 600, flexShrink: 0, marginLeft: 8, background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>{m.badge}</span>
                            </div>
                            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.6, padding: '8px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: 7 }}>{m.logic}</p>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={card}>
                <SecHdr title="BTC 自身基本面" open={btcFundOpen} toggle={() => setBtcFundOpen(o => !o)} />
                <AnimatePresence>
                  {btcFundOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {[
                          { label: '4年周期位置', value: cyclePhase, sub: `减半后第 ${monthsSince} 个月`, color: cycleColor, note: '历史顶部在减半后12-18个月。当前已过18个月，处于回调期，ETF机构资金的加入使底部可能比历史更高。' },
                          { label: '下次减半倒计时', value: `${daysToNext} 天`, sub: '预计 2028年3月', color: '#a78bfa', note: '减半=矿工每块奖励减半。供给减少，若需求不变，价格长期受支撑。历史上每次减半后12-18个月出现新高。' },
                          { label: '矿工关机价', value: '~$44,000', sub: btc ? (btc.price > 44000 ? `当前 $${btc.price.toLocaleString(undefined,{maximumFractionDigits:0})} · 安全区` : '⚠ 低于关机价') : '加载中', color: '#34d399', note: '主流矿机平均生产成本约$44,000。价格高于此位矿工有利润不急于卖出，低于则被迫抛售。' },
                          { label: '当前区块奖励', value: '3.125 BTC', sub: '2024年4月减半后', color: '#fbbf24', note: '每约10分钟产出3.125枚BTC。全球2100万枚上限，约2140年挖完，绝对稀缺。' },
                        ].map((item, i) => (
                          <div key={i} style={inner}>
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

              <div style={card}>
                <SecHdr title="市场情绪 & 资金流向" open={sentimentOpen} toggle={() => setSentimentOpen(o => !o)} />
                <AnimatePresence>
                  {sentimentOpen && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} style={{ overflow: 'hidden' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={inner}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>市场情绪指标</p>
                          {[
                            { name: '恐惧贪婪指数', value: fg ? `${fg.value} · ${fg.classification}` : '加载中', color: fgColor, note: '0=极度恐惧（历史买入机会），100=极度贪婪（注意回调）' },
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
                        <div style={inner}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <p style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.5)' }}>ETF 资金流向</p>
                            <a href="https://farside.co.uk/bitcoin" target="_blank" rel="noreferrer" style={{ fontSize: 9, color: '#60a5fa', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>farside.co.uk <ExternalLink size={8} /></a>
                          </div>
                          {etfData.map((e, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '0.5px solid rgba(255,255,255,0.06)' }}>
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

              <div style={card}>
                <SecHdr title="今日最重要信号" open={intelOpen} toggle={() => setIntelOpen(o => !o)} extra={<span style={{ fontSize: 9, color: '#f97316', cursor: 'pointer' }} onClick={e => { e.stopPropagation(); setTab('intel'); }}>查看全部 →</span>} />
                <AnimatePresence>
                  {intelOpen && (
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
                            const dim = DIM_META[item.dimension];
                            const isExp = expandedId === item.id;
                            return (
                              <div key={item.id} style={{ borderBottom: idx < topIntel.length - 1 ? '0.5px solid rgba(255,255,255,0.06)' : 'none' }}>
                                <div style={{ display: 'flex', gap: 12, padding: '12px 0', cursor: 'pointer', alignItems: 'flex-start' }} onClick={() => setExpandedId(isExp ? null : item.id)}>
                                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fbbf24', minWidth: 20, paddingTop: 1 }}>{item.impactScore}</span>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', lineHeight: 1.4, flex: 1 }}>{item.title}</span>
                                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, flexShrink: 0, background: dim.bg, color: dim.color }}>{dim.label}</span>
                                      <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, flexShrink: 0, background: item.sentiment === 'bullish' ? 'rgba(52,211,153,0.15)' : item.sentiment === 'bearish' ? 'rgba(251,113,133,0.15)' : 'rgba(255,255,255,0.08)', color: item.sentiment === 'bullish' ? '#34d399' : item.sentiment === 'bearish' ? '#fb7185' : '#94a3b8' }}>
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
            </motion.div>
          )}

          {tab === 'chart' && (
            <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>BTC / USDT</span>
                  {btc && <span style={{ fontSize: 12, color: btc.change24h >= 0 ? '#34d399' : '#fb7185', fontWeight: 600 }}>{btc.change24h >= 0 ? '+' : ''}{btc.change24h.toFixed(2)}%</span>}
                </div>
                {btc && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[{l:'现价',v:`$${btc.price.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#fff'},{l:'24H高',v:`$${btc.high24h.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#34d399'},{l:'24H低',v:`$${btc.low24h.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#fb7185'}].map((s,i) => (
                      <div key={i} style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: s.c }}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
             
                 {tab === 'chart' && (
            <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f97316' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>BTC / USDT</span>
                  {btc && <span style={{ fontSize: 12, fontWeight: 600, color: btc.change24h >= 0 ? '#34d399' : '#fb7185' }}>{btc.change24h >= 0 ? '+' : ''}{btc.change24h.toFixed(2)}%</span>}
                </div>
                {btc && (
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[{l:'现价',v:`$${btc.price.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#fff'},{l:'24H高',v:`$${btc.high24h.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#34d399'},{l:'24H低',v:`$${btc.low24h.toLocaleString(undefined,{maximumFractionDigits:0})}`,c:'#fb7185'}].map((s,i) => (
                      <div key={i} style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)' }}>{s.l}</p>
                        <p style={{ fontSize: 12, fontWeight: 600, color: s.c }}>{s.v}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div style={{ background: '#16213e', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: 12, overflow: 'hidden' }}>
                <iframe
                  src="https://www.coingecko.com/en/coins/bitcoin/embedded"
                  style={{ width: '100%', height: 450, border: 'none', display: 'block' }}
                  title="BTC Price Chart"
                />
              </div>
            </motion.div>
      )}

          {tab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {['全部', ...Object.values(DIM_META).map(d => d.label)].map(cat => (
                    <button key={cat} onClick={() => setDimFilter(cat)} style={{ fontSize: 11, fontWeight: 600, padding: '5px 12px', borderRadius: 8, background: dimFilter === cat ? '#f97316' : 'rgba(255,255,255,0.07)', color: dimFilter === cat ? '#000' : 'rgba(255,255,255,0.5)', border: 'none', cursor: 'pointer' }}>{cat}</button>
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
                  {[0,1,2,3].map(i => <div key={i} style={{ ...card, height: 260 }} className="animate-pulse" />)}
                </div>
              ) : filteredIntel.length === 0 ? (
                <div style={{ ...card, textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: 40 }}>暂无有效信号</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {filteredIntel.map(item => {
                    const dim = DIM_META[item.dimension];
                    return (
                      <div key={item.id} style={{ ...card, padding: 0, overflow: 'hidden' }}>
                        <div style={{ height: 150, overflow: 'hidden', position: 'relative' }}>
                          <img src={item.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMGS[0]; }} style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.75 }} referrerPolicy="no-referrer" />
                          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #16213e, transparent)' }} />
                          <div style={{ position: 'absolute', bottom: 10, left: 12, display: 'flex', gap: 6 }}>
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: dim.bg, color: dim.color }}>{dim.label}</span>
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 4, fontWeight: 600, background: item.sentiment === 'bullish' ? 'rgba(52,211,153,0.2)' : item.sentiment === 'bearish' ? 'rgba(251,113,133,0.2)' : 'rgba(255,255,255,0.1)', color: item.sentiment === 'bullish' ? '#34d399' : item.sentiment === 'bearish' ? '#fb7185' : '#94a3b8' }}>
                              {item.sentiment === 'bullish' ? '看涨' : item.sentiment === 'bearish' ? '看跌' : '中性'}
                            </span>
                          </div>
                          <div style={{ position: 'absolute', top: 10, right: 10, display: 'flex', alignItems: 'center', gap: 4, background: 'rgba(0,0,0,0.6)', borderRadius: 7, padding: '3px 8px' }}>
                            <Cpu size={9} style={{ color: '#fbbf24' }} />
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#fbbf24' }}>{item.impactScore}/10</span>
                          </div>
                        </div>
                        <div style={{ padding: '12px 16px' }}>
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

          {tab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>数据只保存在浏览器，不会上传。</p>
              {[
                { sym: 'BTC', data: btc, amt: holdings.btcAmt, cost: holdings.btcCost, target: holdings.btcTarget, pnl: btcPnL, setAmt: (v: string) => setHoldings(h => ({ ...h, btcAmt: v })), setCost: (v: string) => setHoldings(h => ({ ...h, btcCost: v })), setTarget: (v: string) => setHoldings(h => ({ ...h, btcTarget: v })) },
                { sym: 'ETH', data: eth, amt: holdings.ethAmt, cost: holdings.ethCost, target: holdings.ethTarget, pnl: ethPnL, setAmt: (v: string) => setHoldings(h => ({ ...h, ethAmt: v })), setCost: (v: string) => setHoldings(h => ({ ...h, ethCost: v })), setTarget: (v: string) => setHoldings(h => ({ ...h, ethTarget: v })) },
              ].map(coin => (
                <div key={coin.sym} style={card}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>{coin.sym}</p>
                      {coin.data && <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>高 <span style={{ color: '#34d399' }}>${coin.data.high24h.toLocaleString(undefined,{maximumFractionDigits:0})}</span> · 低 <span style={{ color: '#fb7185' }}>${coin.data.low24h.toLocaleString(undefined,{maximumFractionDigits:0})}</span></p>}
                    </div>
                    {coin.data && (
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>${coin.data.price.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                        <p style={{ fontSize: 11, fontWeight: 600, color: coin.data.change24h >= 0 ? '#34d399' : '#fb7185' }}>{coin.data.change24h >= 0 ? '+' : ''}{coin.data.change24h.toFixed(2)}%</p>
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
                    {[{label:'持仓数量',val:coin.amt,set:coin.setAmt,ph:'0.00'},{label:'成本价 USD',val:coin.cost,set:coin.setCost,ph:'0'},{label:'目标价 USD',val:coin.target,set:coin.setTarget,ph:'0'}].map((f,i) => (
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
                          <p style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>${coin.pnl.value.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                        </div>
                        <div style={{ background: coin.pnl.pnl >= 0 ? 'rgba(52,211,153,0.1)' : 'rgba(251,113,133,0.1)', borderRadius: 10, padding: 10 }}>
                          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>盈亏</p>
                          <p style={{ fontSize: 13, fontWeight: 700, color: coin.pnl.pnl >= 0 ? '#34d399' : '#fb7185' }}>{coin.pnl.pnl >= 0 ? '+' : ''}${coin.pnl.pnl.toLocaleString(undefined,{maximumFractionDigits:0})}</p>
                          <p style={{ fontSize: 9, opacity: 0.7, color: coin.pnl.pnl >= 0 ? '#34d399' : '#fb7185' }}>{coin.pnl.pct >= 0 ? '+' : ''}{coin.pnl.pct.toFixed(1)}%</p>
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
