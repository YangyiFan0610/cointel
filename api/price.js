export default async function handler(req, res) {
  try {
    const [cgRes, fgRes] = await Promise.all([
      fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum&sparkline=false'),
      fetch('https://api.alternative.me/fng/'),
    ]);
    const coins = await cgRes.json();
    const fd = await fgRes.json();

    const btc = coins.find(c => c.id === 'bitcoin');
    const eth = coins.find(c => c.id === 'ethereum');

    res.json({
      btc: {
        price: btc.current_price,
        change24h: btc.price_change_percentage_24h,
        high24h: btc.high_24h,
        low24h: btc.low_24h,
      },
      eth: {
        price: eth.current_price,
        change24h: eth.price_change_percentage_24h,
        high24h: eth.high_24h,
        low24h: eth.low_24h,
      },
      fearGreed: fd?.data?.[0] ? {
        value: fd.data[0].value,
        classification: fd.data[0].value_classification,
      } : null,
    });
  } catch(err) {
    res.status(500).json({ error: err.message });
  }
}
