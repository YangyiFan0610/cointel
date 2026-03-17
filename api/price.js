export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const [b, e, f] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT'),
      fetch('https://api.alternative.me/fng/'),
    ]);
    const [bd, ed, fd] = await Promise.all([b.json(), e.json(), f.json()]);
    
    const fmt = (d) => ({
      price: parseFloat(d.lastPrice) || 0,
      change24h: parseFloat(d.priceChangePercent) || 0,
      high24h: parseFloat(d.highPrice) || 0,
      low24h: parseFloat(d.lowPrice) || 0,
      volume24h: parseFloat(d.quoteVolume) || 0,
    });

    return Response.json({
      btc: fmt(bd),
      eth: fmt(ed),
      fearGreed: fd?.data?.[0] ? {
        value: fd.data[0].value,
        classification: fd.data[0].value_classification,
      } : null,
      debug: { btc_raw_price: bd.lastPrice, eth_raw_price: ed.lastPrice }
    });
  } catch(err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
