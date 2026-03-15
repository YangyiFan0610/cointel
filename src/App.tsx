import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Zap,
  Shield,
  BarChart3,
  RefreshCw,
  Globe,
  Cpu,
  MessageSquare,
  ExternalLink,
  Newspaper,
  LineChart as LineChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Cell
} from 'recharts';

// --- Types ---
type AssetType = 'BTC' | 'ETH' | 'SPX' | 'GOLD';
type Timeframe = '1h' | '4h' | '1d';

interface MarketData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  events?: MarketEvent[];
}

interface MarketEvent {
  id: string;
  type: 'news' | 'whale' | 'macro' | 'technical';
  title: string;
  description: string;
  impact: 'bullish' | 'bearish' | 'neutral';
}

interface IntelItem {
  id: string;
  source: string;
  category: 'Macro' | 'Institutional' | 'Technical' | 'Narrative';
  titleEn: string;
  titleCn: string;
  contentEn: string;
  contentCn: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impactScore?: number;
  mediaUrl?: string;
  importance: 1 | 2 | 3;
}

interface MacroIndicator {
  name: string;
  nameCn: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  impact: 'Positive' | 'Negative' | 'Neutral';
  desc: string;
}

// --- Constants ---
const RSS_SOURCES = [
  'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss',
  'https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed',
  'https://api.rss2json.com/v1/api.json?rss_url=https://coindesk.com/arc/outboundfeeds/rss/',
];

const generateChartData = (points: number, basePrice: number, timeframe: Timeframe): MarketData[] => {
  let currentPrice = basePrice;
  const now = Date.now();
  const step = timeframe === '1h' ? 3600000 : timeframe === '4h' ? 14400000 : 86400000;
  return Array.from({ length: points }, (_, i) => {
    const open = currentPrice;
    const volatility = basePrice * 0.01;
    const close = currentPrice + (Math.random() - 0.5) * volatility;
    const high = Math.max(open, close) + Math.random() * (volatility * 0.5);
    const low = Math.min(open, close) - Math.random() * (volatility * 0.5);
    currentPrice = close;
    const timestamp = now - (points - i) * step;
    const date = new Date(timestamp);
    const timeStr = timeframe === '1d'
      ? `${date.getMonth() + 1}/${date.getDate()}`
      : `${date.getHours()}:00`;
    const events: MarketEvent[] = [];
    if (Math.random() > 0.85) {
      events.push({
        id: `evt-${i}`,
        type: Math.random() > 0.5 ? 'news' : 'whale',
        title: '关键市场异动',
        description: '在该时段内观察到显著的资金流向或新闻发布。',
        impact: close > open ? 'bullish' : 'bearish'
      });
    }
    return { time: timeStr, timestamp, open, high, low, close, volume: Math.random() * 1000, events };
  });
};

const MACRO_INDICATORS: MacroIndicator[] = [
  { name: 'DXY', nameCn: '美元指数', value: '103.45', change: '+0.12%', trend: 'up', impact: 'Negative', desc: '美元走强通常对加密货币不利。' },
  { name: 'S&P 500', nameCn: '标普500', value: '5,123.4', change: '-0.45%', trend: 'down', impact: 'Negative', desc: '股市下跌反映市场风险偏好降低。' },
  { name: 'Gold', nameCn: '黄金', value: '$2,165', change: '+0.82%', trend: 'up', impact: 'Positive', desc: '避险资产上涨，对比特币有带动作用。' },
  { name: 'US 10Y Yield', nameCn: '美债收益率', value: '4.21%', change: '+0.05', trend: 'up', impact: 'Negative', desc: '收益率上升会吸引资金离开高风险资产。' },
];

