import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  TrendingUp, TrendingDown, RefreshCw, Globe, Zap,
  AlertCircle, Activity, ExternalLink, ChevronDown,
  ChevronUp, BarChart2, Info, Shield, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CoinData {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  marketCap: number;
}

interface FearGreed { value: string; classification: string; }

interface RawArticle {
  title: string;
  description: string;
  link: string;
  pubDate: string;
  enclosure?: { link: string };
  thumbnail?: string;
}

interface IntelItem {
  id: string;
  source: string;
  sourceTier: 'tier1' | 'tier2' | 'tier3';
  dimension: 'macro' | 'tech' | 'regulation' | 'institution' | 'crypto' | 'market';
  title: string;
  summary: string;
  whyBTC: string;        // AI-rule generated: why this matters to BTC
  impactScore: number;   // 1–10
  sentiment: 'bullish' | 'bearish' | 'neutral';
  time: string;
  pubDate: Date;
  imageUrl: string;
  link: string;
}

interface MacroEvent {
  time: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
  cryptoEffect: string;
}

interface RiskSignal {
  label: string;
  value: string;
  level: 'green' | 'yellow' | 'red';
  detail: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const DIMENSIONS: Record<IntelItem['dimension'], { label: string; color: string; bg: string }> = {
  macro:       { label: '宏观经济', color: 'text-blue-400',   bg: 'bg-blue-500/15' },
  tech:        { label: '科技行业', color: 'text-purple-400', bg: 'bg-purple-500/15' },
  regulation:  { label: '监管政策', color: 'text-rose-400',   bg: 'bg-rose-500/15' },
  institution: { label: '机构动向', color: 'text-teal-400',   bg: 'bg-teal-500/15' },
  crypto:      { label: '加密市场', color: 'text-amber-400',  bg: 'bg-amber-500/15' },
  market:      { label: '市场数据', color: 'text-green-400',  bg: 'bg-green-500/15' },
};

// Curated RSS sources — one working proxy per domain
const RSS_SOURCES: { url: string; name: string; tier: IntelItem['sourceTier']; dimension: IntelItem['dimension'] }[] = [
  // Macro / Finance
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.reuters.com%2Freuters%2FbusinessNews', name: 'Reuters Business', tier: 'tier1', dimension: 'macro' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.cnbc.com%2Fid%2F10000664%2Fdevice%2Frss%2Frss.html', name: 'CNBC Finance', tier: 'tier1', dimension: 'macro' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ffeeds.marketwatch.com%2Fmarketwatch%2Ftopstories%2F', name: 'MarketWatch', tier: 'tier2', dimension: 'macro' },
  // Tech
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ftechcrunch.com%2Ffeed%2F', name: 'TechCrunch', tier: 'tier2', dimension: 'tech' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fwww.technologyreview.com%2Ffeed%2F', name: 'MIT Tech Review', tier: 'tier1', dimension: 'tech' },
  // Regulation
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss%2Ftag%2Fregulation', name: 'CT Regulation', tier: 'tier2', dimension: 'regulation' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Ftheblock.co%2Frss.xml', name: 'The Block', tier: 'tier1', dimension: 'regulation' },
  // Institution
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcoindesk.com%2Farc%2Foutboundfeeds%2Frss%2F', name: 'CoinDesk', tier: 'tier1', dimension: 'institution' },
  // Crypto
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fcointelegraph.com%2Frss', name: 'CoinTelegraph', tier: 'tier1', dimension: 'crypto' },
  { url: 'https://api.rss2json.com/v1/api.json?rss_url=https%3A%2F%2Fdecrypt.co%2Ffeed', name: 'Decrypt', tier: 'tier2', dimension: 'crypto' },
];

const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=600&q=80',
  'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=600&q=80',
  'https://images.unsplash.com/photo-1605792657660-596af9009e82?w=600&q=80',
  'https://images.unsplash.com/photo-1591994843349-f415893b3a6b?w=600&q=80',
  'https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=600&q=80',
  'https://images.unsplash.com/photo-1642790551116-18e4f468c5dc?w=600&q=80',
];

