import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Globe,
  Zap,
  AlertCircle,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CoinPrice {
  usd: number;
  usd_24h_change: number;
  usd_24h_vol: number;
}

interface PriceData {
  bitcoin: CoinPrice;
  ethereum: CoinPrice;
}

interface FearGreed {
  value: string;
  value_classification: string;
}

interface IntelItem {
  id: string;
  source: string;
  category: 'Macro' | 'Institutional' | 'Technical' | 'Narrative';
  titleCn: string;
  contentCn: string;
  time: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  mediaUrl?: string;
}

interface MacroEvent {
  time: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  currency: string;
}

const RSS_SOURCES = [
  'https://api.rss2json.com/v1/api.json?rss_url=https://cointelegraph.com/rss',
  'https://api.rss2json.com/v1/api.json?rss_url=https://decrypt.co/feed',
  'https://api.rss2json.com/v1/api.json?rss_url=https://coindesk.com/arc/outboundfeeds/rss/',
];

const MACRO_EVENTS: MacroEvent[] = [
  { time: '今日 21:30', event: '美国 CPI 通胀数据', impact: 'high', currency: 'USD' },
  { time: '明日 02:00', event: '美联储会议纪要', impact: 'high', currency: 'USD' },
  { time: '本周五 22:00', event: '非农就业人数', impact: 'high', currency: 'USD' },
  { time: '下周二 21:30', event: '美国 PPI 数据', impact: 'medium', currency: 'USD' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'intel' | 'portfolio'>('overview');
  const [prices, setPrices] = useState<PriceData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('全部');
  const [btcHolding, setBtcHolding] = useState('');
  const [ethHolding, setEthHolding] = useState('');
  const [btcCost, setBtcCost] = useState('');
  const [ethCost, setEthCost] = useState('');
  const [btcTarget, setBtcTarget] = useState('');
  const [ethTarget, setEthTarget] = useState('');

  const fetchPrices = async () => {
    setPriceLoading(true);
    try {
      const [priceRes, fgRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true'),
        fetch('https://api.alternative.me/fng/')
      ]);
      const priceData = await priceRes.json();
      const fgData = await fgRes.json();
      setPrices(priceData);
      setFearGreed(fgData.data?.[0] || null);
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
    } catch (e) {
      console.error('Price fetch error:', e);
    } finally {
      setPriceLoading(false);
    }
  };

  const fetchIntel = async () => {
    setIntelLoading(true);
    try {
      const results = await Promise.all(
        RSS_SOURCES.map(url =>
          fetch(url).then(r => r.json()).catch(() => ({ items: [], feed: { title: 'News' } }))
        )
      );
      const items: IntelItem[] = results.flatMap((feed, si) =>
        (feed.items || []).slice(0, 4).map((item: any, i: number) => {
          const title = item.title || '';
          const sentiment: 'bullish' | 'bearish' | 'neutral' =
            /bull|surge|rally|rise|gain|pump|high|ath|inflow/i.test(title) ? 'bullish' :
            /bear|drop|fall|crash|sell|dump|low|outflow|fear/i.test(title) ? 'bearish' : 'neutral';
          const category: IntelItem['category'] =
            /fed|cpi|macro|inflation|rate|gdp|economy/i.test(title) ? 'Macro' :
            /etf|blackrock|fidelity|institution|fund/i.test(title) ? 'Institutional' :
            /btc|eth|sol|altcoin|token|defi|nft/i.test(title) ? 'Narrative' : 'Technical';
          return {
            id: `rss-${si}-${i}`,
            source: feed.feed?.title || 'News',
            category,
            titleCn: title,
            contentCn: item.description?.replace(/<[^>]+>/g, '').slice(0, 120) || '',
            time: item.pubDate
              ? new Date(item.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
              : '刚刚',
            sentiment,
            mediaUrl: item.enclosure?.link || item.thumbnail || undefined,
          };
        })
      );
      setIntel(items);
    } catch (e) {
      console.error('Intel fetch error:', e);
    } finally {
      setIntelLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    fetchIntel();
    const interval = setInterval(fetchPrices, 60000);
    return () => clearInterval(interval);
  }, []);

  const calcPnL = (holding: string, cost: string, currentPrice: number) => {
    const h = parseFloat(holding);
    const c = parseFloat(cost);
    if (!h || !c || !currentPrice) return null;
    const pnl = (currentPrice - c) * h;
    const pct = ((currentPrice - c) / c) * 100;
    return { pnl, pct, value: currentPrice * h };
  };

  const btcPrice = prices?.bitcoin?.usd || 0;
  const ethPrice = prices?.ethereum?.usd || 0;
  const btcChange = prices?.bitcoin?.usd_24h_change || 0;
  const ethChange = prices?.ethereum?.usd_24h_change || 0;
  const btcPnL = calcPnL(btcHolding, btcCost, btcPrice);
  const ethPnL = calcPnL(ethHolding, ethCost, ethPrice);
  const fgValue = fearGreed ? parseInt(fearGreed.value) : 0;
  const fgColor = fgValue >= 75 ? '#f43f5e' : fgValue >= 55 ? '#f97316' : fgValue >= 45 ? '#eab308' : fgValue >= 25 ? '#10b981' : '#3b82f6';
  const filteredIntel = activeCategory === '全部' ? intel : intel.filter(i =>
    activeCategory === '宏观' ? i.category === 'Macro' :
    activeCategory === '机构' ? i.category === 'Institutional' :
    activeCategory === '叙事' ? i.category === 'Narrative' : i.category === 'Technical'
  );

  const inputClass = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans">
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/8 px-5 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center">
            <Zap size={14} className="text-black" />
          </div>
          <span className="font-bold text-sm text-white tracking-tight">Cointel</span>
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
        <button onClick={() => { fetchPrices(); fetchIntel(); }} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
          <RefreshCw size={15} className={`text-slate-500 ${priceLoading ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-5 py-6 pb-12">
        <AnimatePresence mode="wait">

          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              {lastUpdated && <p className="text-[11px] text-slate-600 text-right">最后更新 {lastUpdated} · 每分钟自动刷新</p>}

              <div className="grid grid-cols-2 gap-3">
                {[
                  { symbol: 'BTC', name: 'Bitcoin', price: btcPrice, change: btcChange, vol: prices?.bitcoin?.usd_24h_vol },
                  { symbol: 'ETH', name: 'Ethereum', price: ethPrice, change: ethChange, vol: prices?.ethereum?.usd_24h_vol },
                ].map(coin => (
                  <div key={coin.symbol} className="bg-white/4 border border-white/8 rounded-2xl p-5">
                    {priceLoading ? (
                      <div className="animate-pulse space-y-3">
                        <div className="h-3 bg-white/10 rounded w-12" />
                        <div className="h-7 bg-white/10 rounded w-28" />
                        <div className="h-3 bg-white/10 rounded w-16" />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <p className="text-xs font-bold text-slate-400">{coin.symbol}</p>
                            <p className="text-[10px] text-slate-600">{coin.name}</p>
                          </div>
                          <span className={`flex items-center gap-0.5 text-xs font-bold px-2 py-0.5 rounded-lg ${coin.change >= 0 ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                            {coin.change >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%
                          </span>
                        </div>
                        <p className="text-2xl font-black text-white">${coin.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        {coin.vol && <p className="text-[10px] text-slate-600 mt-2">24h 成交量 ${(coin.vol / 1e9).toFixed(1)}B</p>}
                      </>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center gap-2">
                  <p className="text-[10px] text-slate-500">恐惧贪婪指数</p>
                  {priceLoading ? <div className="animate-pulse h-8 w-10 bg-white/10 rounded" /> : (
                    <>
                      <p className="text-3xl font-black" style={{ color: fgColor }}>{fearGreed?.value || '—'}</p>
                      <p className="text-[10px] font-semibold" style={{ color: fgColor }}>{fearGreed?.value_classification || '—'}</p>
                    </>
                  )}
                </div>
                <div className="col-span-2 bg-white/4 border border-white/8 rounded-2xl p-4">
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-2"><Activity size={10} /> 今日一句话总结</p>
                  {priceLoading ? (
                    <div className="animate-pulse space-y-2"><div className="h-3 bg-white/10 rounded w-full" /><div className="h-3 bg-white/10 rounded w-4/5" /></div>
                  ) : (
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {btcChange >= 2
                        ? `BTC 强势 +${btcChange.toFixed(1)}%，市场偏多，${fearGreed?.value_classification || ''}区间，注意阻力位附近获利了结。`
                        : btcChange <= -2
                        ? `BTC 下跌 ${btcChange.toFixed(1)}%，情绪转弱，${fearGreed?.value_classification || ''}信号，关注关键支撑位。`
                        : `BTC 窄幅整理 ${btcChange >= 0 ? '+' : ''}${btcChange.toFixed(1)}%，${fearGreed?.value_classification || ''}信号，等待方向选择。`}
                    </p>
                  )}
                </div>
              </div>

              <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-4"><Globe size={10} /> 近期宏观事件</p>
                <div className="space-y-3">
                  {MACRO_EVENTS.map((ev, i) => (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-[11px] text-slate-500 w-28 shrink-0">{ev.time}</span>
                      <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.impact === 'high' ? 'bg-rose-500' : ev.impact === 'medium' ? 'bg-amber-500' : 'bg-slate-600'}`} />
                      <span className="text-sm text-slate-200">{ev.event}</span>
                      <span className="text-[10px] text-slate-600 ml-auto">{ev.currency}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

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
                <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="animate-pulse bg-white/4 border border-white/8 rounded-2xl h-24" />)}</div>
              ) : filteredIntel.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-slate-600 gap-3">
                  <AlertCircle size={22} /><span className="text-sm">暂无该分类情报</span>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredIntel.map(item => (
                    <article key={item.id} className="group bg-white/4 border border-white/8 rounded-2xl p-4 hover:border-orange-500/40 transition-all flex gap-3">
                      <div className={`w-0.5 rounded-full shrink-0 self-stretch ${item.sentiment === 'bullish' ? 'bg-emerald-500' : item.sentiment === 'bearish' ? 'bg-rose-500' : 'bg-slate-600'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold text-orange-400">{item.source}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.category === 'Macro' ? 'bg-blue-500/15 text-blue-400' : item.category === 'Institutional' ? 'bg-purple-500/15 text-purple-400' : item.category === 'Narrative' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                            {item.category === 'Macro' ? '宏观' : item.category === 'Institutional' ? '机构' : item.category === 'Narrative' ? '叙事' : '技术'}
                          </span>
                          <span className="text-[10px] text-slate-600 ml-auto">{item.time}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-orange-400 transition-colors line-clamp-2">{item.titleCn}</h3>
                        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">{item.contentCn}</p>
                      </div>
                      {item.mediaUrl && (
                        <div className="w-16 h-14 rounded-xl overflow-hidden shrink-0 hidden sm:block">
                          <img src={item.mediaUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" referrerPolicy="no-referrer" />
                        </div>
                      )}
                    </article>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-[11px] text-slate-600">输入持仓信息，实时计算盈亏。数据仅保存在你的浏览器，不会上传。</p>
              {[
                { symbol: 'BTC', name: 'Bitcoin', price: btcPrice, change: btcChange, holding: btcHolding, setHolding: setBtcHolding, cost: btcCost, setCost: setBtcCost, target: btcTarget, setTarget: setBtcTarget, pnl: btcPnL },
                { symbol: 'ETH', name: 'Ethereum', price: ethPrice, change: ethChange, holding: ethHolding, setHolding: setEthHolding, cost: ethCost, setCost: setEthCost, target: ethTarget, setTarget: setEthTarget, pnl: ethPnL },
              ].map(coin => (
                <div key={coin.symbol} className="bg-white/4 border border-white/8 rounded-2xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-bold text-white text-sm">{coin.symbol} <span className="text-slate-500 font-normal text-xs">{coin.name}</span></p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-white">${coin.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      <p className={`text-xs font-bold ${coin.change >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.change >= 0 ? '+' : ''}{coin.change.toFixed(2)}%</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1.5">持仓数量</label>
                      <input type="number" value={coin.holding} onChange={e => coin.setHolding(e.target.value)} placeholder="0.00" className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1.5">成本价 (USD)</label>
                      <input type="number" value={coin.cost} onChange={e => coin.setCost(e.target.value)} placeholder="0" className={inputClass} />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 block mb-1.5">目标价 (USD)</label>
                      <input type="number" value={coin.target} onChange={e => coin.setTarget(e.target.value)} placeholder="0" className={inputClass} />
                    </div>
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
                          <p className={`text-sm font-bold ${coin.pnl.pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{coin.pnl.pnl >= 0 ? '+' : ''}${coin.pnl.pnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                          <p className={`text-[10px] ${coin.pnl.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{coin.pnl.pct >= 0 ? '+' : ''}{coin.pnl.pct.toFixed(1)}%</p>
                        </div>
                        <div className="bg-white/3 rounded-xl p-3">
                          <p className="text-[10px] text-slate-500 mb-1">距目标</p>
                          {coin.target && coin.price ? (
                            <>
                              <p className={`text-sm font-bold ${parseFloat(coin.target) > coin.price ? 'text-amber-400' : 'text-emerald-400'}`}>
                                {parseFloat(coin.target) > coin.price ? `差 ${(((parseFloat(coin.target) - coin.price) / coin.price) * 100).toFixed(1)}%` : '已超目标 ✓'}
                              </p>
                              <p className="text-[10px] text-slate-600">目标 ${parseFloat(coin.target).toLocaleString()}</p>
                            </>
                          ) : <p className="text-sm text-slate-600">未设定</p>}
                        </div>
                      </div>
                      <div className={`rounded-xl p-3 text-sm leading-relaxed ${coin.pnl.pct >= 20 ? 'bg-amber-500/10 border border-amber-500/20 text-amber-300' : coin.pnl.pct <= -15 ? 'bg-rose-500/10 border border-rose-500/20 text-rose-300' : 'bg-white/3 text-slate-400'}`}>
                        {coin.pnl.pct >= 20 ? '📈 盈利超 20%，可考虑分批止盈，锁定部分利润。' : coin.pnl.pct <= -15 ? '⚠️ 浮亏超 15%，评估基本面，避免情绪化操作。' : coin.pnl.pct > 0 ? '持仓盈利中，继续持有观察，关注目标价位。' : '小幅亏损，属正常波动范围，保持耐心。'}
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
