import React, { useState, useEffect, useMemo } from 'react';
import { GoogleGenAI } from "@google/genai";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Zap, 
  Shield, 
  BarChart3, 
  Clock, 
  Search, 
  RefreshCw,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Cpu,
  MessageSquare,
  PlayCircle,
  ExternalLink,
  Info,
  ChevronRight,
  LayoutDashboard,
  Newspaper,
  LineChart as LineChartIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ComposedChart,
  Bar,
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot,
  Cell
} from 'recharts';

// --- Types & Constants ---
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
  videoUrl?: string;
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

// --- Mock Data ---
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

    // Randomly inject events
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

    return {
      time: timeStr,
      timestamp,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000,
      events
    };
  });
};

const MACRO_INDICATORS: MacroIndicator[] = [
  { name: 'DXY', nameCn: '美元指数', value: '103.45', change: '+0.12%', trend: 'up', impact: 'Negative', desc: '美元走强通常对加密货币不利。' },
  { name: 'S&P 500', nameCn: '标普500', value: '5,123.4', change: '-0.45%', trend: 'down', impact: 'Negative', desc: '股市下跌反映市场风险偏好降低。' },
  { name: 'Gold', nameCn: '黄金', value: '$2,165', change: '+0.82%', trend: 'up', impact: 'Positive', desc: '避险资产上涨，对比特币有带动作用。' },
  { name: 'US 10Y Yield', nameCn: '美债收益率', value: '4.21%', change: '+0.05', trend: 'up', impact: 'Negative', desc: '收益率上升会吸引资金离开高风险资产。' },
];

