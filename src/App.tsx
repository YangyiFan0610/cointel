import React, { useState, useEffect, useCallback } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, Globe,
  Zap, AlertCircle, Activity, ExternalLink,
  ChevronDown, ChevronUp, BarChart2, Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────
interface CoinData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
  ath: number;
  athDate: string;
}

interface Prices {
  BTC: CoinData;
  ETH: CoinData;
}

interface FearGreed {
  value: string;
  classification: string;
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
  description: string;
  cryptoEffect: string;
}

// ─── Static Data ─────────────────────────────────────────
const MACRO_EVENTS: MacroEvent[] = [
  {
    time: '今日 21:30',
    event: '美国 CPI 通胀数据',
    impact: 'high',
    description: '消费者价格指数衡量一篮子商品和服务的价格变化，是美联储制定利率政策的核心参考指标。',
    cryptoEffect: '若 CPI 高于预期 → 美联储可能推迟降息 → 美元走强 → BTC 承压下跌。若低于预期 → 降息预期升温 → 风险资产上涨 → BTC 受益。',
  },
  {
    time: '明日 02:00',
    event: '美联储会议纪要',
    impact: 'high',
    description: '美联储上次议息会议的详细讨论记录，市场通过纪要判断委员们对未来利率路径的倾向。',
    cryptoEffect: '鸽派纪要（倾向降息）→ BTC 上涨。鹰派纪要（倾向维持高利率）→ BTC 承压。关注"数据依赖"和"通胀"字眼出现频率。',
  },
  {
    time: '本周五 22:00',
    event: '非农就业人数',
    impact: 'high',
    description: '美国非农业部门新增就业人数，反映经济活力，是美联储决策的重要参考。数据越强，降息越远。',
    cryptoEffect: '数据强劲 → 经济过热 → 降息推迟 → BTC 短期承压。数据疲软 → 降息预期增强 → 流动性宽松预期 → BTC 受益。',
  },
  {
    time: '下周二 21:30',
    event: '美国 PPI 数据',
    impact: 'medium',
    description: '生产者价格指数，衡量生产环节的通胀水平，是 CPI 的先行指标，影响相对较 CPI 小。',
    cryptoEffect: 'PPI 上升预示未来 CPI 可能上升，间接对加密市场形成压力。通常市场反应不如 CPI 剧烈。',
  },
];

const RSS_SOURCES = [
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss', name: 'CoinTelegraph' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed', name: 'Decrypt' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https://coindesk.com/arc/outboundfeeds/rss/', name: 'CoinDesk' },
];

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
  'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=600&q=80',
  'https://images.unsplash.com/photo-1591994843349-f415893b3a6b?w=600&q=80',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80',
];

// ─── Helpers ─────────────────────────────────────────────
function classifyArticle(title: string) {
  const t = title.toLowerCase();
  const category: IntelItem['category'] =
    /fed|cpi|inflation|rate|gdp|economy|macro|treasury|yield|dollar|powell/i.test(t) ? 'Macro' :
    /etf|blackrock|fidelity|institution|fund|sec|grayscale|coinbase|nasdaq/i.test(t) ? 'Institutional' :
    /sol|bnb|xrp|altcoin|token|defi|nft|layer|chain|protocol|narrative/i.test(t) ? 'Narrative' : 'Technical';
  const sentiment: IntelItem['sentiment'] =
    /bull|surge|rally|rise|gain|pump|ath|inflow|approve|launch|record/i.test(t) ? 'bullish' :
    /bear|drop|fall|crash|sell|dump|low|outflow|ban|hack|warn|risk|fear/i.test(t) ? 'bearish' : 'neutral';
  return { category, sentiment };
}

const catColor = (c: IntelItem['category']) =>
  c === 'Macro' ? 'bg-blue-500/15 text-blue-400' :
  c === 'Institutional' ? 'bg-purple-500/15 text-purple-400' :
  c === 'Narrative' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400';

