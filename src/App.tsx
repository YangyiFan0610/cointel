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
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceDot
} from 'recharts';

// --- Types & Constants ---
type AssetType = 'BTC' | 'ETH' | 'SPX' | 'GOLD';

interface MarketData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface IntelItem {
  id: string;
  source: string;
  category: 'Macro' | 'BTC' | 'Altcoins' | 'On-Chain';
  titleEn: string;
  titleCn: string;
  contentEn: string;
  contentCn: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
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
const generateChartData = (points: number): MarketData[] => {
  let basePrice = 68000;
  return Array.from({ length: points }, (_, i) => {
    const open = basePrice;
    const close = basePrice + (Math.random() - 0.5) * 400;
    const high = Math.max(open, close) + Math.random() * 50;
    const low = Math.min(open, close) - Math.random() * 50;
    basePrice = close;
    return {
      time: `${Math.floor(i/2)}h`,
      open,
      high,
      low,
      close,
      volume: Math.random() * 1000
    };
  });
};

const MACRO_INDICATORS: MacroIndicator[] = [
  { name: 'DXY', nameCn: '美元指数', value: '103.45', change: '+0.12%', trend: 'up', impact: 'Negative', desc: '美元走强通常对加密货币不利。' },
  { name: 'S&P 500', nameCn: '标普500', value: '5,123.4', change: '-0.45%', trend: 'down', impact: 'Negative', desc: '股市下跌反映市场风险偏好降低。' },
  { name: 'Gold', nameCn: '黄金', value: '$2,165', change: '+0.82%', trend: 'up', impact: 'Positive', desc: '避险资产上涨，对比特币有带动作用。' },
  { name: 'US 10Y Yield', nameCn: '美债收益率', value: '4.21%', change: '+0.05', trend: 'up', impact: 'Negative', desc: '收益率上升会吸引资金离开高风险资产。' },
];

const INTEL_FEED: IntelItem[] = [
  {
    id: '1',
    source: 'Federal Reserve (联准会)',
    category: 'Macro',
    titleEn: 'Fed Chair Powell Hints at "Higher for Longer" Interest Rates',
    titleCn: '美联储主席鲍威尔暗示利率将“在更长时间内保持高位”',
    contentEn: 'Recent inflation data has been stickier than expected, suggesting that the path to 2% inflation will be bumpy.',
    contentCn: '近期通胀数据比预期更具粘性，表明通向 2% 通胀目标的道路将是坎坷的。',
    time: '12m ago',
    sentiment: 'bearish',
    importance: 3,
    mediaUrl: 'https://picsum.photos/seed/fed/800/400'
  },
  {
    id: '2',
    source: 'Glassnode (链上分析)',
    category: 'On-Chain',
    titleEn: 'Bitcoin Exchange Outflows Reach 3-Year High',
    titleCn: '比特币交易所流出量创 3 年新高',
    contentEn: 'Over 50,000 BTC moved to cold storage in the last 24 hours, indicating strong long-term conviction.',
    contentCn: '过去 24 小时内有超过 50,000 枚 BTC 转移到冷钱包，显示出强劲的长期持有信心。',
    time: '45m ago',
    sentiment: 'bullish',
    importance: 2,
    mediaUrl: 'https://picsum.photos/seed/chart/800/400'
  },
  {
    id: '3',
    source: 'Coin Bureau (YouTube)',
    category: 'Altcoins',
    titleEn: 'Ethereum Dencun Upgrade: What You Need to Know',
    titleCn: '以太坊 Dencun 升级：你需要知道的一切',
    contentEn: 'The upcoming upgrade will significantly reduce L2 transaction costs through EIP-4844.',
    contentCn: '即将到来的升级将通过 EIP-4844 显著降低 L2 交易成本。',
    time: '2h ago',
    sentiment: 'bullish',
    importance: 2,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    mediaUrl: 'https://picsum.photos/seed/eth/800/400'
  },
  {
    id: '4',
    source: 'Donald Trump (Truth Social)',
    category: 'Macro',
    titleEn: 'Trump Pledges to Support US Bitcoin Mining Industry',
    titleCn: '特朗普承诺支持美国比特币采矿业',
    contentEn: "We want all the remaining Bitcoin to be made in the USA!!! It will help us be ENERGY DOMINANT!!!",
    contentCn: "我们希望所有剩余的比特币都在美国制造！！！这将帮助我们实现能源主导地位！！！",
    time: '4h ago',
    sentiment: 'bullish',
    importance: 3,
    mediaUrl: 'https://picsum.photos/seed/trump/800/400'
  }
];

// --- Components ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'market' | 'intel' | 'macro' | 'prediction'>('market');
  const [selectedAsset, setSelectedAsset] = useState<AssetType>('BTC');
  const [currentPrice, setCurrentPrice] = useState(68432);
  const [chartData, setChartData] = useState<MarketData[]>([]);
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
  const generateOHLCData = (count: number, basePrice: number) => {
    const data: MarketData[] = [];
    let current = basePrice;
    for (let i = 0; i < count; i++) {
      const open = current;
      const close = current + (Math.random() - 0.5) * (basePrice * 0.02);
      const high = Math.max(open, close) + Math.random() * (basePrice * 0.005);
      const low = Math.min(open, close) - Math.random() * (basePrice * 0.005);
      data.push({
        time: `${i}h`,
        open,
        high,
        low,
        close,
        volume: Math.random() * 1000
      });
      current = close;
    }
    return data;
  };

