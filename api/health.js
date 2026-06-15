import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    await redis.set('healthData', JSON.stringify(req.body));
    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    const data = await redis.get('healthData');
    return res.status(200).json(data || {});
  }
}