// NAS100 Webhook API - 최소 버전
export default function handler(req, res) {
  // CORS 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // 전역 저장소 초기화
  if (!global.signals) {
    global.signals = [];
    global.currentSignal = null;
    global.signalId = 0;
  }

  // GET 요청 처리
  if (req.method === 'GET') {
    const { endpoint } = req.query;

    if (endpoint === 'status') {
      return res.json({
        success: true,
        message: 'NAS100 API working!',
        totalSignals: global.signals.length,
        currentSignal: global.currentSignal,
        timestamp: new Date().toISOString()
      });
    }

    if (endpoint === 'current') {
      return res.json({
        success: true,
        data: global.currentSignal
      });
    }

    // 기본 응답
    return res.json({
      success: true,
      message: 'NAS100 TradingView Webhook API',
      endpoints: ['?endpoint=status', '?endpoint=current'],
      method: req.method
    });
  }

  // POST 요청 처리 (TradingView 웹훅)
  if (req.method === 'POST') {
    try {
      const { action, symbol, timeframe, price } = req.body;

      // 기본 검증
      if (!action || !symbol) {
        return res.status(400).json({
          error: 'Missing action or symbol'
        });
      }

      // 신호 생성
      global.signalId++;
      const signal = {
        id: global.signalId,
        action: action.toUpperCase(),
        symbol: symbol.toUpperCase(),
        timeframe: timeframe || '15m',
        price: price || null,
        timestamp: new Date().toISOString()
      };

      // 저장
      global.currentSignal = signal;
      global.signals.unshift(signal);

      // 최대 50개 유지
      if (global.signals.length > 50) {
        global.signals = global.signals.slice(0, 50);
      }

      return res.json({
        success: true,
        message: 'Signal received',
        data: signal
      });

    } catch (error) {
      return res.status(500).json({
        error: 'Server error',
        message: error.message
      });
    }
  }

  // 지원하지 않는 메소드
  return res.status(405).json({
    error: 'Method not allowed',
    allowed: ['GET', 'POST'],
    received: req.method
  });
}
