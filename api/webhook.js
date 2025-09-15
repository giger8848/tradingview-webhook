// NAS100 TradingView Webhook API - 간단 버전
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 메모리 저장소
  if (!global.currentSignal) {
    global.currentSignal = null;
    global.signalHistory = [];
    global.lastSignalId = 0;
  }

  // GET 요청 처리
  if (req.method === 'GET') {
    const { endpoint } = req.query;
    
    console.log('GET 요청 수신:', endpoint);
    
    try {
      if (endpoint === 'status') {
        return res.status(200).json({
          success: true,
          message: 'NAS100 API is running!',
          data: {
            totalSignals: global.signalHistory.length,
            lastSignal: global.currentSignal,
            serverTime: new Date().toISOString(),
            instrument: 'NAS100',
            version: '1.0'
          }
        });
      }
      else if (endpoint === 'current') {
        return res.status(200).json({
          success: true,
          data: global.currentSignal,
          instrument: 'NAS100'
        });
      }
      else if (endpoint === 'history') {
        const limit = parseInt(req.query.limit) || 10;
        return res.status(200).json({
          success: true,
          data: global.signalHistory.slice(0, limit),
          instrument: 'NAS100'
        });
      }
      else if (endpoint === 'clear') {
        global.currentSignal = null;
        return res.status(200).json({
          success: true,
          message: 'Current signal cleared'
        });
      }
      else {
        return res.status(200).json({
          success: true,
          message: 'NAS100 TradingView Webhook API',
          endpoints: ['status', 'current', 'history', 'clear'],
          usage: {
            status: '?endpoint=status',
            current: '?endpoint=current',
            history: '?endpoint=history&limit=5',
            clear: '?endpoint=clear'
          }
        });
      }
    } catch (error) {
      console.error('GET 처리 오류:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // POST 요청 처리 (TradingView 웹훅)
  else if (req.method === 'POST') {
    try {
      const { action, symbol, timeframe, price, strategy, timestamp } = req.body;
      
      console.log('TradingView 신호 수신:', req.body);
      
      // 기본 검증
      if (!action || !symbol) {
        return res.status(400).json({ 
          error: 'Missing required fields',
          required: ['action', 'symbol'],
          received: Object.keys(req.body || {})
        });
      }

      // NAS100 관련 심볼 체크
      const symbolUpper = symbol.toUpperCase();
      const nas100Symbols = ['NAS100', 'US100', 'NASDAQ', 'NDX'];
      const isNAS100 = nas100Symbols.some(sym => symbolUpper.includes(sym));
      
      if (!isNAS100) {
        return res.status(200).json({ 
          success: true,
          message: 'Signal filtered - not NAS100 related',
          symbol: symbol
        });
      }

      // 신호 생성
      global.lastSignalId++;
      const signalData = {
        signalId: global.lastSignalId,
        action: action.toUpperCase(),
        symbol: symbolUpper,
        timeframe: timeframe || '15m',
        price: parseFloat(price) || null,
        strategy: strategy || 'default',
        timestamp: timestamp || new Date().toISOString(),
        receivedAt: new Date().toISOString(),
        processed: false,
        instrument: 'NAS100'
      };

      // 저장
      global.currentSignal = signalData;
      global.signalHistory.unshift(signalData);
      
      // 히스토리 크기 제한
      if (global.signalHistory.length > 50) {
        global.signalHistory = global.signalHistory.slice(0, 50);
      }

      // 성공 응답
      return res.status(200).json({ 
        success: true, 
        signalId: signalData.signalId,
        message: 'NAS100 signal received and stored',
        data: {
          action: signalData.action,
          symbol: signalData.symbol,
          timeframe: signalData.timeframe,
          price: signalData.price,
          timestamp: signalData.timestamp
        }
      });

    } catch (error) {
      console.error('POST 처리 오류:', error);
      return res.status(500).json({ 
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  // 지원하지 않는 메소드
  else {
    return res.status(405).json({ 
      error: 'Method not allowed',
      allowed: ['GET', 'POST'],
      received: req.method
    });
  }
}
