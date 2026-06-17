export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { week = 1, vo2max = 47, hrv = 45, weight = 74 } = req.body || {};

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        messages: [{
          role: 'user',
          content: `Si osobný tréner pre bežca. Vygeneruj JSON s tipmi:
Athlete: 42 rokov, ${weight} kg, VO2max ${vo2max}, HRV ${hrv} ms, tréningový týždeň T${week}/8, cieľ 5K pod 27:15.
{"weekTip":"...","nutritionTip":"...","recoveryTip":"...","nextRunGoal":"...","strengthFocus":"...","warningSign":"...","motivation":"..."}
Iba JSON, žiadny text navyše.`
        }]
      })
    });

    const data = await response.json();
    const raw = data.content?.[0]?.text || '{}';
    const tips = JSON.parse(raw.replace(/```json|```/g, '').trim());
    return res.status(200).json(tips);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}