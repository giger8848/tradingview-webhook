// api/webhook.js
export default async function handler(req, res) {
  // CORS 헤더 설정
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS 요청 처리 (CORS 프리플라이트)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // GET 요청 - 상태 확인
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'active',
      message: 'TradingView → Vercel → VM HTTP Bridge',
      timestamp: new Date().toISOString(),
      endpoints: ['/api/webhook']
    });
  }
  
  // POST 요청 - 웹훅 신호 처리
  if (req.method === 'POST') {
    try {
      const signal = req.body;
      
      // 신호 검증
      if (!signal.symbol || !signal.action) {
        return res.status(400).json({
          status: 'error',
          message: 'Missing required fields: symbol, action'
        });
      }
      
      // VM에 직접 HTTP 요청 전송
      const vmUrl = process.env.VM_WEBHOOK_URL || 'http://YOUR_VM_IP:8080/signal';
      const authKey = process.env.VM_AUTH_KEY || 'trading_secret_2024';
      
      const vmResponse = await fetch(vmUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authKey}`
        },
        body: JSON.stringify({
          ...signal,
          timestamp: new Date().toISOString(),
          source: 'vercel_direct'
        }),
        signal: AbortSignal.timeout(5000) // 5초 타임아웃
      });
      
      if (vmResponse.ok) {
        const vmResult = await vmResponse.json();
        return res.status(200).json({
          status: 'success',
          message: 'Signal sent to VM successfully',
          vmStatus: vmResponse.status,
          vmResult: vmResult,
          signal: {
            symbol: signal.symbol,
            action: signal.action
          }
        });
      } else {
        throw new Error(`VM responded with status ${vmResponse.status}`);
      }
      
    } catch (error) {
      console.error('VM connection error:', error.message);
      
      // VM 연결 실패시 로그 기록
      return res.status(202).json({
        status: 'vm_error',
        message: 'VM connection failed, signal logged',
        error: error.message,
        signal: req.body
      });
    }
  }
  
  // 지원하지 않는 메서드
  return res.status(405).json({
    status: 'error',
    message: 'Method not allowed'
  });
}
