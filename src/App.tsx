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
}

interface InstitutionalSignal {
  source: string;
  signal: 'BUY' | 'SELL' | 'HOLD';
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
  { id: '1', author: 'PlanB', handle: '@100trillionUSD', content: 'S2F model still on track. BTC scarcity is the ultimate driver. Patience is key.', time: '2m ago', sentiment: 'bullish' },
  { id: '2', author: 'Peter Schiff', handle: '@PeterSchiff', content: 'Bitcoin is a digital bubble. Gold is the only real store of value. Get out while you can.', time: '15m ago', sentiment: 'bearish' },
  { id: '3', author: 'Willy Woo', handle: '@woonomic', content: 'On-chain data shows massive accumulation by whales. Exchange balances hitting multi-year lows.', time: '34m ago', sentiment: 'bullish' },
  { id: '4', author: 'Glassnode', handle: '@glassnode', content: 'Realized cap reaching new ATHs. Market structure remains robust despite short-term volatility.', time: '1h ago', sentiment: 'neutral' },
];

const MOCK_INSTITUTIONS: InstitutionalSignal[] = [
  { source: 'Goldman Sachs', signal: 'HOLD', confidence: 65, summary: 'Macro headwinds persist, but institutional adoption provides a floor.' },
  { source: 'BlackRock', signal: 'BUY', confidence: 88, summary: 'ETF inflows accelerating. Spot demand outstripping supply.' },
  { source: 'J.P. Morgan', signal: 'SELL', confidence: 42, summary: 'Short-term overbought signals on technical indicators.' },
];

// --- Components ---

export default function App() {
  const [priceData, setPriceData] = useState<MarketData[]>(generateChartData(30));
  const [currentPrice, setCurrentPrice] = useState(68432);
  const [priceChange, setPriceChange] = useState(2.4);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSummary, setAiSummary] = useState("Aggregating real-time data from 12 sources...");

  // Initialize Gemini safely
  const ai = useMemo(() => {
    try {
      // Check if process and process.env exist before accessing
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
      setAiSummary("AI Analysis is only available in the secure preview environment.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const prompt = `
        Analyze the current Bitcoin market state based on these inputs:
        - Price: $${currentPrice}
        - KOL Sentiment: PlanB (Bullish), Peter Schiff (Bearish), Willy Woo (Bullish)
        - Institutional Signals: BlackRock (Buy), Goldman (Hold), JPM (Sell)
        
        Provide a 2-sentence "Executive Summary" for an individual investor. 
        Be direct, concise, and highlight the most critical signal.
      `;
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
      });
      
      setAiSummary(response.text || "Analysis failed. Market remains volatile.");
    } catch (error) {
      console.error("AI Analysis Error:", error);
      setAiSummary("Analysis unavailable. Ensure you are in the preview environment.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    runAiAnalysis();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0D] text-slate-100 font-mono selection:bg-indigo-500/30">
      {/* Top Navigation / Status Bar */}
      <nav className="h-14 border-b border-white/5 bg-[#0A0B0D]/80 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-orange-500 rounded flex items-center justify-center">
              <TrendingUp size={14} className="text-black" />
            </div>
            <span className="font-black text-sm tracking-tighter">BTC_INTEL_v1.0</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-500" /> System Live</span>
            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input 
              type="text" 
              placeholder="Search assets..." 
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-1.5 text-xs outline-none focus:border-orange-500/50 transition-all"
            />
          </div>
          <button className="p-2 hover:bg-white/5 rounded-lg transition-colors">
            <RefreshCw size={16} className="text-slate-400" />
          </button>
        </div>
      </nav>

      <main className="p-6 grid grid-cols-12 gap-6 max-w-[1600px] mx-auto">
        
        {/* Left Column: Market Data & Chart */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          
          {/* Price Header */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-8 flex flex-wrap items-end justify-between gap-8">
            <div>
              <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">
                <Globe size={14} /> Bitcoin / USD (Spot)
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
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">24h High</p>
                <p className="text-sm font-bold">$69,120</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">24h Low</p>
                <p className="text-sm font-bold">$67,840</p>
              </div>
              <div>
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Volume</p>
                <p className="text-sm font-bold">2.4B</p>
              </div>
            </div>
          </div>

          {/* Main Chart */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 h-[450px]">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-sm font-black uppercase tracking-widest">Price Action</h2>
                <div className="flex bg-white/5 p-1 rounded-lg">
                  {['1H', '4H', '1D', '1W'].map(t => (
                    <button key={t} className={`px-3 py-1 text-[10px] font-bold rounded-md transition-colors ${t === '1H' ? 'bg-orange-500 text-black' : 'text-slate-500 hover:text-white'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                <div className="w-2 h-2 bg-orange-500 rounded-full" /> Live Feed
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
                    inst.signal === 'BUY' ? 'bg-emerald-500/10 text-emerald-500' : 
                    inst.signal === 'SELL' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                  }`}>
                    {inst.signal}
                  </div>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed mb-4">{inst.summary}</p>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-600 font-bold">Confidence</span>
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
                <h2 className="text-sm font-black uppercase tracking-widest">AI Intelligence Engine</h2>
              </div>
              <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 border border-white/10 min-h-[100px] flex flex-col justify-center">
                {isAnalyzing ? (
                  <div className="flex items-center gap-3 text-sm font-bold">
                    <RefreshCw size={16} className="animate-spin" />
                    Processing market signals...
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
                Refresh Analysis
              </button>
            </div>
            <div className="absolute -bottom-12 -right-12 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </div>

          {/* KOL / Twitter Feed */}
          <div className="bg-white/5 border border-white/10 rounded-2xl flex flex-col h-[700px]">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Twitter size={18} className="text-sky-400" />
                <h2 className="text-sm font-black uppercase tracking-widest">KOL Pulse</h2>
              </div>
              <span className="text-[10px] font-bold text-slate-500 bg-white/5 px-2 py-0.5 rounded">Live Feed</span>
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
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-[10px] font-bold">
                        {kol.author[0]}
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
                      {kol.sentiment}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed mb-3">
                    {kol.content}
                  </p>
                  <div className="flex items-center justify-between text-[9px] font-bold text-slate-600">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1 hover:text-sky-400 cursor-pointer"><MessageSquare size={10} /> 12</span>
                      <span className="flex items-center gap-1 hover:text-emerald-400 cursor-pointer"><RefreshCw size={10} /> 45</span>
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
              <h2 className="text-sm font-black uppercase tracking-widest">Risk Assessment</h2>
            </div>
            <div className="space-y-4">
              {[
                { label: 'Volatility', value: 'Medium', color: 'bg-amber-500' },
                { label: 'Liquidity', value: 'High', color: 'bg-emerald-500' },
                { label: 'Sentiment', value: 'Greed', color: 'bg-orange-500' },
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