const MACRO_EVENTS: MacroEvent[] = [
  { time: '今日 21:30', event: '美国 CPI 通胀数据', impact: 'high',
    description: '消费者价格指数衡量一篮子商品的价格变化，是美联储制定利率政策的核心参考。',
    cryptoEffect: '高于预期 → 降息推迟 → 美元走强 → BTC 承压。低于预期 → 降息预期升温 → 风险资产受益 → BTC 上涨。' },
  { time: '明日 02:00', event: '美联储会议纪要', impact: 'high',
    description: '详细记录上次议息会议的讨论内容，市场通过纪要判断委员们对未来利率路径的倾向。',
    cryptoEffect: '鸽派（倾向降息）→ BTC 上涨。鹰派（维持高利率）→ BTC 承压。关注"通胀"与"就业"的权衡措辞。' },
  { time: '本周五 22:00', event: '非农就业人数', impact: 'high',
    description: '美国非农部门新增就业人数，数据越强代表经济越热，降息越远。',
    cryptoEffect: '强劲数据 → 降息推迟 → BTC 短期承压。疲软数据 → 降息预期升 → 流动性宽松预期 → BTC 受益。' },
  { time: '下周二 21:30', event: '美国 PPI 数据', impact: 'medium',
    description: '生产者价格指数，衡量生产端通胀，是 CPI 的先行指标。',
    cryptoEffect: 'PPI 上行预示 CPI 后续可能跟涨，间接对加密市场形成压力，但市场反应通常弱于 CPI。' },
];

// ─── Scoring Engine ──────────────────────────────────────────────────────────

// Keywords that signal BTC impact with weights
const BULLISH_SIGNALS: [RegExp, number][] = [
  [/etf.*approv|approv.*etf/i, 3],
  [/inflow|institutional.*buy|accumulat/i, 2],
  [/rate.*cut|cut.*rate|pivot|dovish/i, 2],
  [/inflation.*cool|cpi.*below|lower.*inflation/i, 2],
  [/bitcoin.*reserve|strategic.*reserve/i, 3],
  [/bull|surge|rally|ath|record.*high/i, 1],
  [/microstrategy.*buy|blackrock.*bitcoin/i, 2],
  [/deregulat|crypto.*friendly|approve.*crypto/i, 2],
];

const BEARISH_SIGNALS: [RegExp, number][] = [
  [/ban|crack.*down|restrict|prohibit/i, 3],
  [/hack|exploit|stolen|breach/i, 2],
  [/rate.*hike|hike.*rate|hawkish/i, 2],
  [/inflation.*rise|cpi.*above|higher.*inflation/i, 2],
  [/sec.*sue|lawsuit|penalty.*crypto/i, 2],
  [/crash|collapse|dump|bear/i, 1],
  [/outflow|sell.*off|liquidat/i, 2],
  [/recession|gdp.*shrink|unemployment.*rise/i, 1],
];

// Keywords that increase relevance to crypto/BTC
const BTC_RELEVANCE: [RegExp, number][] = [
  [/bitcoin|btc/i, 3],
  [/crypto|cryptocurrency/i, 2],
  [/federal reserve|fed |fomc/i, 2],
  [/inflation|cpi|interest rate/i, 2],
  [/etf|institutional/i, 2],
  [/nasdaq|s&p|stock market/i, 1],
  [/dollar|dxy|usd/i, 1],
  [/ai |artificial intelligence/i, 1],
  [/regulation|sec |legal/i, 2],
  [/whale|on.chain|blockchain/i, 2],
];

// Why-BTC templates keyed to signal patterns
const WHY_BTC_TEMPLATES: { pattern: RegExp; bullish: string; bearish: string }[] = [
  { pattern: /federal reserve|fed |fomc|rate|interest/i,
    bullish: '降息预期升温 → 流动性宽松 → 风险资产受益，BTC 历史上在降息周期表现强势。',
    bearish: '利率维持高位 → 资金成本上升 → 风险资产承压，BTC 短期面临抛压。' },
  { pattern: /inflation|cpi|ppi/i,
    bullish: '通胀降温 → 美联储降息空间扩大 → 美元走弱 → BTC 作为抗通胀资产受益。',
    bearish: '通胀升温 → 降息推迟 → 美元走强 → BTC 承压，关注关键支撑位。' },
  { pattern: /etf|blackrock|fidelity|institution/i,
    bullish: '机构资金持续流入 → 需求侧增加 → BTC 供需结构改善，看多信号。',
    bearish: '机构资金流出 → 买方力量减弱 → BTC 短期缺乏上涨动力。' },
  { pattern: /regulation|sec|legal|ban|law/i,
    bullish: '监管明朗化 → 合规资金入场障碍降低 → 机构配置意愿上升。',
    bearish: '监管收紧 → 合规成本上升 → 市场情绪恶化，短期看跌。' },
  { pattern: /nasdaq|s&p|stock|equity/i,
    bullish: '股市走强 → 市场风险偏好上升 → 资金流向高风险资产，BTC 受益。',
    bearish: '股市下跌 → 避险情绪上升 → 流动性收缩，BTC 跟随下行。' },
  { pattern: /ai |artificial intelligence|tech/i,
    bullish: '科技领域突破 → 区块链/Web3 技术预期升温 → 加密板块整体受益。',
    bearish: '科技监管收紧 → 数字资产监管预期升温 → 市场情绪谨慎。' },
];