const INTEL_FEED: IntelItem[] = [];
// --- Components ---
const RSS_SOURCES = [
  'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss',
  'https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed',
];
export default function App() {
  const [activeTab, setActiveTab] = useState<'market' | 'intel' | 'macro' | 'prediction'>('market');
  const [selectedAsset, setSelectedAsset] = useState<AssetType>('BTC');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [currentPrice, setCurrentPrice] = useState(68432);
  const [chartData, setChartData] = useState<MarketData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<MarketEvent | null>(null);
  const [hoveredAnnotation, setHoveredAnnotation] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState("正在聚合全网实时情报...");
  const [liveIntel, setLiveIntel] = useState<IntelItem[]>(INTEL_FEED);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [systemLogs, setSystemLogs] = useState<string[]>([
    "系统初始化完成...",
    "正在建立多市场关联模型...",
    "已连接 Google Search Grounding 实时数据源"
  ]);

  const assetConfig: Record<AssetType, { name: string; color: string; symbol: string }> = {
    BTC: { name: 'Bitcoin', color: '#f97316', symbol: '₿' },
    ETH: { name: 'Ethereum', color: '#6366f1', symbol: 'Ξ' },
    SPX: { name: 'S&P 500', color: '#10b981', symbol: 'S&P' },
    GOLD: { name: 'Gold', color: '#eab308', symbol: 'Au' }
  };

  // Generate mock OHLC data
  const generateOHLCData = (count: number, basePrice: number, tf: Timeframe) => {
    return generateChartData(count, basePrice, tf);
  };

  useEffect(() => {
    const basePrices = { BTC: 68000, ETH: 3800, SPX: 5100, GOLD: 2150 };
    setChartData(generateOHLCData(40, basePrices[selectedAsset], timeframe));
    setCurrentPrice(basePrices[selectedAsset]);
  }, [selectedAsset, timeframe]);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPrice(prev => prev + (Math.random() - 0.5) * (prev * 0.001));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Initialize Gemini safely
  const ai = useMemo(() => {
    try {
      const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.GEMINI_API_KEY : undefined;
      if (!apiKey) return null;
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      return null;
    }
  }, []);

  // AI Analysis Function with Google Search Grounding
  const runAiAnalysis = async () => {
  setAiSummary("AI 分析功能暂未配置，当前显示实时 RSS 新闻数据。");
};
    setIsAnalyzing(true);
    try {
      const prompt = `
        You are a Senior Market Strategist at a top-tier investment bank. 
        Perform a professional, high-density analysis of ${selectedAsset} and global macro conditions (Date: ${new Date().toISOString()}).
        
        Focus on:
        1. Causal Relationships: How specific macro events (Fed, CPI, Geopolitics) are directly impacting ${selectedAsset}'s price action.
        2. Technical Confluence: Key support/resistance zones, RSI/MACD signals, and volume profile.
        3. Institutional Sentiment: ETF flows, whale movements, and professional positioning.
        
        Provide a bilingual (EN/CN) executive summary that is concise, data-driven, and actionable.
        Avoid generic advice. Use professional terminology.
        
        Format: 
        [EN] One sharp, high-density sentence on the most critical market signal.
        [CN] 一句专业、高信息密度的核心市场信号总结。
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      
      setAiSummary(response.text || "分析失败。市场保持波动。");
      setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] 深度分析完成: ${selectedAsset} 关联模型已更新`, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiSummary("分析不可用。请确保在预览环境中运行。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Fetch Real-time News via AI
 const fetchLiveNews = async () => {
  setIsFetchingNews(true);
  try {
    const results = await Promise.all(
      RSS_SOURCES.map(url => fetch(url).then(r => r.json()))
    );
    const items: IntelItem[] = results.flatMap((feed, si) =>
      (feed.items || []).slice(0, 3).map((item: any, i: number) => ({
        id: `rss-${si}-${i}`,
        source: feed.feed?.title || 'News',
        category: 'Macro' as const,
        titleEn: item.title,
        titleCn: item.title,
        contentEn: item.description?.replace(/<[^>]+>/g, '').slice(0, 100) || '',
        contentCn: item.description?.replace(/<[^>]+>/g, '').slice(0, 100) || '',
        time: new Date(item.pubDate).toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'}),
        sentiment: 'neutral' as const,
        importance: 2 as const,
        mediaUrl: item.enclosure?.link || item.thumbnail || undefined,
      }))
    );
    setLiveIntel(items);
    setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] 已从 RSS 获取 ${items.length} 条真实新闻`, ...prev.slice(0, 4)]);
  } catch (error) {
    console.error("RSS Fetch Error:", error);
  } finally {
    setIsFetchingNews(false);
  }
};

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });

      const news = JSON.parse(response.text);
      if (Array.isArray(news)) {
        setLiveIntel(news.map((n: any, i: number) => ({
          ...n,
          id: `live-${i}`,
          time: '刚刚',
          importance: 2
        })));
      }
      setSystemLogs(prev => [`[${new Date().toLocaleTimeString()}] 情报库已更新: 捕获 4 条 ${selectedAsset} 相关动态`, ...prev.slice(0, 4)]);
    } catch (error) {
      console.error("News Fetch Error:", error);
    } finally {
      setIsFetchingNews(false);
    }
  };

  const [predictionData, setPredictionData] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

const runPricePrediction = async () => {
  setPredictionData(null);
};
    setIsPredicting(true);
    try {
      const prompt = `
        Perform a deep correlation and predictive analysis for ${selectedAsset} (Date: ${new Date().toISOString()}).
        
        1. Correlation Analysis: How are DXY, S&P 500, and other assets currently affecting ${selectedAsset}?
        2. Social Sentiment: What are the top 3 narratives on X (Twitter) and YouTube right now regarding ${selectedAsset}?
        3. Price Probability: Based on current volatility and technicals, provide a 24h price range estimate with probability.
        4. Key "Black Swan" or "Catalyst" events to watch in the next 48h.
        
        Return the analysis as a structured JSON object with fields: 
        correlationMap (array of {factor, relationship, impactScore}),
        socialNarratives (array of {platform, narrative, sentiment}),
        priceRange (object {min, max, probability, bias}),
        catalysts (array of {event, timing, potentialImpact}).
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          responseMimeType: "application/json",
        },
      });

      const data = JSON.parse(response.text);
      setPredictionData(data);
    } catch (error) {
      console.error("Prediction Error:", error);
    } finally {
      setIsPredicting(false);
    }
  };

 useEffect(() => {
    fetchLiveNews();
    if (ai) {
      runAiAnalysis();
      runPricePrediction();
    }
  }, [ai]);

  const annotations = [
    { x: '10h', y: 68200, label: 'ETF 资金流入', desc: '机构资金大规模进场' },
    { x: '25h', y: 68500, label: 'CPI 数据公布', desc: '通胀数据低于预期，利好' },
  ];

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-orange-500/30">
      {/* Terminal Header */}
      <header className="h-14 border-b border-white/10 bg-black flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <Zap size={14} className="text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter uppercase">Multi_Market_Intelligence_Terminal</span>
          </div>
          
          {/* Asset Selector */}
          <div className="flex bg-white/5 p-1 rounded-lg gap-1 border border-white/10">
            {(['BTC', 'ETH', 'SPX', 'GOLD'] as AssetType[]).map((asset) => (
              <button
                key={asset}
                onClick={() => setSelectedAsset(asset)}
                className={`px-3 py-1 rounded text-[10px] font-black transition-all ${
                  selectedAsset === asset ? 'bg-white text-black' : 'text-slate-500 hover:text-white'
                }`}
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
                className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                  activeTab === tab.id ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white hover:bg-white/5'
                }`}
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
              <span className="text-orange-500">{selectedAsset}: ${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              <span className="text-[9px] text-emerald-500">+2.45%</span>
            </div>
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors group" onClick={() => {
            setChartData(generateChartData(40, currentPrice, timeframe));
            runAiAnalysis();
            fetchLiveNews();
            runPricePrediction();
          }}>
            <RefreshCw size={16} className="text-slate-500 group-hover:rotate-180 transition-transform duration-500" />
          </button>
        </div>
      </header>

      <main className="p-6 max-w-[1400px] mx-auto pb-20">
        <AnimatePresence mode="wait">
          {activeTab === 'market' && (
            <motion.div 
              key="market"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* AI Market Insight */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-orange-500 animate-pulse' : 'bg-orange-500'}`} />
                  <h3 className="text-xs font-black text-orange-500 uppercase tracking-widest">AI 实时行情洞察 (AI Market Insight)</h3>
                </div>
                <div className="space-y-4">
                  {isAnalyzing ? (
                    <div className="flex items-center gap-3">
                      <RefreshCw size={14} className="animate-spin text-orange-500" />
                      <span className="text-sm text-slate-400 font-medium">正在深度扫描全球市场情报...</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-lg font-black text-white leading-tight">
                        {aiSummary.split('\n').find(l => l.includes('[CN]'))?.replace('[CN]', '').trim() || aiSummary}
                      </p>
                      <p className="text-xs text-slate-500 italic">
                        {aiSummary.split('\n').find(l => l.includes('[EN]'))?.replace('[EN]', '').trim()}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Interactive Chart Section */}
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
                      <button 
                        key={t} 
                        onClick={() => setTimeframe(t)}
                        className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${timeframe === t ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}
                      >
                        {t.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                  <div className="lg:col-span-3 h-[450px] relative">
                    {/* Event Detail Overlay */}
                    {selectedEvent && (
                      <motion.div 
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="absolute top-4 right-4 z-30 w-64 bg-black/90 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            selectedEvent.impact === 'bullish' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                          }`}>
                            {selectedEvent.type}
                          </span>
                          <button onClick={() => setSelectedEvent(null)} className="text-slate-500 hover:text-white">
                            <RefreshCw size={12} className="rotate-45" />
                          </button>
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
                        <Tooltip 
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload as MarketData;
                              return (
                                <div className="bg-[#1e293b] p-3 rounded-lg border border-white/10 shadow-xl text-[10px]">
                                  <p className="font-black text-slate-400 mb-2 uppercase">{data.time}</p>
                                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                    <span className="text-slate-500">O:</span> <span className="text-white font-bold">${data.open.toFixed(2)}</span>
                                    <span className="text-slate-500">H:</span> <span className="text-white font-bold">${data.high.toFixed(2)}</span>
                                    <span className="text-slate-500">L:</span> <span className="text-white font-bold">${data.low.toFixed(2)}</span>
                                    <span className="text-slate-500">C:</span> <span className="text-white font-bold">${data.close.toFixed(2)}</span>
                                    <span className="text-slate-500">V:</span> <span className="text-white font-bold">{data.volume.toFixed(0)}</span>
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        
                        {/* Candlestick Wicks */}
                        <Bar dataKey="high" fill="none" strokeWidth={1}>
                          {chartData.map((entry, index) => (
                            <Cell key={`wick-${index}`} stroke={entry.close > entry.open ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                        
                        {/* Candlestick Bodies */}
                        <Bar 
                          dataKey={(d: MarketData) => Math.abs(d.close - d.open)} 
                          stackId="a"
                        >
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`body-${index}`} 
                              fill={entry.close > entry.open ? '#10b981' : '#f43f5e'} 
                              stroke={entry.close > entry.open ? '#10b981' : '#f43f5e'}
                            />
                          ))}
                        </Bar>

                        {/* Event Markers */}
                        {chartData.map((data, i) => (
                          data.events?.map((evt, j) => (
                            <ReferenceDot 
                              key={`${i}-${j}`}
                              x={data.time}
                              y={data.high + (data.high - data.low) * 0.2}
                              r={4}
                              fill={evt.impact === 'bullish' ? '#10b981' : '#f43f5e'}
                              stroke="#fff"
                              strokeWidth={1}
                              className="cursor-pointer hover:scale-150 transition-transform"
                              onClick={() => setSelectedEvent(evt)}
                            />
                          ))
                        ))}
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Technical Indicators Sidebar */}
                  <div className="space-y-4">
                    <div className="bg-black/40 border border-white/5 rounded-xl p-4">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">技术指标 (Indicators)</h4>
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

              {/* Market Analytics Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-8">
                {/* Market Depth */}
                <div className="lg:col-span-1 bg-black/40 border border-white/10 rounded-xl p-5">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center justify-between">
                    <span>市场深度 (Market Depth)</span>
                    <span className="text-emerald-500 animate-pulse">LIVE</span>
                  </h3>
                  <div className="space-y-1 font-mono">
                    {/* Sells */}
                    {[...Array(4)].map((_, i) => (
                      <div key={`sell-${i}`} className="relative h-6 flex items-center justify-between px-3 text-[10px] font-bold">
                        <div className="absolute inset-0 bg-rose-500/10 origin-right" style={{ width: `${Math.random() * 60 + 20}%`, right: 0 }} />
                        <span className="text-rose-500 z-10">${(currentPrice * (1 + (4-i) * 0.001)).toLocaleString()}</span>
                        <span className="text-slate-400 z-10">{(Math.random() * 5).toFixed(3)}</span>
                      </div>
                    ))}
                    {/* Spread */}
                    <div className="py-2 border-y border-white/5 flex justify-center">
                      <span className="text-[10px] font-black text-slate-600 uppercase">Spread: 0.02%</span>
                    </div>
                    {/* Buys */}
                    {[...Array(4)].map((_, i) => (
                      <div key={`buy-${i}`} className="relative h-6 flex items-center justify-between px-3 text-[10px] font-bold">
                        <div className="absolute inset-0 bg-emerald-500/10 origin-left" style={{ width: `${Math.random() * 60 + 20}%`, left: 0 }} />
                        <span className="text-emerald-500 z-10">${(currentPrice * (1 - (i+1) * 0.001)).toLocaleString()}</span>
                        <span className="text-slate-400 z-10">{(Math.random() * 5).toFixed(3)}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
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
                        <span className={`text-[10px] font-black ${stat.change.includes('+') || stat.change.includes('看涨') ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {stat.change}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-white">{stat.value}</span>
                      </div>
                      <p className="text-[9px] text-slate-600 mt-2 font-medium uppercase tracking-tighter">{stat.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'intel' && (
            <motion.div 
              key="intel"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8 max-w-4xl mx-auto"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <Newspaper className="text-orange-500" /> 实时情报终端 <span className="text-xs font-bold text-slate-500">(Intelligence Terminal)</span>
                </h2>
                <div className="flex items-center gap-4">
                  {isFetchingNews && (
                    <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                      <RefreshCw size={14} className="animate-spin" />
                      <span className="text-[10px] font-black uppercase">正在抓取...</span>
                    </div>
                  )}
                  <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                    <span className="px-3 py-1 text-[10px] font-black text-emerald-500 bg-emerald-500/10 rounded">BULLISH 62%</span>
                    <span className="px-3 py-1 text-[10px] font-black text-rose-500">BEARISH 38%</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-4">
                {liveIntel.map((item) => (
                  <article key={item.id} className="group bg-black/40 border border-white/10 rounded-xl overflow-hidden hover:border-orange-500/50 transition-all flex h-48">
                    <div className="w-2 bg-orange-500 shrink-0" style={{ backgroundColor: item.sentiment === 'bullish' ? '#10b981' : item.sentiment === 'bearish' ? '#f43f5e' : '#64748b' }} />
                    
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{item.source}</span>
                            <span className="text-[10px] font-bold text-slate-700">|</span>
                            <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                          </div>
                          <div className="flex items-center gap-4">
                            {item.impactScore && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-black text-slate-500 uppercase">Impact</span>
                                <span className="text-xs font-black text-white">{item.impactScore}/10</span>
                              </div>
                            )}
                            <span className="text-[10px] font-bold text-slate-600">{item.time}</span>
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-white leading-tight mb-2 group-hover:text-orange-500 transition-colors">
                          {item.titleCn}
                        </h3>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                          {item.contentCn}
                        </p>
                      </div>

                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                        <div className="flex items-center gap-4">
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            item.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-500' : 
                            item.sentiment === 'bearish' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                          }`}>
                            {item.sentiment}
                          </span>
                          <p className="text-[9px] text-slate-600 font-medium italic truncate max-w-[300px]">
                            {item.titleEn}
                          </p>
                        </div>
                        <button className="text-[10px] font-black text-slate-500 uppercase hover:text-white transition-colors flex items-center gap-1">
                          <ExternalLink size={12} /> Details
                        </button>
                      </div>
                    </div>

                    {item.mediaUrl && (
                      <div className="w-64 h-full overflow-hidden border-l border-white/10 shrink-0 hidden md:block">
                        <img src={item.mediaUrl} alt="Intel" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-700 group-hover:scale-110" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </motion.div>
          )}

          {activeTab === 'macro' && (
            <motion.div 
              key="macro"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <Globe className="text-emerald-500" /> 宏观经济矩阵 <span className="text-xs font-bold text-slate-500">(Global Macro)</span>
                  </h2>
                  <span className="text-[10px] font-black text-slate-500 uppercase">Updated: 10m ago</span>
                </div>
                
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
                      
                      <div className="mt-6 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                            item.impact === 'Positive' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            Impact: {item.impact === 'Positive' ? 'BULLISH' : 'BEARISH'}
                          </div>
                          <p className="text-[10px] text-slate-500 font-medium italic">{item.desc}</p>
                        </div>
                        <div className="w-12 h-12 rounded-full border border-white/5 flex items-center justify-center group-hover:border-emerald-500/30 transition-colors">
                          <Activity size={16} className="text-slate-700 group-hover:text-emerald-500 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                    <Shield className="text-orange-500" /> 机构流向与头寸 <span className="text-xs font-bold text-slate-500">(Institutional Flows)</span>
                  </h2>
                </div>

                <div className="bg-black/40 border border-white/10 rounded-xl p-6 space-y-8">
                  <div>
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">顶级机构持仓信号 (Institutional Sentiment)</h3>
                    <div className="space-y-6">
                      {[
                        { name: 'BlackRock', signal: 'BUY', confidence: 88, detail: 'Spot ETF Inflow Dominant' },
                        { name: 'Goldman Sachs', signal: 'HOLD', confidence: 65, detail: 'Macro Uncertainty Hedge' },
                        { name: 'J.P. Morgan', signal: 'SELL', confidence: 42, detail: 'Profit Taking at Resistance' },
                        { name: 'Fidelity', signal: 'BUY', confidence: 75, detail: 'Long-term Accumulation' },
                      ].map((inst, i) => (
                        <div key={i} className="group">
                          <div className="flex items-center justify-between mb-2">
                            <div>
                              <span className="text-sm font-black text-white">{inst.name}</span>
                              <p className="text-[9px] text-slate-600 uppercase font-bold">{inst.detail}</p>
                            </div>
                            <div className="flex items-center gap-4">
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${
                                inst.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 
                                inst.signal === 'SELL' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                              }`}>
                                {inst.signal}
                              </span>
                              <span className="text-xs font-black text-white w-8 text-right">{inst.confidence}%</span>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                            <div className="bg-orange-500 h-full group-hover:bg-orange-400 transition-colors" style={{ width: `${inst.confidence}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-8 border-t border-white/5">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">风险预警系统 (Risk Alert System)</h3>
                    <div className="grid grid-cols-2 gap-4">
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
              </div>
            </motion.div>
          )}

          {activeTab === 'prediction' && (
            <motion.div 
              key="prediction"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="space-y-8"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black tracking-tighter uppercase flex items-center gap-3">
                  <Cpu className="text-indigo-500" /> 智能趋势预测 (AI Prediction Engine)
                </h2>
                {isPredicting && (
                  <div className="flex items-center gap-2 text-indigo-400 animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase">正在运行统计模型...</span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Price Range Card */}
                <div className="lg:col-span-1 bg-black/40 border border-white/10 rounded-xl p-6 flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">24h 价格概率区间</h3>
                      <span className="text-[8px] font-black text-indigo-400 bg-indigo-400/10 px-1.5 py-0.5 rounded">QUANT MODEL V2.1</span>
                    </div>
                    {predictionData?.priceRange ? (
                      <div className="space-y-6">
                        <div className="flex items-baseline gap-2 justify-center py-4 bg-white/[0.02] rounded-xl border border-white/5">
                          <span className="text-3xl font-black text-white">${predictionData.priceRange.min.toLocaleString()}</span>
                          <span className="text-slate-600 font-bold">-</span>
                          <span className="text-3xl font-black text-white">${predictionData.priceRange.max.toLocaleString()}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                            <p className="text-[8px] font-black text-slate-600 uppercase mb-1">置信度 (Confidence)</p>
                            <p className="text-lg font-black text-indigo-400">{predictionData.priceRange.probability}</p>
                          </div>
                          <div className="p-3 bg-white/[0.02] rounded-lg border border-white/5">
                            <p className="text-[8px] font-black text-slate-600 uppercase mb-1">市场倾向 (Bias)</p>
                            <p className={`text-lg font-black ${predictionData.priceRange.bias === 'Bullish' ? 'text-emerald-500' : 'text-rose-500'}`}>
                              {predictionData.priceRange.bias === 'Bullish' ? 'BULLISH' : 'BEARISH'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-40 flex flex-col items-center justify-center text-slate-600 italic text-xs gap-3">
                        <RefreshCw size={20} className="animate-spin" />
                        正在运行蒙特卡洛模拟...
                      </div>
                    )}
                  </div>
                  <div className="mt-6 pt-6 border-t border-white/5">
                    <h4 className="text-[10px] font-black text-slate-500 uppercase mb-3 text-center">风险/回报比 (Risk/Reward Matrix)</h4>
                    <div className="flex h-4 w-full rounded-full overflow-hidden bg-white/5">
                      <div className="bg-rose-500/40 h-full" style={{ width: '30%' }} />
                      <div className="bg-emerald-500 h-full" style={{ width: '70%' }} />
                    </div>
                    <div className="flex justify-between mt-2 text-[8px] font-black text-slate-600">
                      <span>RISK 1.2</span>
                      <span>REWARD 3.5</span>
                    </div>
                  </div>
                </div>

                {/* Correlation Map */}
                <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-xl p-6">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-6">多因子相关性矩阵 (Correlation Matrix)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {predictionData?.correlationMap?.map((item: any, i: number) => (
                      <div key={i} className="group flex items-center justify-between p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xs font-black ${
                            item.impactScore > 7 ? 'bg-orange-500/20 text-orange-500' : 'bg-slate-500/20 text-slate-500'
                          }`}>
                            {item.impactScore}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white">{item.factor}</h4>
                            <p className="text-[10px] text-slate-500">{item.relationship}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          <span className={`text-[10px] font-black ${item.impactScore > 7 ? 'text-orange-500' : 'text-slate-400'}`}>
                            {item.impactScore > 7 ? 'HIGH IMPACT' : 'MODERATE'}
                          </span>
                          <div className="w-16 h-1 bg-white/10 rounded-full mt-1 overflow-hidden">
                            <div className={`h-full ${item.impactScore > 7 ? 'bg-orange-500' : 'bg-slate-500'}`} style={{ width: `${item.impactScore * 10}%` }} />
                          </div>
                        </div>
                      </div>
                    )) || <div className="col-span-2 h-32 flex items-center justify-center text-slate-600 italic text-xs">正在分析因子关联...</div>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Social Sentiment */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <MessageSquare size={14} /> 社交媒体叙事 (Social Narratives)
                  </h3>
                  <div className="space-y-4">
                    {predictionData?.socialNarratives?.map((item: any, i: number) => (
                      <div key={i} className="p-4 bg-white/[0.02] rounded-xl border border-white/5 hover:bg-white/[0.04] transition-all">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{item.platform}</span>
                          <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                            item.sentiment === 'Bullish' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                          }`}>
                            {item.sentiment === 'Bullish' ? '看涨' : '看跌'}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-300">{item.narrative}</p>
                      </div>
                    )) || <div className="h-32 flex items-center justify-center text-slate-600 italic text-xs">正在监听社交信号...</div>}
                  </div>
                </div>

                {/* Catalyst Events */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Zap size={14} /> 关键催化剂 (Catalyst Events)
                  </h3>
                  <div className="space-y-4">
                    {predictionData?.catalysts?.map((item: any, i: number) => (
                      <div key={i} className="flex gap-4 p-4 bg-white/[0.02] rounded-xl border border-white/5">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-black/40 rounded-lg border border-white/5 shrink-0">
                          <span className="text-[8px] font-black text-slate-500 uppercase">Timing</span>
                          <span className="text-xs font-black text-orange-500">{item.timing}</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-white mb-1">{item.event}</h4>
                          <p className="text-xs text-slate-500 leading-relaxed">{item.potentialImpact}</p>
                        </div>
                      </div>
                    )) || <div className="h-32 flex items-center justify-center text-slate-600 italic text-xs">正在扫描潜在催化剂...</div>}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer / Ticker & System Logs */}
      <footer className="h-10 border-t border-white/5 bg-[#0A0B0D] flex items-center justify-between px-6 fixed bottom-0 w-full z-50 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <div className="flex animate-[marquee_25s_linear_infinite] gap-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>BTC: $68,432 (+2.4%)</span>
            <span>ETH: $3,845 (+1.8%)</span>
            <span>SPX: 5,123 (+0.4%)</span>
            <span>GOLD: $2,154 (+0.2%)</span>
            <span>DXY: 103.4 (-0.1%)</span>
            <span>US10Y: 4.21% (+0.5%)</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 bg-black/80 px-4 h-full border-l border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">System Autonomy Active</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex gap-3 overflow-hidden max-w-[300px]">
            {systemLogs.map((log, i) => (
              <span key={i} className="text-[9px] text-slate-600 whitespace-nowrap animate-in slide-in-from-bottom-1">
                {log}
              </span>
            ))}
          </div>
        </div>
      </footer>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.1);
        }
      `}} />
    </div>
  );
}
