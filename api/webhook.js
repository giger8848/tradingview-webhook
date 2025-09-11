// api/webhook.js
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://eigerbot-coin-default-rtdb.asia-southeast1.firebasedatabase.app"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const message = req.body.message || req.body.text;
      
      // TradingView 메시지 파싱
      const signal = parseSignalMessage(message);
      
      if (signal.ticker && signal.action && signal.timeframe) {
        // RTDB에 저장
        const signalsRef = ref(db, 'signals');
        const newSignalRef = push(signalsRef);
        
        await set(newSignalRef, {
          ...signal,
          timestamp: new Date().toISOString(),
          processed: false,
          id: newSignalRef.key
        });
        
        res.status(200).json({ 
          success: true, 
          signal: signal,
          id: newSignalRef.key
        });
      } else {
        res.status(400).json({ error: 'Invalid signal format' });
      }
      
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function parseSignalMessage(message) {
  const signal = {};
  
  // 종목: ETHUSD
  const tickerMatch = message.match(/종목:\s*([A-Z]+)/);
  if (tickerMatch) signal.ticker = tickerMatch[1];
  
  // 매매: buy
  const actionMatch = message.match(/매매:\s*(buy|sell)/);
  if (actionMatch) signal.action = actionMatch[1];
  
  // 주기: 50m
  const timeframeMatch = message.match(/주기:\s*([0-9]+[smh])/);
  if (timeframeMatch) signal.timeframe = timeframeMatch[1];
  
  // 가격: 3515.5
  const priceMatch = message.match(/가격:\s*([0-9]+\.?[0-9]*)/);
  if (priceMatch) signal.price = parseFloat(priceMatch[1]);
  
  return signal;
}