  useEffect(() => {
    const basePrices = { BTC: 68000, ETH: 3800, SPX: 5100, GOLD: 2150 };
    setChartData(generateOHLCData(40, basePrices[selectedAsset]));
    setCurrentPrice(basePrices[selectedAsset]);
  }, [selectedAsset]);

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
    if (!ai) {
      setAiSummary("AI 智能分析仅在安全预览环境中可用。");
      return;
    }
    setIsAnalyzing(true);
    try {
      const prompt = `
        Search and analyze the LATEST real-time ${selectedAsset} and global macro market state (Date: ${new Date().toISOString()}).
        Focus on:
        1. Current ${selectedAsset} price action and key technical levels.
        2. Major macro events (Fed, DXY, US Economy).
        3. Cross-market correlations (Stocks vs Crypto vs Gold).
        
        Provide a bilingual (EN/CN) executive summary. 
        Format: 
        [EN] One sharp sentence on the most critical signal.
        [CN] 一句精准的中文核心信号总结。
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
    if (!ai) return;
    setIsFetchingNews(true);
    try {
      const prompt = `
        Search for the 4 most important news items for ${selectedAsset} and Global Markets from the LAST 4 HOURS.
        For each item, provide:
        - Source name
        - Category (Macro, BTC, Altcoins, or On-Chain)
        - Title in English
        - Title in Chinese
        - Content in English (max 20 words)
        - Content in Chinese (max 30 words)
        - Sentiment (bullish, bearish, or neutral)
        
        Return ONLY a JSON array of objects.
      `;

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
    if (!ai) return;
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
    if (ai) {
      runAiAnalysis();
      fetchLiveNews();
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
            setChartData(generateOHLCData(40, currentPrice));
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
                    {['1H', '4H', '1D', '1W'].map(t => (
                      <button key={t} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${t === '1H' ? 'bg-white text-black' : 'text-slate-500 hover:text-white'}`}>
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="h-[450px] relative">
                  {/* Annotation Tooltip Overlay */}
                  {hoveredAnnotation && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 bg-orange-500 text-black px-4 py-2 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-200">
                      <p className="text-[10px] font-black uppercase">市场事件</p>
                      <p className="text-sm font-bold">{hoveredAnnotation}</p>
                    </div>
                  )}

                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={assetConfig[selectedAsset].color} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={assetConfig[selectedAsset].color} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke="#475569" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val.toLocaleString()}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)' }}
                        itemStyle={{ color: assetConfig[selectedAsset].color }}
                      />
                      <Area type="monotone" dataKey="close" stroke={assetConfig[selectedAsset].color} strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                      
                      {/* Interactive Annotations */}
                      {annotations.map((note, i) => (
                        <ReferenceDot 
                          key={i}
                          x={note.x} 
                          y={note.y} 
                          r={6} 
                          fill={assetConfig[selectedAsset].color} 
                          stroke="#fff" 
                          strokeWidth={2}
                          className="cursor-pointer hover:scale-150 transition-transform"
                          onMouseEnter={() => setHoveredAnnotation(`${note.label}: ${note.desc}`)}
                          onMouseLeave={() => setHoveredAnnotation(null)}
                        />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                  { label: '24h 成交额', value: '$82.4B', change: '+12%', icon: Activity },
                  { label: '全网持仓', value: '$34.1B', change: '-2.5%', icon: BarChart3 },
                  { label: '贪婪指数', value: '78', change: '极度贪婪', icon: Shield },
                  { label: '多空比', value: '1.08', change: '看涨占优', icon: TrendingUp },
                ].map((stat, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/[0.08] transition-colors">
                    <div className="flex items-center gap-2 text-slate-500 mb-2">
                      <stat.icon size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">{stat.label}</span>
                    </div>
                    <div className="flex items-end justify-between">
                      <span className="text-xl font-black">{stat.value}</span>
                      <span className="text-[10px] font-bold text-emerald-500">{stat.change}</span>
                    </div>
                  </div>
                ))}
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
                  <Newspaper className="text-orange-500" /> 全网深度情报 <span className="text-xs font-bold text-slate-500">(双语对照)</span>
                </h2>
                {isFetchingNews && (
                  <div className="flex items-center gap-2 text-orange-500 animate-pulse">
                    <RefreshCw size={14} className="animate-spin" />
                    <span className="text-[10px] font-black uppercase">正在抓取最新情报...</span>
                  </div>
                )}
              </div>
              
              {liveIntel.map((item) => (
                <article key={item.id} className="group bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/[0.08] transition-all">
                  <div className="flex flex-col md:flex-row gap-6">
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{item.source}</span>
                          <span className="text-[10px] font-bold text-slate-600">/</span>
                          <span className="text-[10px] font-bold text-slate-500 uppercase">{item.category}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-600">{item.time}</span>
                      </div>

                      <div className="space-y-2">
                        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-tight leading-tight opacity-50 group-hover:opacity-100 transition-opacity">
                          {item.titleEn}
                        </h2>
                        <h3 className="text-2xl font-black text-white leading-tight">
                          {item.titleCn}
                        </h3>
                      </div>

                      <div className="space-y-4 p-5 bg-black/40 rounded-xl border border-white/5">
                        <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-white/10 pl-4">
                          "{item.contentEn}"
                        </p>
                        <p className="text-base text-slate-200 leading-relaxed font-medium">
                          {item.contentCn}
                        </p>
                      </div>

                      <div className="flex items-center gap-4">
                        {item.videoUrl && (
                          <a href={item.videoUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-black uppercase hover:bg-rose-500 hover:text-white transition-all">
                            <PlayCircle size={14} /> 查看视频分析
                          </a>
                        )}
                        <button className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                          <ExternalLink size={12} /> 查看原文
                        </button>
                      </div>
                    </div>

                    {item.mediaUrl && (
                      <div className="w-full md:w-64 h-40 rounded-xl overflow-hidden border border-white/10 shrink-0">
                        <img src={item.mediaUrl} alt="Intel" className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" />
                      </div>
                    )}
                  </div>
                </article>
              ))}
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
                <h2 className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <Globe className="text-emerald-500" /> 宏观经济指标
                </h2>
                <div className="grid grid-cols-1 gap-4">
                  {MACRO_INDICATORS.map((item, i) => (
                    <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-6 relative overflow-hidden group">
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">{item.name}</p>
                          <h3 className="text-2xl font-black">{item.nameCn}</h3>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-black tracking-tighter">{item.value}</p>
                          <p className={`text-xs font-bold ${item.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>{item.change}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-4 relative z-10">
                        <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                          item.impact === 'Positive' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                        }`}>
                          市场影响: {item.impact === 'Positive' ? '利好' : '利空'}
                        </div>
                        <p className="text-xs text-slate-500 italic">{item.desc}</p>
                      </div>
                      <div className="absolute top-0 right-0 p-2 opacity-10 group-hover:opacity-20 transition-opacity">
                        <Info size={48} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <h2 className="text-xl font-black tracking-tighter flex items-center gap-2">
                  <Shield className="text-orange-500" /> 机构信号与风险
                </h2>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-8">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">顶级机构持仓信号</h3>
                    <div className="space-y-4">
                      {[
                        { name: 'BlackRock', signal: 'BUY', confidence: 88 },
                        { name: 'Goldman Sachs', signal: 'HOLD', confidence: 65 },
                        { name: 'J.P. Morgan', signal: 'SELL', confidence: 42 },
                      ].map((inst, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <span className="text-sm font-bold">{inst.name}</span>
                          <div className="flex items-center gap-4">
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${inst.signal === 'BUY' ? 'bg-emerald-500 text-black' : inst.signal === 'SELL' ? 'bg-rose-500 text-black' : 'bg-slate-500 text-black'}`}>
                              {inst.signal}
                            </span>
                            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                              <div className="bg-orange-500 h-full" style={{ width: `${inst.confidence}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div className="pt-8 border-t border-white/5">
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">新手贴士 (Newbie Guide)</h3>
                    <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 text-[10px] font-bold">1</div>
                        <p className="text-xs text-slate-300">关注美元指数 (DXY)，它通常与比特币呈负相关。</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 text-[10px] font-bold">2</div>
                        <p className="text-xs text-slate-300">交易所流出量增加通常意味着大户正在囤币，是看涨信号。</p>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-5 h-5 rounded-full bg-indigo-500 flex items-center justify-center shrink-0 text-[10px] font-bold">3</div>
                        <p className="text-xs text-slate-300">贪婪指数过高时（如 80 以上），需警惕短期回调风险。</p>
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
                <div className="lg:col-span-1 bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col justify-between">
                  <div>
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">24h 价格概率区间</h3>
                    {predictionData?.priceRange ? (
                      <div className="space-y-4">
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-black text-white">${predictionData.priceRange.min.toLocaleString()}</span>
                          <span className="text-slate-500 font-bold">-</span>
                          <span className="text-4xl font-black text-white">${predictionData.priceRange.max.toLocaleString()}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="px-3 py-1 bg-indigo-500/20 text-indigo-400 rounded-full text-[10px] font-black uppercase">
                            置信度: {predictionData.priceRange.probability}
                          </div>
                          <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                            predictionData.priceRange.bias === 'Bullish' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-rose-500/20 text-rose-500'
                          }`}>
                            倾向: {predictionData.priceRange.bias === 'Bullish' ? '看涨' : '看跌'}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-slate-600 italic text-xs">计算中...</div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-600 mt-6 italic">
                    * 基于当前波动率与订单流统计模型计算。
                  </p>
                </div>

                {/* Correlation Map */}
                <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-6">多因子相关性矩阵 (Correlation Map)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {predictionData?.correlationMap?.map((item: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-white/5">
                        <div className="flex items-center gap-3">
                          <div className={`w-1.5 h-1.5 rounded-full ${item.impactScore > 7 ? 'bg-orange-500' : 'bg-slate-500'}`} />
                          <span className="text-sm font-bold text-slate-300">{item.factor}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-500 uppercase">{item.relationship}</p>
                          <div className="w-24 h-1 bg-white/5 rounded-full mt-1 overflow-hidden">
                            <div className="bg-indigo-500 h-full" style={{ width: `${item.impactScore * 10}%` }} />
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
