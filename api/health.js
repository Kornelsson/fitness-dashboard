export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const data = req.body;
    console.log('Apple Health data:', data);
    // Tu sa uložia dáta
    return res.status(200).json({ success: true, received: data });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}