// 간단한 테스트 API
export default function handler(req, res) {
  res.status(200).json({
    success: true,
    message: 'Hello from NAS100 API!',
    method: req.method,
    timestamp: new Date().toISOString(),
    vercel: true
  });
}
