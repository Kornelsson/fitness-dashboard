import { Redis } from '@upstash/redis';
const redis = Redis.fromEnv();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'POST') {
    const data = { ...req.body, savedAt: new Date().toISOString() };
    // Ulož aktuálne dáta
    await redis.set('healthData', JSON.stringify(data));
    // Ulož do histórie
    const date = new Date().toISOString().split('T')[0];
    await redis.set(`history:${date}`, JSON.stringify(data));
    // Pridaj dátum do zoznamu
    await redis.lpush('historyDates', date);
    return res.status(200).json({ success: true });
  }

  if (req.method === 'GET') {
    const { type } = req.query;
    if (type === 'history') {
      const dates = await redis.lrange('historyDates', 0, 29);
      const history = await Promise.all(
        [...new Set(dates)].map(async d => {
          const val = await redis.get(`history:${d}`);
          return { date: d, ...(typeof val === 'string' ? JSON.parse(val) : val) };
        })
      );
      return res.status(200).json(history);
    }
    const data = await redis.get('healthData');
    return res.status(200).json(typeof data === 'string' ? JSON.parse(data) : data || {});
  }
}