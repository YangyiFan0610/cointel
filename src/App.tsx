import React, { useState, useEffect, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Twitter, 
  Zap, 
  Shield, 
  BarChart3, 
  Clock, 
  Search, 
  RefreshCw,
  AlertTriangle,
  MessageSquare,
  Globe,
  ArrowUpRight,
  ArrowDownRight,
  Cpu
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from 'recharts';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Types & Constants ---
interface MarketData {
  time: string;
  price: number;
  volume: number;
}

interface KOLComment {
  id: string;
  author: string;
  handle: string;
  content: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  type: 'twitter' | 'youtube' | 'macro';
  url?: string;
}

interface InstitutionalSignal {
  source: string;
  signal: '买入' | '卖出' | '持有';
  confidence: number;
  summary: string;
}

// Mock Data Generators
const generateChartData = (points: number): MarketData[] => {
  let basePrice = 68400;
  return Array.from({ length: points }, (_, i) => {
    basePrice += (Math.random() - 0.5) * 200;
    return {
      time: `${12 + Math.floor(i/5)}:${(i*12)%60}`,
      price: Math.floor(basePrice),
      volume: Math.floor(Math.random() * 5000 + 2000)
    };
  });
};

const MOCK_KOLS: KOLComment[] = [
  { id: '1', author: 'PlanB', handle: '@100trillionUSD', content: 'S2F 模型仍在轨道上。BTC 的稀缺性是最终驱动力。耐心是关键。', time: '2分钟前', sentiment: 'bullish', type: 'twitter' },
  { id: '2', author: 'Donald Trump', handle: '@realDonaldTrump', content: '我们要让美国成为全球加密货币之都！比特币是未来的自由。', time: '15分钟前', sentiment: 'bullish', type: 'macro' },
  { id: '3', author: 'Benjamin Cowen', handle: 'Into The Cryptoverse', content: '【视频】比特币减半后的宏观周期分析：我们正处于关键支撑位。', time: '45分钟前', sentiment: 'neutral', type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
  { id: '4', author: '联准会 (Fed)', handle: 'Macro Update', content: '鲍威尔暗示降息节奏可能放缓，宏观流动性预期出现波动。', time: '1小时前', sentiment: 'bearish', type: 'macro' },
  { id: '5', author: 'Willy Woo', handle: '@woonomic', content: '链上数据显示大户正在疯狂吸筹。交易所库存降至多年低点。', time: '2小时前', sentiment: 'bullish', type: 'twitter' },
  { id: '6', author: 'Coin Bureau', handle: 'YouTube', content: '【视频】2026年最值得关注的3个比特币 L2 项目。', time: '3小时前', sentiment: 'bullish', type: 'youtube', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' },
];

const MOCK_INSTITUTIONS: InstitutionalSignal[] = [
  { source: '高盛 (Goldman Sachs)', signal: '持有', confidence: 65, summary: '宏观阻力依然存在，但机构采用提供了底部支撑。' },
  { source: '贝莱德 (BlackRock)', signal: '买入', confidence: 88, summary: 'ETF 流入加速。现货需求远超供应。' },
  { source: '摩根大通 (J.P. Morgan)', signal: '卖出', confidence: 42, summary: '技术指标显示短期处于超买状态。' },
];

// --- Components ---

export default function App() {
  const [priceData, setPriceData] = useState<MarketData[]>(generateChartData(30));
  const [currentPrice, setCurrentPrice] = useState(68432);
  const [priceChange, setPriceChange] = useState(2.4);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState("正在聚合来自 12 个源的实时数据...");

  // Initialize Gemini safely
  const ai = useMemo(() => {
    try {
      const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.GEMINI_API_KEY : undefined;
      if (!apiKey) {
        console.warn("GEMINI_API_KEY not found. AI features will be disabled.");
        return null;
      }
      return new GoogleGenAI({ apiKey });
    } catch (e) {
      console.error("Failed to initialize AI:", e);
      return null;
    }
  }, []);

  // Simulate Live Price Updates
  useEffect(() => {
    const interval = setInterval(() => {
      const delta = (Math.random() - 0.5) * 50;
      setCurrentPrice(prev => Math.floor(prev + delta));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // AI Analysis Function
  const runAiAnalysis = async () => {
    if (!ai) {
      setAiSummary("AI 智能分析仅在安全预览环境中可用。");
      return;
    }
    setIsAnalyzing(true);
    try {
      const prompt = `
        请用中文分析当前的比特币市场状态：
        - 价格: $${currentPrice}
        - KOL 情绪: PlanB (看涨), Trump (看涨), Fed (看跌)
        - 机构信号: BlackRock (买入), Goldman (持有), JPM (卖出)
        
        请为个人投资者提供 2 句极其精炼的“执行摘要”。
        要求：直接、简洁、指出最关键的信号。
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setAiSummary(response.text || "分析失败。市场保持波动。");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiSummary("分析不可用。请确保在预览环境中运行。");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runAiAnalysis();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-100 font-sans selection:bg-orange-500/30">
      {/* Top Navigation / Status Bar */}
      <nav className="h-14 border-b border-white/5 bg-[#0A0B0D]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <Zap size={14} className="text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter">BTC_情报终端_v2.0</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-500" /> 系统在线</span>
            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="搜索资产..." 
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors" onClick={runAiAnalysis}>
            <RefreshCw size={16} className="text-slate-400" />
          </button>
        </div>
      </nav>

      <main className="p-6 grid grid-cols-12 gap-6 max-w-[1600px] mx-auto pb-16">
        
        {/* Left Column: Market Data & Chart */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Price Header */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-wrap items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                <Globe size={14} /> 比特币 / 美元 (现货)
              </div>
              <div className="flex items-baseline gap-4">
                <h1 className="text-6xl font-black tracking-tighter">
                  ${currentPrice.toLocaleString()}
                </h1>
                <div className={`flex items-center gap-1 text-lg font-bold ${priceChange >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {priceChange >= 0 ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                  {priceChange}%
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-8 border-l border-white/10 pl-8">
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">24h 最高</p>
                <p className="text-sm font-bold">$69,120</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">24h 最低</p>
                <p className="text-sm font-bold">$67,840</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">成交量</p>
                <p className="text-sm font-bold">2.4B</p>
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[450px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-black uppercase tracking-widest">价格走势</h2>
                <div className="flex bg-white/5 p-1 rounded-lg">
                  {['1H', '4H', '1D', '1W'].map(t => (
                    <button key={t} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${t === '1H' ? 'bg-orange-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse" /> 实时数据流
              </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={priceData}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                <XAxis 
                  dataKey="time" 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  interval={5}
                />
                <YAxis 
                  domain={['auto', 'auto']} 
                  stroke="#475569" 
                  fontSize={10} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(val) => `$${val/1000}k`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', fontSize: '12px' }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#f97316" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorPrice)" 
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Institutional Signals */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {MOCK_INSTITUTIONS.map((inst, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-white/20 transition-all group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{inst.source}</span>
                  <div className={`px-2 py-0.5 rounded text-[10px] font-black ${
                    inst.signal === '买入' ? 'bg-emerald-500/10 text-emerald-500' : 
                    inst.signal === '卖出' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {inst.signal}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{inst.summary}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">置信度</span>
                  <div className="w-24 h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="bg-orange-500 h-full" style={{ width: `${inst.confidence}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: AI Intelligence & KOL Feed */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          
          {/* AI Intelligence Terminal */}
          <div className="bg-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden shadow-2xl shadow-indigo-500/20">
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Cpu size={20} className="animate-pulse" />
                <h2 className="text-sm font-black uppercase tracking-widest">AI 智能决策引擎</h2>
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 min-h-[100px] flex flex-col justify-center">
                {isAnalyzing ? (
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <RefreshCw size={16} className="animate-spin" />
                    正在处理市场信号...
                  </div>
                ) : (
                  <p className="text-sm font-bold leading-relaxed italic">
                    "{aiSummary}"
                  </p>
                )}
              </div>
              <button 
                onClick={runAiAnalysis}
                disabled={isAnalyzing}
                className="mt-4 w-full py-2 bg-white text-indigo-600 rounded-lg text-xs font-black uppercase tracking-widest hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                刷新智能分析
              </button>
            </div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </div>

          {/* KOL / Twitter Feed */}
          <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col h-[700px]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} className="text-orange-500" />
                <h2 className="text-sm font-black uppercase tracking-widest">全网情报脉搏</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">实时更新</span>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
              {MOCK_KOLS.map((kol) => (
                <motion.div 
                  key={kol.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-4 bg-white/5 rounded-xl border border-transparent hover:border-white/10 transition-all group"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold overflow-hidden">
                        {kol.type === 'twitter' && <Twitter size={14} className="text-sky-400" />}
                        {kol.type === 'youtube' && <Zap size={14} className="text-rose-500" />}
                        {kol.type === 'macro' && <Globe size={14} className="text-emerald-500" />}
                      </div>
                      <div>
                        <p className="text-xs font-bold">{kol.author}</p>
                        <p className="text-[10px] text-slate-500">{kol.handle}</p>
                      </div>
                    </div>
                    <span className={`text-[8px] font-black uppercase px-1.5 py-0.5 rounded ${
                      kol.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-500' : 
                      kol.sentiment === 'bearish' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {kol.sentiment === 'bullish' ? '看涨' : kol.sentiment === 'bearish' ? '看跌' : '中性'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {kol.content}
                  </p>
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                      {kol.url && (
                        <a href={kol.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-rose-500 hover:underline">
                          <Zap size={10} /> 查看视频
                        </a>
                      )}
                      <span className="flex items-center gap-1"><MessageSquare size={10} /> 互动</span>
                    </div>
                    <span>{kol.time}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Risk Indicator */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-emerald-500" />
              <h2 className="text-sm font-black uppercase tracking-widest">综合风险评估</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: '市场波动率', value: '中等', color: 'bg-amber-500' },
                { label: '流动性指数', value: '极高', color: 'bg-emerald-500' },
                { label: '情绪指数', value: '贪婪', color: 'bg-orange-500' },
              ].map((risk, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[10px] font-bold mb-1.5 uppercase tracking-widest">
                    <span className="text-slate-500">{risk.label}</span>
                    <span className="text-slate-300">{risk.value}</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`${risk.color} h-full w-2/3`} />
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </main>

      {/* Footer / Ticker */}
      <footer className="h-10 border-t border-white/5 bg-[#0A0B0D] flex items-center px-6 fixed bottom-0 w-full z-50 overflow-hidden">
        <div className="flex animate-[marquee_20s_linear_infinite] gap-12 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
          <span>BTC: $68,432 (+2.4%)</span>
          <span>ETH: $3,845 (+1.8%)</span>
          <span>SOL: $145 (-0.5%)</span>
          <span>BNB: $592 (+0.2%)</span>
          <span>XRP: $0.62 (+1.1%)</span>
          <span>ADA: $0.45 (-2.3%)</span>
          <span>DOGE: $0.16 (+5.4%)</span>
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
