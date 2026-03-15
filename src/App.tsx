import React, { useState, useEffect, useRef } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, Globe,
  Zap, AlertCircle, Activity, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
interface TickerData {
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  volume: number;
  prevClose: number;
}

interface Tickers {
  BTC: TickerData;
  ETH: TickerData;
}

interface FearGreed {
  value: string;
  value_classification: string;
}

interface IntelItem {
  id: string;
  source: string;
  category: 'Macro' | 'Institutional' | 'Technical' | 'Narrative';
  title: string;
  summary: string;
  time: string;
  pubDate: Date;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  imageUrl?: string;
  link?: string;
}

interface MacroEvent {
  time: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
}

// --- Constants ---
const MACRO_EVENTS: MacroEvent[] = [
  { time: '今日 21:30', event: '美国 CPI 通胀数据', impact: 'high' },
  { time: '明日 02:00', event: '美联储会议纪要', impact: 'high' },
  { time: '本周五 22:00', event: '非农就业人数', impact: 'high' },
  { time: '下周二 21:30', event: '美国 PPI 数据', impact: 'medium' },
];

const RSS_SOURCES = [
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss', name: 'CoinTelegraph' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed', name: 'Decrypt' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
];

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&q=80',
  'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=400&q=80',
  'https://images.unsplash.com/photo-1591994843349-f415893b3a6b?w=400&q=80',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&q=80',
];

function classifyArticle(title: string): { category: IntelItem['category']; sentiment: IntelItem['sentiment'] } {
  const t = title.toLowerCase();
  const category: IntelItem['category'] =
    /fed|cpi|inflation|rate|gdp|economy|macro|treasury|yield|dollar|powell/i.test(t) ? 'Macro' :
    /etf|blackrock|fidelity|institution|fund|sec|grayscale|coinbase|nasdaq/i.test(t) ? 'Institutional' :
    /sol|bnb|xrp|altcoin|token|defi|nft|layer|chain|protocol|narrative/i.test(t) ? 'Narrative' : 'Technical';
  const sentiment: IntelItem['sentiment'] =
    /bull|surge|rally|rise|gain|pump|ath|inflow|approve|launch|record|high/i.test(t) ? 'bullish' :
    /bear|drop|fall|crash|sell|dump|low|outflow|ban|hack|warn|risk|fear/i.test(t) ? 'bearish' : 'neutral';
  return { category, sentiment };
}

