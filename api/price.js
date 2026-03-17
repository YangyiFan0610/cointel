export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 's-maxage=5');
  try {
    const [b, e, f] = await Promise.all([
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT'),
      fetch('https://api.binance.com/api/v3/ticker/24hr?symbol=ETHUSDT'),
      fetch('https://api.alternative.me/fng/'),
    ]);
    const [bd, ed, fd] = await Promise.all([b.json(), e.json(), f.json()]);
    const fmt = d => ({ price: +d.lastPrice, change24h: +d.priceChangePercent, high24h: +d.highPrice, low24h: +d.lowPrice, volume24h: +d.volume * +d.lastPrice });
    res.status(200).json({ btc: fmt(bd), eth: fmt(ed), fearGreed: fd?.data?.[0] ? { value: fd.data[0].value, classification: fd.data[0].value_classification } : null });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
