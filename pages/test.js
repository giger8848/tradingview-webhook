export default function handler(req, res) {
  return res.status(200).json({
    success: true,
    message: 'Test API working with correct path!',
    method: req.method,
    path: 'pages/api/test.js'
  });
}
