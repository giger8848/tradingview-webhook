export default async function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  if (req.method === 'GET') {
    return res.json({
      status: 'active',
      message: 'TradingView → Vercel → Firebase → AutoHotkey',
      timestamp: new Date().toISOString()
    });
  }
  
  if (req.method === 'POST') {
    const signal = req.body;
    
    if (!signal.symbol || !signal.action) {
      return res.status(400).json({ error: 'Missing symbol or action' });
    }
    
    // Firebase RTDB에 신호 저장
    const firebaseUrl = process.env.FIREBASE_URL || 'https://tradingview-signals-default-rtdb.firebaseio.com';
    
    try {
      const response = await fetch(`${firebaseUrl}/signals.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...signal,
          timestamp: new Date().toISOString(),
          source: 'vercel'
        })
      });
      
      if (response.ok) {
        return res.json({ 
          status: 'success', 
          message: 'Signal saved to Firebase' 
        });
      } else {
        throw new Error(`Firebase error: ${response.status}`);
      }
      
    } catch (error) {
      return res.status(500).json({ 
        error: 'Firebase connection failed',
        message: error.message 
      });
    }
  }
  
  return res.status(405).json({ error: 'Method not allowed' });
}