function scoreArticle(title: string, summary: string, sourceTier: IntelItem['sourceTier'], dimension: IntelItem['dimension']): {
  impactScore: number;
  sentiment: IntelItem['sentiment'];
  whyBTC: string;
} {
  const text = `${title} ${summary}`;

  // Relevance to BTC
  let relevance = 0;
  BTC_RELEVANCE.forEach(([re, w]) => { if (re.test(text)) relevance += w; });

  // Bullish / bearish scores
  let bullishScore = 0, bearishScore = 0;
  BULLISH_SIGNALS.forEach(([re, w]) => { if (re.test(text)) bullishScore += w; });
  BEARISH_SIGNALS.forEach(([re, w]) => { if (re.test(text)) bearishScore += w; });

  // Source tier bonus
  const tierBonus = sourceTier === 'tier1' ? 1.5 : sourceTier === 'tier2' ? 1.2 : 1;

  // Dimension bonus — macro & regulation matter more
  const dimBonus = dimension === 'macro' || dimension === 'regulation' ? 1.3 :
                   dimension === 'institution' ? 1.2 : 1;

  // Has specific numbers (percentages, dollar amounts) → more concrete
  const hasNumbers = /\d+(\.\d+)?%|\$\d+[bmk]?/i.test(text) ? 1 : 0;

  const rawScore = (relevance + Math.max(bullishScore, bearishScore) + hasNumbers) * tierBonus * dimBonus;
  const impactScore = Math.min(10, Math.max(1, Math.round(rawScore)));

  const sentiment: IntelItem['sentiment'] =
    bullishScore > bearishScore ? 'bullish' :
    bearishScore > bullishScore ? 'bearish' : 'neutral';

  // Generate why-BTC explanation
  let whyBTC = '';
  for (const t of WHY_BTC_TEMPLATES) {
    if (t.pattern.test(text)) {
      whyBTC = sentiment === 'bullish' ? t.bullish : sentiment === 'bearish' ? t.bearish : '';
      break;
    }
  }
  if (!whyBTC) {
    whyBTC = sentiment === 'bullish'
      ? '正面信号可能带动市场情绪改善，关注 BTC 量价配合。'
      : sentiment === 'bearish'
      ? '负面信号可能抑制风险偏好，BTC 短期注意防守。'
      : '中性信息，持续观察后续发展对市场的传导效果。';
  }

  return { impactScore, sentiment, whyBTC };
}

// ─── TradingView Widget ───────────────────────────────────────────────────────