// --- App ---
export default function App() {
  const [activeTab, setActiveTab] = useState<'market' | 'intel' | 'macro' | 'prediction'>('market');
  const [selectedAsset, setSelectedAsset] = useState<AssetType>('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [currentPrice, setCurrentPrice] = useState(68432);
  const [chartData, setChartData] = useState<MarketData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [aiSummary, setAiSummary] = useState("实时 RSS 情报已连接 — CoinTelegraph · Decrypt · CoinDesk");
  const [liveIntel, setLiveIntel] = useState<IntelItem[]>([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    "系统初始化完成...",
    "RSS 数据源已连接...",
    "正在拉取最新情报..."
  ]);

  useEffect(() => {
    const basePrices = { BTC: 68000, ETH: 3800, SPX: 5100, GOLD: 2150 };
    setChartData(generateChartData(40, basePrices[selectedAsset], timeframe));
    setCurrentPrice(basePrices[selectedAsset]);
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => prev + (Math.random() - 0.5) * (prev * 0.001));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const fetchLiveNews = async () => {
    setIsFetchingNews(true);
    try {
      const results = await Promise.all(
        RSS_SOURCES.map(url => fetch(url).then(r => r.json()).catch(() => ({ items: [], feed: { title: 'News' } })))
      );
      const items: IntelItem[] = results.flatMap((feed, si) =>
        (feed.items || []).slice(0, 3).map((item: any, i: number) => ({
          id: `rss-${si}-${i}`,
          source: feed.feed?.title || 'News',
          category: 'Macro' as const,
          titleEn: item.title || '',
          titleCn: item.title || '',
          contentEn: item.description?.replace(/<[^>]+>/g, '').slice(0, 120) || '',
          contentCn: item.description?.replace(/<[^>]+>/g, '').slice(0, 120) || '',
          time: item.pubDate ? new Date(item.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚',
          sentiment: 'neutral' as const,
          importance: 2 as const,
          mediaUrl: item.enclosure?.link || item.thumbnail || undefined,
        }))
      );
      setLiveIntel(items);
      setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] 已获取 ${items.length} 条真实新闻`, ...prev.slice(0, 4)]);
      setAiSummary(`已加载 ${items.length} 条最新情报 — 数据来自 CoinTelegraph · Decrypt · CoinDesk`);
    } catch (error) {
      console.error('RSS Fetch Error:', error);
      setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] RSS 获取失败，请检查网络`, ...prev.slice(0, 4)]);
    } finally {
      setIsFetchingNews(false);
    }
  };

  useEffect(() => {
    fetchLiveNews();
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-orange-500/30">
      {/* Header */}
      <header className="h-14 border-b border-white/10 bg-black flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <Zap size={14} className="text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase">Multi_Market_Intelligence_Terminal</span>
          </div>
          <div className="flex bg-white/5 p-1 rounded-lg gap-1 border border-white/10">
            {(['BTC', 'ETH', 'SPX', 'GOLD'] as AssetType[]).map((asset) => (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all ${selectedAsset === asset ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
              >
                {asset}
              </button>
            ))}
          </div>
          <div className="flex bg-white/5 p-1 rounded-lg gap-1">
            {[
              { id: 'market', label: '市场大盘', icon: LineChartIcon },
              { id: 'intel', label: '深度情报', icon: Newspaper },
              { id: 'macro', label: '宏观风险', icon: Globe },
              { id: 'prediction', label: '趋势预测', icon: Cpu },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${activeTab === tab.id ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-[11px] font-bold">
            <div className="flex flex-col items-end">
              <span className="text-orange-500">{selectedAsset}: ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
              <span className="text-[9px] text-emerald-500">LIVE</span>
            </div>
          </div>
          <button
            className="p-2 hover:bg-white/5 rounded-lg transition-colors group"
            onClick={() => { setChartData(generateChartData(40, currentPrice, timeframe)); fetchLiveNews(); }}
          >
            <RefreshCw size={16} className={`text-slate-500 group-hover:rotate-180 transition-transform duration-500 ${isFetchingNews ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto pb-20">
        <AnimatePresence mode="wait">

          {/* MARKET TAB */}
          {activeTab === 'market' && (
            <motion.div key="market" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest">情报摘要</h3>
                </div>
                <p className="text-lg font-black text-white leading-tight">{aiSummary}</p>
              </div>

              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h2 className="text-xl font-black tracking-tighter flex items-center gap-2">
                      实时价格走势 <span className="text-xs font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">LIVE</span>
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">点击图表上的标记点查看重大市场事件</p>
                  </div>
                  <div className="flex gap-2">
                    {(['1h', '4h', '1d'] as Timeframe[]).map(t => (
                      <button key={t} onClick={() => setTimeframe(t)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${timeframe === t ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3 h-[450px] relative">
                    {selectedEvent && (
                      <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                        className="absolute top-4 right-4 z-30 w-64 bg-black/90 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${selectedEvent.impact === 'bullish' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'}`}>
                            {selectedEvent.type}
                          </span>
                          <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-white text-xs">✕</button>
                        </div>
                        <h4 className="text-sm font-bold text-white mb-1">{selectedEvent.title}</h4>
                        <p className="text-xs text-slate-400 leading-relaxed">{selectedEvent.description}</p>
                      </motion.div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                        <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                        <Tooltip content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const d = payload[0].payload as MarketData;
                            return (
                              <div className="bg-[#1e293b] p-3 rounded-lg border border-white/10 shadow-xl text-[10px]">
                                <p className="font-black text-slate-400 mb-2 uppercase">{d.time}</p>
                                <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                  <span className="text-slate-500">O:</span><span className="text-white font-bold">${d.open.toFixed(2)}</span>
                                  <span className="text-slate-500">H:</span><span className="text-white font-bold">${d.high.toFixed(2)}</span>
                                  <span className="text-slate-500">L:</span><span className="text-white font-bold">${d.low.toFixed(2)}</span>
                                  <span className="text-slate-500">C:</span><span className="text-white font-bold">${d.close.toFixed(2)}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }} />
                        <Bar dataKey="high" fill="none" strokeWidth={1}>
                          {chartData.map((entry, index) => (
                            <Cell key={`wick-${index}`} stroke={entry.close > entry.open ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                        <Bar dataKey={(d: MarketData) => Math.abs(d.close - d.open)} stackId="a">
                          {chartData.map((entry, index) => (
                            <Cell key={`body-${index}`} fill={entry.close > entry.open ? '#10b981' : '#f43f5e'} stroke={entry.close > entry.open ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                        {chartData.map((data, i) =>
                          data.events?.map((evt, j) => (
                            <ReferenceDot key={`${i}-${j}`} x={data.time} y={data.high + (data.high - data.low) * 0.2}
                              r={4} fill={evt.impact === 'bullish' ? '#10b981' : '#f43f5e'} stroke="#fff" strokeWidth={1}
                              className="cursor-pointer" onClick={() => setSelectedEvent(evt)} />
                          ))
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-4">
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">技术指标</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">RSI (14)</span>
                          <span className="text-xs font-black text-emerald-500">62.45</span>
                        </div>
                        <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                          <div className="bg-emerald-500 h-full" style={{ width: '62%' }} />
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">MACD</span>
                          <span className="text-xs font-black text-emerald-500">Bullish Cross</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400">MA (200)</span>
                          <span className="text-xs font-black text-rose-500">Below</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
                <div className="lg:col-span-1 bg-black/40 border border-white/10 rounded-xl p-5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                    <span>市场深度</span><span className="text-emerald-500 animate-pulse">LIVE</span>
                  </h3>
                  <div className="space-y-1 font-mono">
                    {[...Array(4)].map((_, i) => (
                      <div key={`sell-${i}`} className="relative h-6 flex items-center justify-between px-3 text-[10px] font-bold">
                        <div className="absolute inset-0 bg-rose-500/10" style={{ width: `${Math.random() * 60 + 20}%`, right: 0 }} />
                        <span className="text-rose-500 z-10">${(currentPrice * (1 + (4 - i) * 0.001)).toLocaleString()}</span>
                        <span className="text-slate-400 z-10">{(Math.random() * 5).toFixed(3)}</span>
                      </div>
                    ))}
                    <div className="py-2 border-y border-white/5 flex justify-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase">Spread: 0.02%</span>
                    </div>
                    {[...Array(4)].map((_, i) => (
                      <div key={`buy-${i}`} className="relative h-6 flex items-center justify-between px-3 text-[10px] font-bold">
                        <div className="absolute inset-0 bg-emerald-500/10" style={{ width: `${Math.random() * 60 + 20}%` }} />
                        <span className="text-emerald-500 z-10">${(currentPrice * (1 - (i + 1) * 0.001)).toLocaleString()}</span>
                        <span className="text-slate-400 z-10">{(Math.random() * 5).toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: '24h 成交额', value: '$82.4B', change: '+12%', icon: Activity, detail: 'Institutional Volume High' },
                    { label: '全网持仓', value: '$34.1B', change: '-2.5%', icon: BarChart3, detail: 'Long Squeeze Risk' },
                    { label: '贪婪指数', value: '78', change: '极度贪婪', icon: Shield, detail: 'Market Overheated' },
                    { label: '多空比', value: '1.08', change: '看涨占优', icon: TrendingUp, detail: 'Retail Bias Bullish' },
                    { label: '波动率 (VIX)', value: '18.4', change: '+4.2%', icon: Zap, detail: 'Increasing Uncertainty' },
                    { label: '资金费率', value: '0.01%', change: 'Neutral', icon: Globe, detail: 'Balanced Positioning' },
                  ].map((stat, i) => (
                    <div key={i} className="bg-black/40 border border-white/10 rounded-xl p-5 hover:border-orange-500/30 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <stat.icon size={14} className="group-hover:text-orange-500 transition-colors" />
                          <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                        </div>
                        <span className={`text-[10px] font-black ${stat.change.includes('+') || stat.change.includes('看涨') ? 'text-emerald-500' : 'text-rose-500'}`}>{stat.change}</span>
                      </div>
                      <span className="text-2xl font-black text-white">{stat.value}</span>
                      <p className="text-[9px] text-slate-600 mt-2 font-medium uppercase tracking-tighter">{stat.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* INTEL TAB */}
          {activeTab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8 max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <Newspaper className="text-orange-500" /> 实时情报终端
                </h2>
                <div className="flex items-center gap-4">
                  {isFetchingNews && (
                    <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                      <RefreshCw size={14} className="animate-spin" />
                      <span className="text-[10px] font-black uppercase">正在抓取...</span>
                    </div>
                  )}
                  <button onClick={fetchLiveNews} className="px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg text-[10px] font-black text-orange-500 hover:bg-orange-500/20 transition-all">
                    刷新情报
                  </button>
                </div>
              </div>

              {liveIntel.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-slate-600 gap-4">
                  <RefreshCw size={24} className="animate-spin" />
                  <span className="text-sm">正在从 RSS 加载最新情报...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {liveIntel.map((item) => (
                    <article key={item.id} className="group bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all flex min-h-[120px]">
                      <div className="w-2 shrink-0" style={{ backgroundColor: item.sentiment === 'bullish' ? '#10b981' : item.sentiment === 'bearish' ? '#f43f5e' : '#64748b' }} />
                      <div className="flex-1 p-5 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                              <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{item.source}</span>
                              <span className="text-[10px] font-bold text-slate-700">|</span>
                              <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                            </div>
                            <span className="text-[10px] font-bold text-slate-600">{item.time}</span>
                          </div>
                          <h3 className="text-base font-black text-white leading-tight mb-2 group-hover:text-orange-500 transition-colors">
                            {item.titleCn}
                          </h3>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{item.contentCn}</p>
                        </div>
                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${item.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-500' : item.sentiment === 'bearish' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            {item.sentiment}
                          </span>
                          <button className="text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors flex items-center gap-1">
                            <ExternalLink size={12} /> Details
                          </button>
                        </div>
                      </div>
                      {item.mediaUrl && (
                        <div className="w-48 overflow-hidden border-l border-white/10 shrink-0 hidden md:block">
                          <img src={item.mediaUrl} alt="Intel" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* MACRO TAB */}
          {activeTab === 'macro' && (
            <motion.div key="macro" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <Globe className="text-emerald-500" /> 宏观经济矩阵
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {MACRO_INDICATORS.map((item, i) => (
                    <div key={i} className="bg-black/40 border border-white/10 rounded-xl p-6 hover:border-emerald-500/30 transition-all group">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.name}</p>
                          <h3 className="text-xl font-black text-white">{item.nameCn}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black text-white tracking-tighter">{item.value}</p>
                          <div className={`flex items-center justify-end gap-1 text-xs font-black ${item.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                            {item.trend === 'up' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {item.change}
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4">
                        <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${item.impact === 'Positive' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                          {item.impact === 'Positive' ? 'BULLISH' : 'BEARISH'}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium italic">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <Shield className="text-orange-500" /> 机构流向与头寸
                </h2>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-6">
                  {[
                    { name: 'BlackRock', signal: 'BUY', confidence: 88, detail: 'Spot ETF Inflow Dominant' },
                    { name: 'Goldman Sachs', signal: 'HOLD', confidence: 65, detail: 'Macro Uncertainty Hedge' },
                    { name: 'J.P. Morgan', signal: 'SELL', confidence: 42, detail: 'Profit Taking at Resistance' },
                    { name: 'Fidelity', signal: 'BUY', confidence: 75, detail: 'Long-term Accumulation' },
                  ].map((inst, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-sm font-black text-white">{inst.name}</span>
                          <p className="text-[9px] text-slate-600 uppercase font-bold">{inst.detail}</p>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${inst.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : inst.signal === 'SELL' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            {inst.signal}
                          </span>
                          <span className="text-xs font-black text-white">{inst.confidence}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div className="bg-orange-500 h-full" style={{ width: `${inst.confidence}%` }} />
                      </div>
                    </div>
                  ))}
                  <div className="pt-6 border-t border-white/5 grid grid-cols-2 gap-4">
                    <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl">
                      <p className="text-[8px] font-black text-rose-500 uppercase mb-1">Systemic Risk</p>
                      <p className="text-lg font-black text-white">MODERATE</p>
                      <p className="text-[9px] text-slate-500 mt-2">CPI Data Pending</p>
                    </div>
                    <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                      <p className="text-[8px] font-black text-emerald-500 uppercase mb-1">Liquidity Index</p>
                      <p className="text-lg font-black text-white">STABLE</p>
                      <p className="text-[9px] text-slate-500 mt-2">Central Bank Support</p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* PREDICTION TAB */}
          {activeTab === 'prediction' && (
            <motion.div key="prediction" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="space-y-8">
              <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                <Cpu className="text-indigo-500" /> 智能趋势预测
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">社交媒体情绪</h3>
                  <div className="space-y-4">
                    {[
                      { platform: 'Twitter/X', narrative: 'BTC ETF 资金持续流入，机构看多情绪强烈', sentiment: 'Bullish' },
                      { platform: 'Reddit', narrative: '散户讨论减半行情，新资金入场观望', sentiment: 'Neutral' },
                      { platform: 'Telegram', narrative: '监管消息引发短期恐慌，但基本面未变', sentiment: 'Bearish' },
                    ].map((item, i) => (
                      <div key={i} className="p-4 bg-white/[0.02] rounded-xl border border-white/5">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-indigo-400 uppercase">{item.platform}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${item.sentiment === 'Bullish' ? 'bg-emerald-500/10 text-emerald-500' : item.sentiment === 'Bearish' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'}`}>
                            {item.sentiment === 'Bullish' ? '看涨' : item.sentiment === 'Bearish' ? '看跌' : '中性'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">{item.narrative}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-xl p-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Zap size={12} /> 关键催化剂
                  </h3>
                  <div className="space-y-4">
                    {[
                      { event: '美联储利率决议', timing: '48h', impact: '高影响——若维持利率或释放鸽派信号，BTC 可能突破阻力位。' },
                      { event: 'BTC ETF 每周资金流数据', timing: '本周五', impact: '持续净流入将强化机构买入叙事，看多信号。' },
                      { event: 'CPI 通胀数据发布', timing: '下周二', impact: '若低于预期将推升风险资产，加密市场受益。' },
                    ].map((item, i) => (
                      <div key={i} className="flex gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-black/40 rounded-lg border border-white/5 shrink-0">
                          <span className="text-[8px] font-black text-slate-500 uppercase">Timing</span>
                          <span className="text-xs font-black text-orange-500">{item.timing}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">{item.event}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.impact}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="h-10 border-t border-white/5 bg-[#0A0B0D] flex items-center justify-between px-6 fixed bottom-0 w-full z-50 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-[marquee_25s_linear_infinite] gap-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>BTC: ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>ETH: $3,845 (+1.8%)</span>
            <span>SPX: 5,123 (+0.4%)</span>
            <span>GOLD: $2,154 (+0.2%)</span>
            <span>DXY: 103.4 (-0.1%)</span>
            <span>US10Y: 4.21% (+0.5%)</span>
            <span>BTC: ${currentPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
            <span>ETH: $3,845 (+1.8%)</span>
            <span>SPX: 5,123 (+0.4%)</span>
            <span>GOLD: $2,154 (+0.2%)</span>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-black/80 px-4 h-full border-l border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">RSS Live Feed Active</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex gap-3 overflow-hidden max-w-[300px]">
            {systemLogs.slice(0, 1).map((log, i) => (
              <span key={i} className="text-[9px] text-slate-600 whitespace-nowrap">{log}</span>
            ))}
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      ` }} />
    </div>
  );
}
