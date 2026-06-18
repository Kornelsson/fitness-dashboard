export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // Refresh access token
    const tokenRes = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: process.env.STRAVA_CLIENT_ID,
        client_secret: process.env.STRAVA_CLIENT_SECRET,
        refresh_token: process.env.STRAVA_REFRESH_TOKEN,
        grant_type: 'refresh_token',
      })
    });
    const { access_token } = await tokenRes.json();

    // Fetch activities
    const activitiesRes = await fetch(
      'https://www.strava.com/api/v3/athlete/activities?per_page=20',
      { headers: { Authorization: `Bearer ${access_token}` } }
    );
    const activities = await activitiesRes.json();

    return res.status(200).json(activities);
  } catch(e) {
    return res.status(500).json({ error: e.message });
  }
}