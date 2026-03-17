export const config = { runtime: 'edge' };

export default async function handler(req) {
  try {
    const [b, e, f] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT'),
      fetch('https://api.alternative.me/fng/'),
    ]);
    const [bd, ed, fd] = await Promise.all([b.json(), e.json(), f.json()]);
    const fmt = d => ({
      price: +d.lastPrice,
      change24h: +d.priceChangePercent,
      high24h: +d.highPrice,
      low24h: +d.lowPrice,
      volume24h: +d.volume * +d.lastPrice,
    });
    return Response.json({
      btc: fmt(bd),
      eth: fmt(ed),
      fearGreed: fd?.data?.[0] ? {
        value: fd.data[0].value,
        classification: fd.data[0].value_classification,
      } : null,
    });
  } catch(err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