const catLabel = (c: IntelItem['category']) =>
  ({ Macro: '宏观', Institutional: '机构', Narrative: '叙事', Technical: '技术' })[c];

const impactDot = (i: MacroEvent['impact']) =>
  i === 'high' ? 'bg-rose-500' : i === 'medium' ? 'bg-amber-500' : 'bg-slate-600';

const impactBadge = (i: MacroEvent['impact']) =>
  i === 'high' ? 'bg-rose-500/15 text-rose-400' : i === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400';

// ─── TradingView Widget ───────────────────────────────────
function TradingViewChart({ symbol }: { symbol: 'BTC' | 'ETH' }) {
  const id = `tv-${symbol}`;
  useEffect(() => {
    const container = document.getElementById(id);
    if (!container) return;
    container.innerHTML = '';
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      if ((window as any).TradingView) {
        new (window as any).TradingView.widget({
          container_id: id,
          symbol: `BINANCE:${symbol}USDT`,
          interval: '60',
          timezone: 'Asia/Shanghai',
          theme: 'dark',
          style: '1',
          locale: 'zh_CN',
          toolbar_bg: '#0a0a0a',
          enable_publishing: false,
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
          width: '100%',
          height: 480,
          backgroundColor: '#0a0a0a',
          gridColor: 'rgba(255,255,255,0.03)',
        });
      }
    };
    document.head.appendChild(script);
    return () => { if (document.head.contains(script)) document.head.removeChild(script); };
  }, [symbol]);
  return <div id={id} className="w-full rounded-xl overflow-hidden" style={{ height: 480 }} />;
}

