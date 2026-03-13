import React, { useState, useEffect } from 'react';
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
  ExternalLink
} from 'lucide-react';
import { motion } from 'motion/react';

// --- Types & Constants ---
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
  importance: 1 | 2 | 3; // 3 is highest
}

interface MacroIndicator {
  name: string;
  nameCn: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  impact: 'Positive' | 'Negative' | 'Neutral';
}

// --- Mock Data ---
const MACRO_INDICATORS: MacroIndicator[] = [
  { name: 'DXY', nameCn: '美元指数', value: '103.45', change: '+0.12%', trend: 'up', impact: 'Negative' },
  { name: 'S&P 500', nameCn: '标普500', value: '5,123.4', change: '-0.45%', trend: 'down', impact: 'Negative' },
  { name: 'Gold', nameCn: '黄金', value: '$2,165', change: '+0.82%', trend: 'up', impact: 'Positive' },
  { name: 'US 10Y Yield', nameCn: '美债10年收益率', value: '4.21%', change: '+0.05', trend: 'up', impact: 'Negative' },
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
  const [currentBtc, setCurrentBtc] = useState(68432);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBtc(prev => prev + (Math.random() - 0.5) * 20);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-orange-500/30">
      {/* Terminal Header */}
      <header className="h-12 border-b border-white/10 bg-black flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-orange-500 rounded-sm flex items-center justify-center">
              <Zap size={12} className="text-black" />
            </div>
            <span className="font-black text-xs tracking-tighter uppercase">Crypto_Terminal_v3.0</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-4 text-[10px] font-bold text-slate-500 uppercase">
            <span className="flex items-center gap-1.5"><Activity size={12} className="text-emerald-500" /> Data_Feed: Active</span>
            <span className="flex items-center gap-1.5"><Clock size={12} /> {new Date().toLocaleTimeString()} UTC</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 text-[11px] font-bold">
            <span className="text-orange-500">BTC: ${currentBtc.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
            <span className="text-slate-400">ETH: $3,842.12</span>
            <span className="text-slate-400">SOL: $148.50</span>
          </div>
          <button className="p-1.5 hover:bg-white/10 rounded transition-colors">
            <RefreshCw size={14} className="text-slate-500" />
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Left Sidebar: Macro Indicators */}
        <aside className="w-72 border-r border-white/10 h-[calc(100vh-3rem)] sticky top-12 p-4 space-y-6 bg-black/50 overflow-y-auto hidden xl:block custom-scrollbar">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <Globe size={12} /> Macro_Indicators (宏观指标)
            </h2>
            <div className="space-y-3">
              {MACRO_INDICATORS.map((item, i) => (
                <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-lg hover:border-white/10 transition-all">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[10px] font-bold text-slate-400">{item.name} <span className="text-slate-600 ml-1">({item.nameCn})</span></span>
                    <span className={`text-[10px] font-black ${item.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {item.change}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <span className="text-lg font-black tracking-tighter">{item.value}</span>
                    <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                      item.impact === 'Positive' ? 'bg-emerald-500/10 text-emerald-500' : 
                      item.impact === 'Negative' ? 'bg-rose-500/10 text-rose-500' : 'bg-slate-500/10 text-slate-500'
                    }`}>
                      {item.impact === 'Positive' ? '利好' : item.impact === 'Negative' ? '利空' : '中性'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <Shield size={12} /> Market_Risk (风险评估)
            </h2>
            <div className="space-y-4">
              {[
                { label: 'Fear & Greed (贪婪指数)', value: '78', status: 'Extreme Greed', color: 'bg-orange-500' },
                { label: 'BTC Dominance (占比)', value: '52.4%', status: 'Increasing', color: 'bg-indigo-500' },
                { label: 'Stablecoin Supply', value: '142B', status: 'Bullish Divergence', color: 'bg-emerald-500' },
              ].map((risk, i) => (
                <div key={i}>
                  <div className="flex justify-between text-[9px] font-bold mb-1.5 uppercase">
                    <span className="text-slate-500">{risk.label}</span>
                    <span className="text-slate-300">{risk.status}</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className={`${risk.color} h-full`} style={{ width: risk.value.includes('%') ? risk.value : `${risk.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* Main Content: Intel Feed */}
        <main className="flex-1 p-6 max-w-4xl mx-auto pb-20">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tighter uppercase">Intel_Feed (情报流)</h1>
              <div className="flex gap-2">
                {['All', 'Macro', 'BTC', 'On-Chain'].map(cat => (
                  <button key={cat} className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                    cat === 'All' ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-500 hover:text-white'
                  }`}>
                    {cat}
                  </button>
                ))}
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Live_Aggregation
            </div>
          </div>

          <div className="space-y-12">
            {INTEL_FEED.map((item) => (
              <article key={item.id} className="group relative">
                {/* Importance Marker */}
                {item.importance === 3 && (
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,0.5)]" />
                )}
                
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
                      <h2 className="text-xs font-bold text-slate-500 uppercase tracking-tight leading-tight opacity-40 group-hover:opacity-100 transition-opacity">
                        {item.titleEn}
                      </h2>
                      <h3 className="text-2xl font-black text-white leading-tight">
                        {item.titleCn}
                      </h3>
                    </div>

                    <div className="space-y-4 p-5 bg-white/[0.02] border border-white/5 rounded-2xl group-hover:bg-white/[0.04] transition-all">
                      <p className="text-xs text-slate-500 leading-relaxed italic border-l-2 border-white/10 pl-4">
                        "{item.contentEn}"
                      </p>
                      <p className="text-base text-slate-200 leading-relaxed font-medium">
                        {item.contentCn}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {item.videoUrl && (
                        <a 
                          href={item.videoUrl} 
                          target="_blank" 
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all"
                        >
                          <PlayCircle size={14} /> Watch_Analysis (查看视频分析)
                        </a>
                      )}
                      <button className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors flex items-center gap-1">
                        <ExternalLink size={12} /> Source_Link
                      </button>
                    </div>
                  </div>

                  {item.mediaUrl && (
                    <div className="w-full md:w-64 h-40 rounded-2xl overflow-hidden border border-white/10 shrink-0">
                      <img 
                        src={item.mediaUrl} 
                        alt="Intel Media" 
                        className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700 scale-105 group-hover:scale-100"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </main>

        {/* Right Sidebar: Market Depth / Heatmap */}
        <aside className="w-80 border-l border-white/10 h-[calc(100vh-3rem)] sticky top-12 p-4 space-y-6 bg-black/50 overflow-y-auto hidden lg:block custom-scrollbar">
          <div>
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <BarChart3 size={12} /> Market_Sentiment (市场情绪)
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Longs', value: '52.1%', color: 'text-emerald-500' },
                { label: 'Shorts', value: '47.9%', color: 'text-rose-500' },
                { label: 'Vol (24h)', value: '$82B', color: 'text-slate-300' },
                { label: 'Open Int', value: '$34B', color: 'text-slate-300' },
              ].map((stat, i) => (
                <div key={i} className="bg-white/5 p-3 rounded-lg border border-white/5">
                  <p className="text-[8px] font-bold text-slate-500 uppercase mb-1">{stat.label}</p>
                  <p className={`text-sm font-black ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 border-t border-white/5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 flex items-center gap-2">
              <TrendingUp size={12} /> Top_Movers (异动资产)
            </h2>
            <div className="space-y-2">
              {[
                { symbol: 'SOL', price: '$148.5', change: '+12.4%', trend: 'up' },
                { symbol: 'PEPE', price: '$0.000008', change: '+24.1%', trend: 'up' },
                { symbol: 'LINK', price: '$18.2', change: '-4.2%', trend: 'down' },
                { symbol: 'AVAX', price: '$42.1', change: '+2.1%', trend: 'up' },
              ].map((coin, i) => (
                <div key={i} className="flex items-center justify-between p-2 hover:bg-white/5 rounded transition-colors cursor-pointer">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-white/10 rounded-full flex items-center justify-center text-[8px] font-black">{coin.symbol[0]}</div>
                    <span className="text-xs font-black">{coin.symbol}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold">${coin.price}</p>
                    <p className={`text-[8px] font-black ${coin.trend === 'up' ? 'text-emerald-500' : 'text-rose-500'}`}>{coin.change}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* AI Quick Summary (Secondary) */}
          <div className="pt-6 border-t border-white/5">
            <div className="bg-indigo-600/10 border border-indigo-500/20 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Cpu size={14} className="text-indigo-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">AI_Brief (智能简报)</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300 italic">
                "Macro pressure from Fed is being offset by strong on-chain accumulation. BTC structure remains bullish above $67k. Watch SOL for altcoin leadership."
              </p>
            </div>
          </div>
        </aside>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
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
