import { initializeApp, getApps } from 'firebase/app';
import { getDatabase, ref, push, set } from 'firebase/database';

const firebaseConfig = {
  databaseURL: "https://eigerbot-coin-default-rtdb.asia-southeast1.firebasedatabase.app"
};

// Firebase 초기화 (중복 방지)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const db = getDatabase(app);

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    try {
      const message = req.body.content || req.body.message || req.body.text;
      
      // TradingView 메시지 파싱
      const signal = parseSignalMessage(message);
      
      if (signal.ticker && signal.action) {
        // RTDB에 저장
        const signalsRef = ref(db, 'signals');
        const newSignalRef = push(signalsRef);
        
        await set(newSignalRef, {
          ...signal,
          timestamp: new Date().toISOString(),
          processed: false,
          id: newSignalRef.key
        });
        
        console.log('신호 저장됨:', signal);
        
        res.status(200).json({ 
          success: true, 
          signal: signal,
          id: newSignalRef.key,
          message: 'Signal saved to RTDB'
        });
      } else {
        res.status(400).json({ 
          error: 'Invalid signal format',
          received: message 
        });
      }
      
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ 
        error: error.message,
        stack: error.stack 
      });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}

function parseSignalMessage(message) {
  const signal = {};
  
  // 종목 파싱: • 종목: ETHUSDT.P
  const tickerMatch = message.match(/종목:\s*([A-Z0-9.]+)/);
  if (tickerMatch) signal.ticker = tickerMatch[1];
  
  // 매매 파싱: • 매매: sell
  const actionMatch = message.match(/매매:\s*(buy|sell)/i);
  if (actionMatch) signal.action = actionMatch[1].toLowerCase();
  
  // 주기 파싱: • 주기: 1m
  const timeframeMatch = message.match(/주기:\s*([0-9]+[smh])/);
  if (timeframeMatch) signal.timeframe = timeframeMatch[1];
  
  // 가격 파싱: • 가격: 4699.11
  const priceMatch = message.match(/가격:\s*([0-9]+\.?[0-9]*)/);
  if (priceMatch) signal.price = parseFloat(priceMatch[1]);
  
  return signal;
}