function TradingViewChart({ symbol }: { symbol: 'BTC' | 'ETH' }) {
  const id = `tv-${symbol}-${Date.now()}`;
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    ref.current.innerHTML = '';
    const s = document.createElement('script');
    s.src = 'https://s3.tradingview.com/tv.js';
    s.async = true;
    s.onload = () => {
      if ((window as any).TradingView && ref.current) {
        new (window as any).TradingView.widget({
          container_id: ref.current.id,
          symbol: `BINANCE:${symbol}USDT`,
          interval: '60', timezone: 'Asia/Shanghai',
          theme: 'dark', style: '1', locale: 'zh_CN',
          toolbar_bg: '#0a0a0a', enable_publishing: false,
          hide_top_toolbar: false, save_image: false,
          studies: ['RSI@tv-basicstudies', 'MACD@tv-basicstudies'],
          width: '100%', height: 500,
          backgroundColor: '#0a0a0a',
        });
      }
    };
    document.head.appendChild(s);
    return () => { try { document.head.removeChild(s); } catch {} };
  }, [symbol]);
  return <div ref={ref} id={id} className="w-full rounded-xl overflow-hidden" style={{ height: 500 }} />;
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'chart' | 'intel' | 'portfolio'>('overview');
  const [chartSymbol, setChartSymbol] = useState<'BTC' | 'ETH'>('BTC');

  // Prices
  const [btc, setBtc] = useState<CoinData | null>(null);
  const [eth, setEth] = useState<CoinData | null>(null);
  const [fearGreed, setFearGreed] = useState<FearGreed | null>(null);
  const [priceLoading, setPriceLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState('');

  // Intel
  const [intel, setIntel] = useState<IntelItem[]>([]);
  const [intelLoading, setIntelLoading] = useState(true);
  const [activeDimension, setActiveDimension] = useState<string>('全部');
  const [sortBy, setSortBy] = useState<'score' | 'time'>('score');
  const [intelStats, setIntelStats] = useState({ total: 0, bullish: 0, bearish: 0, avgScore: 0 });

  // Risk signals
  const [riskSignals, setRiskSignals] = useState<RiskSignal[]>([]);

  // UI state
  const [expandedMacro, setExpandedMacro] = useState<number | null>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // Portfolio
  const [holdings, setHoldings] = useState({ btcAmt: '', btcCost: '', btcTarget: '', ethAmt: '', ethCost: '', ethTarget: '' });

  // ── Fetch Prices ──────────────────────────────────────────────────────────
  const fetchPrices = useCallback(async () => {
    try {
      const [cgRes, fgRes] = await Promise.all([
        fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&order=market_cap_desc&sparkline=false'),
        fetch('https://api.alternative.me/fng/'),
      ]);
      if (!cgRes.ok) throw new Error('CoinGecko error');
      const coins = await cgRes.json();
      const fgData = await fgRes.json().catch(() => null);

      const toData = (c: any): CoinData => ({
        price: c.current_price, change24h: c.price_change_percentage_24h,
        high24h: c.high_24h, low24h: c.low_24h,
        volume24h: c.total_volume, marketCap: c.market_cap,
      });

      const btcRaw = coins.find((c: any) => c.id === 'bitcoin');
      const ethRaw = coins.find((c: any) => c.id === 'ethereum');
      if (btcRaw) setBtc(toData(btcRaw));
      if (ethRaw) setEth(toData(ethRaw));
      if (fgData?.data?.[0]) setFearGreed({ value: fgData.data[0].value, classification: fgData.data[0].value_classification });
      setLastUpdated(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setPriceLoading(false);
    } catch (e) {
      console.error('Price error:', e);
      setPriceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrices();
    const iv = setInterval(fetchPrices, 30000);
    return () => clearInterval(iv);
  }, [fetchPrices]);

  // ── Fetch & Score Intel ───────────────────────────────────────────────────
  const fetchIntel = useCallback(async () => {
    setIntelLoading(true);
    try {
      const results = await Promise.allSettled(
        RSS_SOURCES.map(src =>
          fetch(src.url, { signal: AbortSignal.timeout(8000) })
            .then(r => r.json())
            .then(d => ({ ...d, _src: src }))
        )
      );

      const items: IntelItem[] = [];
      results.forEach((res, idx) => {
        if (res.status !== 'fulfilled') return;
        const feed = res.value;
        const src = RSS_SOURCES[idx];
        (feed.items || []).slice(0, 4).forEach((raw: RawArticle, i: number) => {
          const plainSummary = raw.description?.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim().slice(0, 200) || '';
          const { impactScore, sentiment, whyBTC } = scoreArticle(raw.title || '', plainSummary, src.tier, src.dimension);

          // Filter: only keep items with meaningful BTC relevance (score >= 3)
          if (impactScore < 3) return;

          const rawImg = raw.enclosure?.link || raw.thumbnail || '';
          const imageUrl = rawImg?.startsWith('http') ? rawImg : FALLBACK_IMAGES[(idx * 4 + i) % FALLBACK_IMAGES.length];

          items.push({
            id: `${idx}-${i}`,
            source: src.name,
            sourceTier: src.tier,
            dimension: src.dimension,
            title: raw.title || '',
            summary: plainSummary.slice(0, 160),
            whyBTC,
            impactScore,
            sentiment,
            time: raw.pubDate ? new Date(raw.pubDate).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '刚刚',
            pubDate: raw.pubDate ? new Date(raw.pubDate) : new Date(),
            imageUrl,
            link: raw.link || '#',
          });
        });
      });

      // Sort by score descending by default
      items.sort((a, b) => b.impactScore - a.impactScore);
      setIntel(items);

      // Stats
      const bullish = items.filter(i => i.sentiment === 'bullish').length;
      const bearish = items.filter(i => i.sentiment === 'bearish').length;
      const avgScore = items.length ? Math.round(items.reduce((s, i) => s + i.impactScore, 0) / items.length * 10) / 10 : 0;
      setIntelStats({ total: items.length, bullish, bearish, avgScore });

      // Build risk signals from intel
      buildRiskSignals(items);
    } catch (e) {
      console.error('Intel error:', e);
    } finally {
      setIntelLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIntel();
    const iv = setInterval(fetchIntel, 5 * 60 * 1000);
    return () => clearInterval(iv);
  }, [fetchIntel]);

  // ── Risk Signal Builder ───────────────────────────────────────────────────
  const buildRiskSignals = (items: IntelItem[]) => {
    const high = items.filter(i => i.impactScore >= 7);
    const macroRisk = items.filter(i => i.dimension === 'macro' && i.sentiment === 'bearish').length;
    const regRisk = items.filter(i => i.dimension === 'regulation' && i.sentiment === 'bearish').length;
    const instBull = items.filter(i => i.dimension === 'institution' && i.sentiment === 'bullish').length;

    setRiskSignals([
      {
        label: '宏观环境',
        value: macroRisk >= 2 ? '偏空' : macroRisk === 1 ? '中性' : '偏多',
        level: macroRisk >= 2 ? 'red' : macroRisk === 1 ? 'yellow' : 'green',
        detail: macroRisk >= 2 ? `检测到 ${macroRisk} 条偏空宏观信号，关注美元与利率走势。` : '宏观环境暂无重大利空，流动性环境相对中性。',
      },
      {
        label: '监管风险',
        value: regRisk >= 1 ? '需关注' : '暂无风险',
        level: regRisk >= 2 ? 'red' : regRisk === 1 ? 'yellow' : 'green',
        detail: regRisk >= 1 ? `发现 ${regRisk} 条监管相关负面信号，可能影响市场情绪。` : '当前无重大监管利空消息。',
      },
      {
        label: '机构动向',
        value: instBull >= 2 ? '积极买入' : instBull === 1 ? '小幅流入' : '观望',
        level: instBull >= 2 ? 'green' : instBull === 1 ? 'yellow' : 'yellow',
        detail: instBull >= 1 ? `检测到 ${instBull} 条机构买入信号，ETF 资金流向偏正面。` : '机构动向暂不明朗，等待更多数据确认。',
      },
      {
        label: '高影响信号',
        value: `${high.length} 条`,
        level: high.some(i => i.sentiment === 'bearish') ? 'red' : high.length > 0 ? 'yellow' : 'green',
        detail: high.length > 0 ? `当前有 ${high.length} 条高影响信号，其中${high.filter(i => i.sentiment === 'bullish').length}条看涨，${high.filter(i => i.sentiment === 'bearish').length}条看跌。` : '暂无高影响信号，市场处于平静期。',
      },
    ]);
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const fgVal = fearGreed ? parseInt(fearGreed.value) : 50;
  const fgColor = fgVal >= 75 ? '#f43f5e' : fgVal >= 55 ? '#f97316' : fgVal >= 45 ? '#eab308' : fgVal >= 25 ? '#10b981' : '#3b82f6';

  const overallSentiment = intelStats.bullish > intelStats.bearish ? 'bullish' :
    intelStats.bearish > intelStats.bullish ? 'bearish' : 'neutral';

  const summaryDetails = btc ? [
    { label: '价格动能', value: Math.abs(btc.change24h) >= 3 ? (btc.change24h > 0 ? '强势上涨，短线偏多' : '明显下跌，短线偏空') : '窄幅整理，方向待定', color: btc.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400' },
    { label: '日内区间', value: `$${btc.low24h.toLocaleString()} – $${btc.high24h.toLocaleString()}`, color: 'text-slate-300' },
    { label: '市场情绪', value: fearGreed ? `${fearGreed.value} · ${fearGreed.classification}` : '—', color: fgVal >= 60 ? 'text-rose-400' : fgVal >= 40 ? 'text-amber-400' : 'text-emerald-400' },
    { label: '情报信号', value: overallSentiment === 'bullish' ? `看涨信号领先 (${intelStats.bullish}↑ vs ${intelStats.bearish}↓)` : overallSentiment === 'bearish' ? `看跌信号领先 (${intelStats.bearish}↓ vs ${intelStats.bullish}↑)` : '多空信号平衡', color: overallSentiment === 'bullish' ? 'text-emerald-400' : overallSentiment === 'bearish' ? 'text-rose-400' : 'text-amber-400' },
    { label: '24H 成交量', value: `$${(btc.volume24h / 1e9).toFixed(1)}B`, color: 'text-slate-300' },
    { label: '操作建议', value: btc.change24h >= 3 ? '注意高位阻力，可分批止盈' : btc.change24h <= -3 ? '关注支撑位，控制仓位' : '等待方向确认，轻仓观望', color: 'text-orange-400' },
  ] : [];

  const filteredIntel = (activeDimension === '全部' ? intel : intel.filter(i => DIMENSIONS[i.dimension].label === activeDimension))
    .sort((a, b) => sortBy === 'score' ? b.impactScore - a.impactScore : b.pubDate.getTime() - a.pubDate.getTime());

  const calcPnL = (amt: string, cost: string, price: number) => {
    const a = parseFloat(amt), c = parseFloat(cost);
    if (!a || !c || !price) return null;
    return { pnl: (price - c) * a, pct: ((price - c) / c) * 100, value: price * a };
  };
  const btcPnL = calcPnL(holdings.btcAmt, holdings.btcCost, btc?.price || 0);
  const ethPnL = calcPnL(holdings.ethAmt, holdings.ethCost, eth?.price || 0);

  const inputCls = "w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-orange-500/50 transition-colors";

  const levelColor = (l: RiskSignal['level']) =>
    l === 'green' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
    l === 'yellow' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' :
    'text-rose-400 bg-rose-500/10 border-rose-500/20';

  // ── Price Card ────────────────────────────────────────────────────────────
  const PriceCard = ({ sym, data }: { sym: string; data: CoinData }) => {
    const pct = data.high24h > data.low24h ? ((data.price - data.low24h) / (data.high24h - data.low24h)) * 100 : 50;
    return (
      <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
        <div className="flex items-start justify-between mb-2">
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
        <div className="mb-2">
          <div className="h-1.5 bg-white/8 rounded-full overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-500 opacity-30 rounded-full" />
            <div className="absolute top-0 h-full w-1.5 bg-white rounded-full" style={{ left: `calc(${Math.min(Math.max(pct, 2), 98)}% - 3px)` }} />
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-200 font-sans">

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0a0a0a]/95 backdrop-blur border-b border-white/8 px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 bg-orange-500 rounded-lg flex items-center justify-center shrink-0">
            <Zap size={14} className="text-black" />
          </div>
          <span className="font-bold text-sm text-white">Cointel</span>
          {lastUpdated && <span className="text-[10px] text-slate-600 hidden sm:block">· {lastUpdated}</span>}
        </div>
        <nav className="flex bg-white/5 rounded-xl p-1 gap-0.5">
          {[
            { id: 'overview', label: '概览' },
            { id: 'chart',    label: 'K线' },
            { id: 'intel',    label: '情报' },
            { id: 'portfolio',label: '持仓' },
          ].map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeTab === tab.id ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'}`}>
              {tab.label}
            </button>
          ))}
        </nav>
        <button onClick={() => { fetchPrices(); fetchIntel(); }} className="p-2 hover:bg-white/5 rounded-lg">
          <RefreshCw size={15} className={`text-slate-500 ${(priceLoading || intelLoading) ? 'animate-spin' : ''}`} />
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 pb-12">
        <AnimatePresence mode="wait">

          {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
          {activeTab === 'overview' && (
            <motion.div key="overview" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Prices */}
              {priceLoading ? (
                <div className="grid grid-cols-2 gap-3">
                  {[0,1].map(i => <div key={i} className="animate-pulse bg-white/4 border border-white/8 rounded-2xl p-5 h-40" />)}
                </div>
              ) : btc && eth ? (
                <div className="grid grid-cols-2 gap-3">
                  <PriceCard sym="BTC" data={btc} />
                  <PriceCard sym="ETH" data={eth} />
                </div>
              ) : (
                <div className="bg-white/4 border border-white/8 rounded-2xl p-5 text-center text-slate-500 text-sm">
                  价格加载失败，请点击右上角刷新
                </div>
              )}

              {/* Fear & Greed + Interactive Summary */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/4 border border-white/8 rounded-2xl p-4 flex flex-col items-center justify-center gap-1.5">
                  <p className="text-[10px] text-slate-500">恐惧贪婪</p>
                  {fearGreed
                    ? <><p className="text-4xl font-black" style={{ color: fgColor }}>{fearGreed.value}</p>
                       <p className="text-[10px] font-semibold" style={{ color: fgColor }}>{fearGreed.classification}</p></>
                    : <div className="animate-pulse h-10 w-10 bg-white/10 rounded-full" />}
                </div>

                <div className="col-span-2 bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                  <button className="w-full p-4 text-left hover:bg-white/3 transition-colors" onClick={() => setSummaryExpanded(e => !e)}>
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] text-slate-500 flex items-center gap-1.5"><Activity size={10} /> 今日综合判断</p>
                      <span className="text-[10px] text-slate-600 flex items-center gap-0.5">
                        {summaryExpanded ? <><ChevronUp size={11} />收起</> : <><ChevronDown size={11} />展开</>}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">
                      {btc
                        ? `BTC ${btc.change24h >= 0 ? '+' : ''}${btc.change24h.toFixed(2)}%，日内区间 $${btc.low24h.toLocaleString()} – $${btc.high24h.toLocaleString()}。情报信号 ${overallSentiment === 'bullish' ? '看涨偏多' : overallSentiment === 'bearish' ? '看跌偏空' : '多空平衡'}（${intelStats.bullish}↑ ${intelStats.bearish}↓）。`
                        : '数据加载中...'}
                    </p>
                  </button>
                  <AnimatePresence>
                    {summaryExpanded && btc && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
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

              {/* Risk Dashboard */}
              {riskSignals.length > 0 && (
                <div className="bg-white/4 border border-white/8 rounded-2xl p-5">
                  <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mb-4"><Shield size={10} /> 风险信号看板</p>
                  <div className="grid grid-cols-2 gap-3">
                    {riskSignals.map((sig, i) => (
                      <div key={i} className={`rounded-xl p-3 border ${levelColor(sig.level)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[10px] font-medium opacity-70">{sig.label}</p>
                          <div className={`w-2 h-2 rounded-full ${sig.level === 'green' ? 'bg-emerald-500' : sig.level === 'yellow' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                        </div>
                        <p className="text-sm font-bold">{sig.value}</p>
                        <p className="text-[10px] opacity-60 mt-0.5 leading-snug">{sig.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Macro Events */}
              <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden">
                <div className="px-5 py-3.5 flex items-center gap-2 border-b border-white/5">
                  <Globe size={11} className="text-slate-500" />
                  <p className="text-[11px] text-slate-500 font-medium">近期宏观事件</p>
                  <span className="ml-auto text-[9px] text-slate-600">点击查看影响分析</span>
                </div>
                <div className="divide-y divide-white/5">
                  {MACRO_EVENTS.map((ev, i) => (
                    <div key={i}>
                      <button className="w-full px-5 py-3 flex items-center gap-3 hover:bg-white/3 transition-colors text-left"
                        onClick={() => setExpandedMacro(expandedMacro === i ? null : i)}>
                        <span className="text-[11px] text-slate-500 w-24 shrink-0">{ev.time}</span>
                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${ev.impact === 'high' ? 'bg-rose-500' : ev.impact === 'medium' ? 'bg-amber-500' : 'bg-slate-600'}`} />
                        <span className="text-sm text-slate-200 flex-1">{ev.event}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${ev.impact === 'high' ? 'bg-rose-500/15 text-rose-400' : ev.impact === 'medium' ? 'bg-amber-500/15 text-amber-400' : 'bg-slate-500/15 text-slate-400'}`}>
                          {ev.impact === 'high' ? '高' : ev.impact === 'medium' ? '中' : '低'}
                        </span>
                        {expandedMacro === i ? <ChevronUp size={13} className="text-slate-600 shrink-0" /> : <ChevronDown size={13} className="text-slate-600 shrink-0" />}
                      </button>
                      <AnimatePresence>
                        {expandedMacro === i && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.18 }} className="overflow-hidden">
                            <div className="px-5 pb-4 space-y-2">
                              <div className="bg-white/3 rounded-xl p-3">
                                <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-1"><Info size={9} /> 事件说明</p>
                                <p className="text-sm text-slate-300 leading-relaxed">{ev.description}</p>
                              </div>
                              <div className="bg-orange-500/8 border border-orange-500/20 rounded-xl p-3">
                                <p className="text-[10px] text-orange-400 flex items-center gap-1 mb-1"><BarChart2 size={9} /> 对 BTC 的影响</p>
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

          {/* ══ CHART ═════════════════════════════════════════════════════════ */}
          {activeTab === 'chart' && (
            <motion.div key="chart" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex bg-white/5 rounded-xl p-1 gap-1">
                  {(['BTC', 'ETH'] as const).map(s => (
                    <button key={s} onClick={() => setChartSymbol(s)}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${chartSymbol === s ? 'bg-orange-500 text-black' : 'text-slate-400 hover:text-white'}`}>
                      {s}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-slate-600">含 RSI · MACD · Binance 数据</span>
              </div>
              <div className="bg-white/4 border border-white/8 rounded-2xl overflow-hidden p-2">
                <TradingViewChart symbol={chartSymbol} />
              </div>
              {btc && eth && (
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '当前价格', value: `$${(chartSymbol === 'BTC' ? btc : eth).price.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-white' },
                    { label: '24H 最高', value: `$${(chartSymbol === 'BTC' ? btc : eth).high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-emerald-400' },
                    { label: '24H 最低', value: `$${(chartSymbol === 'BTC' ? btc : eth).low24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, color: 'text-rose-400' },
                  ].map((s, i) => (
                    <div key={i} className="bg-white/4 border border-white/8 rounded-xl p-3">
                      <p className="text-[10px] text-slate-500 mb-1">{s.label}</p>
                      <p className={`text-sm font-bold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ INTEL ═════════════════════════════════════════════════════════ */}
          {activeTab === 'intel' && (
            <motion.div key="intel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">

              {/* Stats bar */}
              {!intelLoading && intel.length > 0 && (
                <div className="flex items-center gap-3 bg-white/4 border border-white/8 rounded-xl px-4 py-2.5 text-xs">
                  <span className="text-slate-500">共 <span className="text-white font-bold">{intelStats.total}</span> 条有效信号</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-emerald-400 font-bold">{intelStats.bullish} 看涨</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-rose-400 font-bold">{intelStats.bearish} 看跌</span>
                  <span className="text-slate-700">·</span>
                  <span className="text-slate-500">均分 <span className="text-amber-400 font-bold">{intelStats.avgScore}</span>/10</span>
                  <span className="ml-auto text-[10px] text-slate-600">低于3分已过滤</span>
                </div>
              )}

              {/* Filters */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1.5 flex-wrap">
                  <button onClick={() => setActiveDimension('全部')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDimension === '全部' ? 'bg-orange-500 text-black' : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                    全部
                  </button>
                  {Object.values(DIMENSIONS).map(d => (
                    <button key={d.label} onClick={() => setActiveDimension(d.label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${activeDimension === d.label ? `${d.bg} ${d.color}` : 'bg-white/5 text-slate-400 hover:text-white'}`}>
                      {d.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setSortBy('score')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${sortBy === 'score' ? 'bg-white/15 text-white' : 'text-slate-600 hover:text-white'}`}>
                    按影响力
                  </button>
                  <button onClick={() => setSortBy('time')}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${sortBy === 'time' ? 'bg-white/15 text-white' : 'text-slate-600 hover:text-white'}`}>
                    按时间
                  </button>
                  <button onClick={fetchIntel} className="ml-1 p-1.5 hover:bg-white/5 rounded transition-colors">
                    <RefreshCw size={11} className={`text-slate-500 ${intelLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>

              {intelLoading ? (
                <div className="space-y-4">
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
                  <AlertCircle size={22} /><span className="text-sm">暂无有效信号</span>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIntel.map(item => {
                    const dim = DIMENSIONS[item.dimension];
                    return (
                      <article key={item.id} className="group bg-white/4 border border-white/8 rounded-2xl overflow-hidden hover:border-orange-500/40 transition-all">
                        {/* Image */}
                        <div className="h-44 overflow-hidden relative">
                          <img src={item.imageUrl} alt="" onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMAGES[0]; }}
                            className="w-full h-full object-cover opacity-75 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500" referrerPolicy="no-referrer" />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/20 to-transparent" />
                          {/* Badges */}
                          <div className="absolute bottom-3 left-4 flex items-center gap-2">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${dim.bg} ${dim.color}`}>{dim.label}</span>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${item.sentiment === 'bullish' ? 'bg-emerald-500/20 text-emerald-400' : item.sentiment === 'bearish' ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-slate-400'}`}>
                              {item.sentiment === 'bullish' ? '看涨' : item.sentiment === 'bearish' ? '看跌' : '中性'}
                            </span>
                          </div>
                          {/* Impact score */}
                          <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-lg px-2 py-1">
                            <Cpu size={9} className="text-amber-400" />
                            <span className="text-[10px] font-black text-amber-400">{item.impactScore}/10</span>
                          </div>
                        </div>

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
                            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 mb-3">{item.summary}</p>
                          )}
                          {/* Why BTC — the key insight */}
                          <div className={`rounded-xl p-2.5 ${item.sentiment === 'bullish' ? 'bg-emerald-500/8 border border-emerald-500/20' : item.sentiment === 'bearish' ? 'bg-rose-500/8 border border-rose-500/20' : 'bg-white/4 border border-white/8'}`}>
                            <p className={`text-[9px] font-bold mb-1 ${item.sentiment === 'bullish' ? 'text-emerald-500' : item.sentiment === 'bearish' ? 'text-rose-500' : 'text-slate-500'}`}>
                              对 BTC 的影响
                            </p>
                            <p className="text-[11px] text-slate-300 leading-relaxed">{item.whyBTC}</p>
                          </div>
                          <a href={item.link} target="_blank" rel="noreferrer"
                            className="mt-2.5 flex items-center gap-1 text-[10px] text-slate-600 hover:text-orange-400 transition-colors">
                            <ExternalLink size={9} /> 阅读原文
                          </a>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* ══ PORTFOLIO ═════════════════════════════════════════════════════ */}
          {activeTab === 'portfolio' && (
            <motion.div key="portfolio" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
              <p className="text-[11px] text-slate-600">数据只保存在浏览器，不会上传。</p>
              {[
                { sym: 'BTC', name: 'Bitcoin', data: btc,
                  amt: holdings.btcAmt, cost: holdings.btcCost, target: holdings.btcTarget, pnl: btcPnL,
                  setAmt: (v: string) => setHoldings(h => ({ ...h, btcAmt: v })),
                  setCost: (v: string) => setHoldings(h => ({ ...h, btcCost: v })),
                  setTarget: (v: string) => setHoldings(h => ({ ...h, btcTarget: v })),
                },
                { sym: 'ETH', name: 'Ethereum', data: eth,
                  amt: holdings.ethAmt, cost: holdings.ethCost, target: holdings.ethTarget, pnl: ethPnL,
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
                          高 <span className="text-emerald-400">${coin.data.high24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
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
                      { label: '成本价 USD', val: coin.cost, set: coin.setCost, ph: '0' },
                      { label: '目标价 USD', val: coin.target, set: coin.setTarget, ph: '0' },
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
                          <p className={`text-[10px] ${coin.pnl.pnl >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                            {coin.pnl.pct >= 0 ? '+' : ''}{coin.pnl.pct.toFixed(1)}%
                          </p>
                        </div>
                        <div className="bg-white/3 rounded-xl p-3">
                          <p className="text-[10px] text-slate-500 mb-1">距目标</p>
                          {coin.target && coin.data?.price ? (
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
