// NAS100 TradingView Webhook API
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, serverTimestamp } from 'firebase/database';

// Firebase 설정
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
};

let app, database;
try {
  app = initializeApp(firebaseConfig);
  database = getDatabase(app);
} catch (error) {
  console.log('Firebase 설정 오류:', error);
}

// 메모리 저장소 (직접 방식용)
let currentSignal = null;
let signalHistory = [];
let lastSignalId = 0;

export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // POST: TradingView 웹훅 수신
  if (req.method === 'POST') {
    try {
      const { action, symbol, timeframe, price, strategy, timestamp } = req.body;
      
      console.log('NAS100 TradingView 신호 수신:', req.body);
      
      // 입력 검증
      if (!action || !symbol || !timeframe) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['action', 'symbol', 'timeframe'],
          received: Object.keys(req.body)
        });
      }

      // NAS100 전용 심볼 검증
      const validSymbols = ['NAS100', 'US100', 'NASDAQ', 'NDX'];
      const symbolUpper = symbol.toUpperCase();
      const isValidSymbol = validSymbols.some(validSym => symbolUpper.includes(validSym));
      
      if (!isValidSymbol) {
        console.log('NAS100 외 심볼 필터링:', symbol);
        return res.status(200).json({ 
          success: true,
          message: 'Signal filtered - not NAS100 related',
          symbol: symbol
        });
      }

      // 신호 ID 생성
      lastSignalId++;
      const currentTime = new Date().toISOString();
      
      // 신호 데이터 구성
      const signalData = {
        signalId: lastSignalId,
        action: action.toUpperCase(),
        symbol: symbolUpper,
        timeframe: timeframe,
        price: parseFloat(price) || null,
        strategy: strategy || 'default',
        timestamp: timestamp || currentTime,
        receivedAt: currentTime,
        processed: false,
        source: 'tradingview',
        instrument: 'NAS100'
      };

      // 1. 메모리에 저장 (직접 방식용)
      currentSignal = { ...signalData };
      signalHistory.unshift({ ...signalData });
      
      // 히스토리 크기 제한 (최근 100개만)
      if (signalHistory.length > 100) {
        signalHistory = signalHistory.slice(0, 100);
      }

      // 2. Firebase RTDB에도 저장 (RTDB 방식용)
      if (database) {
        try {
          // latest 신호 업데이트
          const latestRef = ref(database, 'nas100_signals/latest');
          await set(latestRef, signalData);

          // 히스토리에 추가
          const historyRef = ref(database, 'nas100_signals/history');
          await push(historyRef, signalData);

          console.log('Firebase RTDB 저장 완료');
        } catch (firebaseError) {
          console.error('Firebase 저장 오류:', firebaseError);
        }
      }

      // 성공 응답
      res.status(200).json({ 
        success: true, 
        signalId: signalData.signalId,
        message: 'NAS100 signal received and stored',
        data: {
          action: signalData.action,
          symbol: signalData.symbol,
          timeframe: signalData.timeframe,
          timestamp: signalData.timestamp,
          instrument: 'NAS100'
        }
      });

      console.log('NAS100 신호 처리 완료:', signalData.action, signalData.symbol, signalData.timeframe);

    } catch (error) {
      console.error('웹훅 처리 오류:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // GET: AHK에서 신호 조회 (직접 방식용)
  else if (req.method === 'GET') {
    const { endpoint, method } = req.query;
    
    try {
      if (endpoint === 'current') {
        res.status(200).json({
          success: true,
          data: currentSignal,
          method: method || 'direct',
          instrument: 'NAS100'
        });
      } 
      else if (endpoint === 'history') {
        const limit = parseInt(req.query.limit) || 10;
        res.status(200).json({
          success: true,
          data: signalHistory.slice(0, limit),
          method: method || 'direct',
          instrument: 'NAS100'
        });
      }
      else if (endpoint === 'status') {
        res.status(200).json({
          success: true,
          data: {
            totalSignals: signalHistory.length,
            lastSignal: currentSignal,
            serverTime: new Date().toISOString(),
            uptime: process.uptime(),
            firebaseEnabled: !!database,
            instrument: 'NAS100'
          },
          method: method || 'direct'
        });
      }
      else if (endpoint === 'clear') {
        currentSignal = null;
        res.status(200).json({
          success: true,
          message: 'Current NAS100 signal cleared'
        });
      }
      else {
        res.status(400).json({ 
          error: 'Invalid endpoint',
          availableEndpoints: ['current', 'history', 'status', 'clear']
        });
      }
    } catch (error) {
      console.error('GET 요청 처리 오류:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}