// ─── App ─────────────────────────────────────────────────
export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'intel' | 'portfolio'>('overview');
  const [chartSymbol, setChartSymbol] = useState<'BTC' | 'ETH'>('BTC');

  // Prices
  const [prices, setPrices] = useState<Prices | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // Summary expanded state
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Macro event expanded
  const [expandedMacro, setExpandedMacro] = useState<number | null>(null);

  // Intel
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');

  // Portfolio
  const [holdings, setHoldings] = useState({ btcAmt: '', btcCost: '', btcTarget: '', ethAmt: '', ethCost: '', ethTarget: '' });

  // ── Fetch prices via CoinGecko REST (stable, no WebSocket issues) ──
  const fetchPrices = useCallback(async () => {
    try {
      const [cgRes, fgRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false&price_change_percentage=24h'),
        fetch('https://api.alternative.me/fng/'),
      ]);
      if (!cgRes.ok) throw new Error('CoinGecko error');
      const cgData = await cgRes.json();
      const fgData = await fgRes.json().catch(() => null);

      const map: any = {};
      cgData.forEach((c: any) => { map[c.id] = c; });

      const toItem = (c: any): CoinData => ({
        price: c.current_price,
        change24h: c.price_change_percentage_24h,
        high24h: c.high_24h,
        low24h: c.low_24h,
        volume24h: c.total_volume,
        marketCap: c.market_cap,
        ath: c.ath,
        athDate: c.ath_date?.slice(0, 10) || '',
      });

      setPrices({ BTC: toItem(map.bitcoin), ETH: toItem(map.ethereum) });
      if (fgData?.data?.[0]) setFearGreed({ value: fgData.data[0].value, classification: fgData.data[0].value_classification });
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setPriceLoading(false);
    } catch (e) {
      console.error('Price fetch failed:', e);
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000); // every 30s
    return () => clearInterval(iv);
  }, [fetchPrices]);

  // ── Fetch Intel ──
  const fetchIntel = useCallback(async () => {
    setIntelLoading(true);
    try {
      const results = await Promise.all(
        RSS_SOURCES.map(s => fetch(s.url).then(r => r.json()).catch(() => ({ items: [], feed: { title: s.name } })))
      );
      const items: IntelItem[] = results.flatMap((feed, si) =>
        (feed.items || []).slice(0, 5).map((item: any, i: number) => {
          const { category, sentiment } = classifyArticle(item.title || '');
          const rawImg = item.enclosure?.link || item.thumbnail || '';
          const imageUrl = rawImg?.startsWith('http') ? rawImg : FALLBACK_IMAGES[(si * 5 + i) % FALLBACK_IMAGES.length];
          return {
            id: `${si}-${i}`, source: feed.feed?.title || RSS_SOURCES[si].name,
            category, title: item.title || '',
            summary: item.description?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 160) || '',
            time: item.pubDate ? new Date(item.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚',
            pubDate: item.pubDate ? new Date(item.pubDate) : new Date(),
            sentiment, imageUrl, link: item.link,
          };
        })
      );
      items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());
      setIntel(items);
    } catch (e) { console.error(e); }
    finally { setIntelLoading(false); }
  }, []);

  useEffect(() => {
    fetchIntel();
    const iv = setInterval(fetchIntel, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchIntel]);

  // ── Derived ──
  const btc = prices?.BTC;
  const eth = prices?.ETH;
  const fgVal = fearGreed ? parseInt(fearGreed.value) : 50;
  const fgColor = fgVal >= 75 ? '#f43f5e' : fgVal >= 55 ? '#f97316' : fgVal >= 45 ? '#eab308' : fgVal >= 25 ? '#10b981' : '#3b82f6';

  const makeSummary = (coin: CoinData | undefined, sym: string) => {
    if (!coin) return '';
    const dir = coin.change24h >= 0 ? '上涨' : '下跌';
    const strength = Math.abs(coin.change24h) >= 3 ? '强势' : Math.abs(coin.change24h) >= 1 ? '温和' : '小幅';
    return `${sym} ${strength}${dir} ${coin.change24h >= 0 ? '+' : ''}${coin.change24h.toFixed(2)}%，24H区间 $${coin.low24h.toLocaleString()} – $${coin.high24h.toLocaleString()}。`;
  };

  const summaryDetails = btc ? [
    { label: '价格动能', value: Math.abs(btc.change24h) >= 3 ? (btc.change24h > 0 ? '强势上涨，短线偏多' : '明显下跌，短线偏空') : '横盘整理，方向待定', color: btc.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: '日内区间', value: `$${btc.low24h.toLocaleString()} – $${btc.high24h.toLocaleString()}`, color: 'text-slate-300' },
    { label: '市场情绪', value: fearGreed ? `${fearGreed.value} · ${fearGreed.classification}` : '加载中', color: fgVal >= 60 ? 'text-rose-400' : fgVal >= 40 ? 'text-amber-400' : 'text-emerald-400' },
    { label: '24H成交量', value: `$${(btc.volume24h / 1e9).toFixed(1)}B`, color: 'text-slate-300' },
    { label: '历史高点', value: `$${btc.ath.toLocaleString()} (${btc.athDate})`, color: 'text-slate-400' },
    { label: '操作建议', value: btc.change24h >= 3 ? '注意高位阻力，可考虑分批止盈' : btc.change24h <= -3 ? '关注关键支撑，避免追跌' : '等待方向确认，控制仓位', color: 'text-orange-400' },
  ] : [];

  const calcPnL = (amt: string, cost: string, price: number) => {
    const a = parseFloat(amt), c = parseFloat(cost);
    if (!a || !c || !price) return null;
    return { pnl: (price - c) * a, pct: ((price - c) / c) * 100, value: price * a };
  };

  const btcPnL = calcPnL(holdings.btcAmt, holdings.btcCost, btc?.price || 0);
  const ethPnL = calcPnL(holdings.ethAmt, holdings.ethCost, eth?.price || 0);
  const filteredIntel = activeCategory === '全部' ? intel : intel.filter(i =>
    activeCategory === '宏观' ? i.category === 'Macro' :
    activeCategory === '机构' ? i.category === 'Institutional' :
    activeCategory === '叙事' ? i.category === 'Narrative' : i.category === 'Technical'
  );

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors";

  // ── Price Card ──
  const PriceCard = ({ sym, data }: { sym: 'BTC' | 'ETH'; data: CoinData }) => {
    const pct = data.high24h > data.low24h ? ((data.price - data.low24h) / (data.high24h - data.low24h)) * 100 : 50;
    return (
      <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-xs font-bold text-slate-400">{sym}</p>
            <p className="text-[10px] text-slate-600">{sym === 'BTC' ? 'Bitcoin' : 'Ethereum'}</p>
          </div>
          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${data.change24h >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
            {data.change24h >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
            {data.change24h >= 0 ? '+' : ''}{data.change24h.toFixed(2)}%
          </span>
        </div>
        <p className="text-3xl font-black text-white mb-3">
          ${data.price.toLocaleString(undefined, { maximumFractionDigits: sym === 'ETH' ? 2 : 0 })}
        </p>
        {/* 24H range bar */}
        <div className="mb-2">
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 rounded-full opacity-40" />
            <div className="absolute top-0 h-full w-1.5 bg-white rounded-full shadow" style={{ left: `calc(${Math.min(Math.max(pct, 2), 98)}% - 3px)` }} />
          </div>
          <div className="flex justify-between mt-1 text-[10px]">
            <span className="text-rose-400">${data.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span className="text-slate-600">24H 区间</span>
            <span className="text-emerald-400">${data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-600">成交量 ${(data.volume24h / 1e9).toFixed(1)}B · 市值 ${(data.marketCap / 1e9).toFixed(0)}B</p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/8 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-black" />
          </div>
          <span className="font-bold text-sm text-white">Cointel</span>
          {lastUpdated && <span className="text-[10px] text-slate-600 hidden sm:block">更新于 {lastUpdated}</span>}
        </div>
        <nav className="flex bg-white/5 rounded-xl p-1 gap-0.5">
          {[
            { id: 'overview', label: '今日概览' },
            { id: 'chart', label: 'K 线图' },
            { id: 'intel', label: '情报流' },
            { id: 'portfolio', label: '我的持仓' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={() => { fetchPrices(); fetchIntel(); }} className="p-2 hover:bg-white/5 rounded-lg">
          <RefreshCw size={15} className={`text-slate-500 ${priceLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 pb-12">
        <AnimatePresence mode="wait">

          {/* ── OVERVIEW ── */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {priceLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0, 1].map(i => (
                    <div key={i} className="animate-pulse bg-white/4 border border-white/8 rounded-2xl p-5 space-y-3">
                      <div className="h-3 bg-white/10 rounded w-16" />
                      <div className="h-8 bg-white/10 rounded w-36" />
                      <div className="h-2 bg-white/10 rounded w-full" />
                    </div>
                  ))}
                </div>
              ) : prices ? (
                <div className="grid grid-cols-2 gap-3">
                  <PriceCard sym="BTC" data={prices.BTC} />
                  <PriceCard sym="ETH" data={prices.ETH} />
                </div>
              ) : (
                <div className="bg-white/4 border border-white/8 rounded-2xl p-5 text-center text-slate-500 text-sm">
                  价格加载失败，请点击右上角刷新按钮重试
                </div>
              )}

              {/* Fear & Greed + Interactive Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5">
                  <p className="text-[10px] text-slate-500">恐惧贪婪</p>
                  {fearGreed ? (
                    <>
                      <p className="text-4xl font-black" style={{ color: fgColor }}>{fearGreed.value}</p>
                      <p className="text-[10px] font-semibold" style={{ color: fgColor }}>{fearGreed.classification}</p>
                    </>
                  ) : <div className="animate-pulse h-10 w-10 bg-white/10 rounded-full" />}
                </div>

                {/* Interactive summary */}
                <div className="col-span-2 bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                  <button
                    className="w-full p-4 text-left hover:bg-white/3 transition-colors"
                    onClick={() => setSummaryExpanded(e => !e)}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5">
                        <Activity size={10} /> 今日市场总结
                      </p>
                      <div className="flex items-center gap-1 text-[10px] text-slate-600">
                        {summaryExpanded ? <><ChevronUp size={11} /> 收起</> : <><ChevronDown size={11} /> 展开分析</>}
                      </div>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {btc ? makeSummary(btc, 'BTC') + ' ' + makeSummary(eth, 'ETH') : '正在加载数据...'}
                    </p>
                  </button>

                  <AnimatePresence>
                    {summaryExpanded && btc && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 border-t border-white/8 pt-3 grid grid-cols-2 gap-2">
                          {summaryDetails.map((d, i) => (
                            <div key={i} className="bg-white/3 rounded-xl p-2.5">
                              <p className="text-[9px] text-slate-600 mb-0.5">{d.label}</p>
                              <p className={`text-xs font-semibold ${d.color}`}>{d.value}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Macro Events — clickable */}
              <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-2 border-b border-white/5">
                  <Globe size={11} className="text-slate-500" />
                  <p className="text-[11px] text-slate-500 font-medium">近期宏观事件</p>
                  <span className="ml-auto text-[9px] bg-slate-500/15 text-slate-500 px-1.5 py-0.5 rounded">点击查看详情</span>
                </div>
                <div className="divide-y divide-white/5">
                  {MACRO_EVENTS.map((ev, i) => (
                    <div key={i}>
                      <button
                        className="w-full px-5 py-3.5 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
                        onClick={() => setExpandedMacro(expandedMacro === i ? null : i)}
                      >
                        <span className="text-[11px] text-slate-500 w-24 shrink-0">{ev.time}</span>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${impactDot(ev.impact)}`} />
                        <span className="text-sm text-slate-200 flex-1">{ev.event}</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${impactBadge(ev.impact)}`}>
                            {ev.impact === 'high' ? '高影响' : ev.impact === 'medium' ? '中影响' : '低影响'}
                          </span>
                          {expandedMacro === i ? <ChevronUp size={13} className="text-slate-600" /> : <ChevronDown size={13} className="text-slate-600" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {expandedMacro === i && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.18 }}
                            className="overflow-hidden"
                          >
                            <div className="px-5 pb-4 space-y-3">
                              <div className="bg-white/3 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-1.5">
                                  <Info size={9} /> 事件说明
                                </p>
                                <p className="text-sm text-slate-300 leading-relaxed">{ev.description}</p>
                              </div>
                              <div className={`rounded-xl p-3 ${ev.impact === 'high' ? 'bg-orange-500/8 border border-orange-500/20' : 'bg-blue-500/8 border border-blue-500/20'}`}>
                                <p className="text-[10px] text-orange-400 flex items-center gap-1 mb-1.5">
                                  <BarChart2 size={9} /> 对加密市场的影响
                                </p>
                                <p className="text-sm text-slate-300 leading-relaxed">{ev.cryptoEffect}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

            </motion.div>
          )}

          {/* ── CHART ── */}
          {activeTab === 'chart' && (
            <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                  {(['BTC', 'ETH'] as const).map(s => (
                    <button key={s} onClick={() => setChartSymbol(s)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${chartSymbol === s ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-600">含 RSI / MACD 指标 · 数据来自 Binance</span>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden p-2">
                <TradingViewChart symbol={chartSymbol} />
              </div>
              {prices && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '当前价格', value: `$${(chartSymbol === 'BTC' ? prices.BTC : prices.ETH).price.toLocaleString(undefined, { maximumFractionDigits: 0 })}` },
                    { label: '24H 最高', value: `$${(chartSymbol === 'BTC' ? prices.BTC : prices.ETH).high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-emerald-400' },
                    { label: '24H 最低', value: `$${(chartSymbol === 'BTC' ? prices.BTC : prices.ETH).low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-rose-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-sm font-bold ${s.color || 'text-white'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
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
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="animate-pulse bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                      <div className="h-44 bg-white/8" />
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
                      {item.imageUrl && (
                        <div className="h-44 overflow-hidden relative">
                          <img src={item.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]; }}
                            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-transparent to-transparent" />
                          <div className="absolute bottom-3 left-4 flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${catColor(item.category)}`}>{catLabel(item.category)}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : item.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-400'}`}>
                              {item.sentiment === 'bullish' ? '看涨' : item.sentiment === 'bearish' ? '看跌' : '中性'}
                            </span>
                          </div>
                        </div>
                      )}
                      <div className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-bold text-orange-400">{item.source}</span>
                          <span className="text-[10px] text-slate-600">{item.time}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white leading-snug mb-2 group-hover:text-orange-400 transition-colors line-clamp-2">{item.title}</h3>
                        {item.summary && <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">{item.summary}</p>}
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
              <p className="text-[11px] text-slate-600">输入持仓信息，实时计算盈亏。数据只保存在你的浏览器，不会上传。</p>
              {[
                { sym: 'BTC', name: 'Bitcoin', data: btc, amt: holdings.btcAmt, cost: holdings.btcCost, target: holdings.btcTarget, pnl: btcPnL,
                  setAmt: (v: string) => setHoldings(h => ({ ...h, btcAmt: v })),
                  setCost: (v: string) => setHoldings(h => ({ ...h, btcCost: v })),
                  setTarget: (v: string) => setHoldings(h => ({ ...h, btcTarget: v })),
                },
                { sym: 'ETH', name: 'Ethereum', data: eth, amt: holdings.ethAmt, cost: holdings.ethCost, target: holdings.ethTarget, pnl: ethPnL,
                  setAmt: (v: string) => setHoldings(h => ({ ...h, ethAmt: v })),
                  setCost: (v: string) => setHoldings(h => ({ ...h, ethCost: v })),
                  setTarget: (v: string) => setHoldings(h => ({ ...h, ethTarget: v })),
                },
              ].map(coin => (
                <div key={coin.sym} className="bg-white/4 border border-white/8 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white">{coin.sym} <span className="text-slate-500 font-normal text-xs">{coin.name}</span></p>
                      {coin.data && (
                        <p className="text-[10px] text-slate-600 mt-0.5">
                          24H高 <span className="text-emerald-400">${coin.data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                          {' · '}低 <span className="text-rose-400">${coin.data.low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </p>
                      )}
                    </div>
                    {coin.data && (
                      <div className="text-right">
                        <p className="text-xl font-black text-white">${coin.data.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        <p className={`text-xs font-bold ${coin.data.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {coin.data.change24h >= 0 ? '+' : ''}{coin.data.change24h.toFixed(2)}%
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '持仓数量', val: coin.amt, set: coin.setAmt, ph: '0.00' },
                      { label: '成本价 (USD)', val: coin.cost, set: coin.setCost, ph: '0' },
                      { label: '目标价 (USD)', val: coin.target, set: coin.setTarget, ph: '0' },
                    ].map((f, i) => (
                      <div key={i}>
                        <label className="text-[10px] text-slate-500 block mb-1.5">{f.label}</label>
                        <input type="number" value={f.val} onChange={e => f.set(e.target.value)} placeholder={f.ph} className={inputCls} />
                      </div>
                    ))}
                  </div>
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
                          <p className={`text-[10px] ${coin.pnl.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{coin.pnl.pct >= 0 ? '+' : ''}{coin.pnl.pct.toFixed(1)}%</p>
                        </div>
                        <div className="bg-white/3 rounded-xl p-3">
                          <p className="text-[10px] text-slate-500 mb-1">距目标</p>
                          {coin.target && coin.data?.price ? (
                            <>
                              <p className={`text-sm font-bold ${parseFloat(coin.target) > coin.data.price ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {parseFloat(coin.target) > coin.data.price ? `差 ${(((parseFloat(coin.target) - coin.data.price) / coin.data.price) * 100).toFixed(1)}%` : '已超目标 ✓'}
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