// --- Main App ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'intel' | 'portfolio'>('overview');

  // Price state — WebSocket
  const [tickers, setTickers] = useState<Tickers>({
    BTC: { price: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, prevClose: 0 },
    ETH: { price: 0, change: 0, changePct: 0, high: 0, low: 0, volume: 0, prevClose: 0 },
  });
  const [wsConnected, setWsConnected] = useState(false);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [priceFlash, setPriceFlash] = useState<{ BTC?: 'up' | 'down'; ETH?: 'up' | 'down' }>({});
  const prevPrices = useRef<{ BTC: number; ETH: number }>({ BTC: 0, ETH: 0 });
  const wsRef = useRef<WebSocket | null>(null);

  // Intel state
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');

  // Portfolio state
  const [holdings, setHoldings] = useState({
    btcAmount: '', btcCost: '', btcTarget: '',
    ethAmount: '', ethCost: '', ethTarget: '',
  });

  // --- WebSocket: Binance combined stream ---
  useEffect(() => {
    const connect = () => {
      const ws = new WebSocket('wss://stream.binance.com:9443/stream?streams=btcusdt@ticker/ethusdt@ticker');
      wsRef.current = ws;

      ws.onopen = () => setWsConnected(true);
      ws.onclose = () => {
        setWsConnected(false);
        setTimeout(connect, 3000); // auto-reconnect
      };
      ws.onerror = () => ws.close();

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          const d = msg.data;
          if (!d) return;
          const symbol = d.s === 'BTCUSDT' ? 'BTC' : 'ETH';
          const price = parseFloat(d.c);
          const high = parseFloat(d.h);
          const low = parseFloat(d.l);
          const prevClose = parseFloat(d.x);
          const change = parseFloat(d.p);
          const changePct = parseFloat(d.P);
          const volume = parseFloat(d.v);

          // Flash effect
          const prev = prevPrices.current[symbol];
          if (prev !== 0 && price !== prev) {
            setPriceFlash(f => ({ ...f, [symbol]: price > prev ? 'up' : 'down' }));
            setTimeout(() => setPriceFlash(f => ({ ...f, [symbol]: undefined })), 600);
          }
          prevPrices.current[symbol] = price;

          setTickers(t => ({
            ...t,
            [symbol]: { price, high, low, prevClose, change, changePct, volume },
          }));
        } catch {}
      };
    };

    connect();
    return () => wsRef.current?.close();
  }, []);

  // --- Fear & Greed ---
  useEffect(() => {
    fetch('https://api.alternative.me/fng/')
      .then(r => r.json())
      .then(d => setFearGreed(d.data?.[0] || null))
      .catch(() => {});
  }, []);

  // --- RSS Intel ---
  const fetchIntel = async () => {
    setIntelLoading(true);
    try {
      const results = await Promise.all(
        RSS_SOURCES.map(src =>
          fetch(src.url).then(r => r.json()).catch(() => ({ items: [], feed: { title: src.name } }))
        )
      );
      const items: IntelItem[] = results.flatMap((feed, si) =>
        (feed.items || []).slice(0, 5).map((item: any, i: number) => {
          const { category, sentiment } = classifyArticle(item.title || '');
          const rawImg = item.enclosure?.link || item.thumbnail || item['media:content']?.url || '';
          const imageUrl = rawImg && rawImg.startsWith('http') ? rawImg : FALLBACK_IMAGES[(si * 5 + i) % FALLBACK_IMAGES.length];
          return {
            id: `${si}-${i}`,
            source: feed.feed?.title || RSS_SOURCES[si].name,
            category,
            title: item.title || '',
            summary: item.description?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 140) || '',
            time: item.pubDate ? new Date(item.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚',
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            sentiment,
            imageUrl,
            link: item.link || undefined,
          };
        })
      );
      // Sort by newest first
      items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      setIntel(items);
    } catch (e) {
      console.error(e);
    } finally {
      setIntelLoading(false);
    }
  };

  useEffect(() => {
    fetchIntel();
    const interval = setInterval(fetchIntel, 5 * 60 * 1000); // refresh every 5 min
    return () => clearInterval(interval);
  }, []);

  // --- Helpers ---
  const btc = tickers.BTC;
  const eth = tickers.ETH;
  const fgVal = fearGreed ? parseInt(fearGreed.value) : 50;
  const fgColor = fgVal >= 75 ? '#f43f5e' : fgVal >= 55 ? '#f97316' : fgVal >= 45 ? '#eab308' : fgVal >= 25 ? '#10b981' : '#3b82f6';

  const calcPnL = (amount: string, cost: string, price: number) => {
    const a = parseFloat(amount), c = parseFloat(cost);
    if (!a || !c || !price) return null;
    const pnl = (price - c) * a;
    const pct = ((price - c) / c) * 100;
    return { pnl, pct, value: price * a };
  };

  const btcPnL = calcPnL(holdings.btcAmount, holdings.btcCost, btc.price);
  const ethPnL = calcPnL(holdings.ethAmount, holdings.ethCost, eth.price);

  const filteredIntel = activeCategory === '全部' ? intel : intel.filter(i =>
    activeCategory === '宏观' ? i.category === 'Macro' :
    activeCategory === '机构' ? i.category === 'Institutional' :
    activeCategory === '叙事' ? i.category === 'Narrative' : i.category === 'Technical'
  );

  const categoryColor = (c: IntelItem['category']) =>
    c === 'Macro' ? 'bg-blue-500/15 text-blue-400' :
    c === 'Institutional' ? 'bg-purple-500/15 text-purple-400' :
    c === 'Narrative' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400';

  const categoryLabel = (c: IntelItem['category']) =>
    c === 'Macro' ? '宏观' : c === 'Institutional' ? '机构' : c === 'Narrative' ? '叙事' : '技术';

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors";

  const PriceCard = ({ symbol, data, flash }: { symbol: 'BTC' | 'ETH'; data: TickerData; flash?: 'up' | 'down' }) => (
    <div className={`bg-white/4 border rounded-2xl p-5 transition-all duration-300 ${flash === 'up' ? 'border-emerald-500/60 bg-emerald-500/5' : flash === 'down' ? 'border-rose-500/60 bg-rose-500/5' : 'border-white/8'}`}>
      {data.price === 0 ? (
        <div className="animate-pulse space-y-3">
          <div className="h-3 bg-white/10 rounded w-16" />
          <div className="h-8 bg-white/10 rounded w-36" />
          <div className="h-3 bg-white/10 rounded w-24" />
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <div>
              <p className="text-xs font-bold text-slate-400">{symbol}</p>
              <p className="text-[10px] text-slate-600">{symbol === 'BTC' ? 'Bitcoin' : 'Ethereum'}</p>
            </div>
            <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${data.changePct >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
              {data.changePct >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
              {data.changePct >= 0 ? '+' : ''}{data.changePct.toFixed(2)}%
            </span>
          </div>
          <p className={`text-3xl font-black transition-colors duration-300 ${flash === 'up' ? 'text-emerald-400' : flash === 'down' ? 'text-rose-400' : 'text-white'}`}>
            ${data.price.toLocaleString(undefined, { minimumFractionDigits: symbol === 'ETH' ? 2 : 0, maximumFractionDigits: symbol === 'ETH' ? 2 : 0 })}
          </p>
          <div className="flex items-center gap-4 mt-3 text-[10px]">
            <div className="flex items-center gap-1">
              <span className="text-slate-600">24H高</span>
              <span className="text-emerald-400 font-semibold">${data.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-slate-600">24H低</span>
              <span className="text-rose-400 font-semibold">${data.low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            </div>
          </div>
          <div className="mt-2">
            <div className="h-1 bg-white/8 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-rose-500 via-amber-500 to-emerald-500 rounded-full"
                style={{ width: `${data.high > data.low ? ((data.price - data.low) / (data.high - data.low)) * 100 : 50}%` }} />
            </div>
            <div className="flex justify-between mt-0.5 text-[9px] text-slate-600">
              <span>低点</span><span>当前位置</span><span>高点</span>
            </div>
          </div>
          <p className="text-[10px] text-slate-600 mt-2">24h 成交量 ${(data.volume * data.price / 1e9).toFixed(1)}B</p>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/8 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-black" />
          </div>
          <span className="font-bold text-sm text-white">Cointel</span>
          <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] font-bold ${wsConnected ? 'bg-emerald-500/15 text-emerald-400' : 'bg-slate-500/15 text-slate-500'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'}`} />
            {wsConnected ? 'LIVE' : '连接中...'}
          </div>
        </div>

        <nav className="flex bg-white/5 rounded-xl p-1 gap-0.5">
          {[
            { id: 'overview', label: '今日概览' },
            { id: 'intel', label: '情报流' },
            { id: 'portfolio', label: '我的持仓' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </nav>

        <button onClick={fetchIntel} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <RefreshCw size={15} className={`text-slate-500 ${intelLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 pb-12">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Price cards */}
              <div className="grid grid-cols-2 gap-3">
                <PriceCard symbol="BTC" data={btc} flash={priceFlash.BTC} />
                <PriceCard symbol="ETH" data={eth} flash={priceFlash.ETH} />
              </div>

              {/* Fear & Greed + Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5">
                  <p className="text-[10px] text-slate-500">恐惧贪婪</p>
                  <p className="text-4xl font-black" style={{ color: fgColor }}>{fearGreed?.value || '—'}</p>
                  <p className="text-[10px] font-semibold" style={{ color: fgColor }}>{fearGreed?.value_classification || '加载中'}</p>
                </div>
                <div className="col-span-2 bg-white/4 border border-white/8 rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-2"><Activity size={10} /> 今日一句话总结</p>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {btc.price === 0 ? '正在连接实时数据...' :
                      btc.changePct >= 3 ? `BTC 强势上涨 +${btc.changePct.toFixed(1)}%，日内区间 $${btc.low.toLocaleString()}–$${btc.high.toLocaleString()}，市场情绪偏多，注意阻力位获利了结。` :
                      btc.changePct <= -3 ? `BTC 明显下跌 ${btc.changePct.toFixed(1)}%，日内区间 $${btc.low.toLocaleString()}–$${btc.high.toLocaleString()}，情绪转弱，关注 $${btc.low.toLocaleString()} 支撑。` :
                      `BTC 窄幅整理 ${btc.changePct >= 0 ? '+' : ''}${btc.changePct.toFixed(1)}%，日内区间 $${btc.low.toLocaleString()}–$${btc.high.toLocaleString()}，${fearGreed?.value_classification || ''} 信号，等待方向选择。`}
                  </p>
                </div>
              </div>

              {/* Macro Events */}
              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-4">
                  <Globe size={10} /> 近期宏观事件
                  <span className="ml-auto text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded font-bold">影响加密市场</span>
                </p>
                <div className="space-y-3">
                  {MACRO_EVENTS.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 w-28 shrink-0">{ev.time}</span>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.impact === 'high' ? 'bg-rose-500' : ev.impact === 'medium' ? 'bg-amber-500' : 'bg-slate-600'}`} />
                      <span className="text-sm text-slate-200">{ev.event}</span>
                      {ev.impact === 'high' && <span className="text-[9px] bg-rose-500/15 text-rose-400 px-1.5 py-0.5 rounded ml-auto font-bold">高影响</span>}
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* ── INTEL ── */}
          {activeTab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              <div className="flex items-center justify-between">
                <div className="flex gap-2 flex-wrap">
                  {['全部', '宏观', '机构', '叙事', '技术'].map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeCategory === cat ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                      {cat}
                    </button>
                  ))}
                </div>
                <button onClick={fetchIntel} className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-white transition-colors">
                  <RefreshCw size={11} className={intelLoading ? 'animate-spin' : ''} /> 刷新
                </button>
              </div>

              {intelLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                      <div className="h-40 bg-white/8" />
                      <div className="p-4 space-y-2">
                        <div className="h-3 bg-white/10 rounded w-1/3" />
                        <div className="h-4 bg-white/10 rounded w-full" />
                        <div className="h-3 bg-white/10 rounded w-4/5" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredIntel.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-600 gap-3">
                  <AlertCircle size={22} /><span className="text-sm">暂无该分类情报</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIntel.map(item => (
                    <article key={item.id} className="group bg-white/4 border border-white/8 rounded-2xl overflow-hidden hover:border-orange-500/40 transition-all">
                      {/* Image */}
                      {item.imageUrl && (
                        <div className="h-44 overflow-hidden relative">
                          <img src={item.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]; }}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-4 flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${categoryColor(item.category)}`}>
                              {categoryLabel(item.category)}
                            </span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : item.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-400'}`}>
                              {item.sentiment === 'bullish' ? '看涨' : item.sentiment === 'bearish' ? '看跌' : '中性'}
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Content */}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-orange-400">{item.source}</span>
                          <span className="text-[10px] text-slate-600">{item.time}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white leading-snug mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">
                          {item.title}
                        </h3>
                        {item.summary && (
                          <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{item.summary}</p>
                        )}
                        {item.link && (
                          <a href={item.link} target="_blank" rel="noreferrer"
                            className="mt-3 flex items-center gap-1 text-[10px] text-slate-600 hover:text-orange-400 transition-colors">
                            <ExternalLink size={10} /> 阅读原文
                          </a>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── PORTFOLIO ── */}
          {activeTab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              <p className="text-[11px] text-slate-600">输入持仓信息，实时计算盈亏。数据只保存在浏览器，不会上传。</p>

              {[
                { symbol: 'BTC' as const, name: 'Bitcoin', data: btc, flash: priceFlash.BTC,
                  amount: holdings.btcAmount, cost: holdings.btcCost, target: holdings.btcTarget,
                  pnl: btcPnL,
                  setAmount: (v: string) => setHoldings(h => ({ ...h, btcAmount: v })),
                  setCost: (v: string) => setHoldings(h => ({ ...h, btcCost: v })),
                  setTarget: (v: string) => setHoldings(h => ({ ...h, btcTarget: v })),
                },
                { symbol: 'ETH' as const, name: 'Ethereum', data: eth, flash: priceFlash.ETH,
                  amount: holdings.ethAmount, cost: holdings.ethCost, target: holdings.ethTarget,
                  pnl: ethPnL,
                  setAmount: (v: string) => setHoldings(h => ({ ...h, ethAmount: v })),
                  setCost: (v: string) => setHoldings(h => ({ ...h, ethCost: v })),
                  setTarget: (v: string) => setHoldings(h => ({ ...h, ethTarget: v })),
                },
              ].map(coin => (
                <div key={coin.symbol} className="bg-white/4 border border-white/8 rounded-2xl p-5 space-y-4">
                  {/* Price header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{coin.symbol} <span className="text-slate-500 font-normal text-xs">{coin.name}</span></p>
                      <div className="flex gap-3 mt-0.5 text-[10px]">
                        <span className="text-slate-600">24H高 <span className="text-emerald-400">${coin.data.high.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                        <span className="text-slate-600">24H低 <span className="text-rose-400">${coin.data.low.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-black transition-colors duration-300 ${coin.flash === 'up' ? 'text-emerald-400' : coin.flash === 'down' ? 'text-rose-400' : 'text-white'}`}>
                        ${coin.data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                      <p className={`text-xs font-bold ${coin.data.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {coin.data.changePct >= 0 ? '+' : ''}{coin.data.changePct.toFixed(2)}%
                      </p>
                    </div>
                  </div>

                  {/* Inputs */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1.5">持仓数量</label>
                      <input type="number" value={coin.amount} onChange={e => coin.setAmount(e.target.value)} placeholder="0.00" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1.5">成本价 (USD)</label>
                      <input type="number" value={coin.cost} onChange={e => coin.setCost(e.target.value)} placeholder="0" className={inputCls} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1.5">目标价 (USD)</label>
                      <input type="number" value={coin.target} onChange={e => coin.setTarget(e.target.value)} placeholder="0" className={inputCls} />
                    </div>
                  </div>

                  {/* PnL */}
                  {coin.pnl && (
                    <>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-white/3 rounded-xl p-3">
                          <p className="text-[10px] text-slate-500 mb-1">当前市值</p>
                          <p className="text-sm font-bold text-white">${coin.pnl.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className={`rounded-xl p-3 ${coin.pnl.pnl >= 0 ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          <p className="text-[10px] text-slate-500 mb-1">盈亏</p>
                          <p className={`text-sm font-bold ${coin.pnl.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {coin.pnl.pnl >= 0 ? '+' : ''}${coin.pnl.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                          <p className={`text-[10px] ${coin.pnl.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {coin.pnl.pct >= 0 ? '+' : ''}{coin.pnl.pct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-white/3 rounded-xl p-3">
                          <p className="text-[10px] text-slate-500 mb-1">距目标</p>
                          {coin.target && coin.data.price ? (
                            <>
                              <p className={`text-sm font-bold ${parseFloat(coin.target) > coin.data.price ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {parseFloat(coin.target) > coin.data.price
                                  ? `差 ${(((parseFloat(coin.target) - coin.data.price) / coin.data.price) * 100).toFixed(1)}%`
                                  : '已超目标 ✓'}
                              </p>
                              <p className="text-[10px] text-slate-600">目标 ${parseFloat(coin.target).toLocaleString()}</p>
                            </>
                          ) : <p className="text-sm text-slate-600">未设定</p>}
                        </div>
                      </div>

                      <div className={`rounded-xl p-3 text-sm leading-relaxed ${coin.pnl.pct >= 20 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : coin.pnl.pct <= -15 ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' : 'bg-white/3 text-slate-400'}`}>
                        {coin.pnl.pct >= 20 ? '📈 盈利超 20%，可考虑分批止盈，锁定部分利润。'
                          : coin.pnl.pct <= -15 ? '⚠️ 浮亏超 15%，评估基本面是否变化，避免情绪化操作。'
                          : coin.pnl.pct > 0 ? '持仓盈利中，继续持有观察，关注目标价位。'
                          : '小幅亏损，属正常波动范围，保持耐心。'}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </motion.div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
}
