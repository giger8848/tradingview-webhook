export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'NAS100 API Ready!',
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'POST') {
    const { action, symbol, timeframe, price } = req.body;
    return res.json({
      success: true,
      received: { action, symbol, timeframe, price },
      timestamp: new Date().toISOString()
    });
  }
  
  res.status(405).json({ error: 'Method not allowed' });
}
