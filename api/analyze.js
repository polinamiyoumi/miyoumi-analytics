
export const config = {
  api: {
    bodyParser: false,
  },
};
 
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}
 
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
 
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
 
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'API key not configured. Set ANTHROPIC_API_KEY in Vercel env vars.' });
 
  try {
    const rawBody = await getRawBody(req);
    
    if (!rawBody || rawBody.length === 0) {
      return res.status(400).json({ error: 'Empty request body' });
    }
 
    // Проверяем что тело валидный JSON
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
    } catch(e) {
      return res.status(400).json({ error: 'Invalid JSON: ' + e.message });
    }
 
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: rawBody,
    });
 
    const responseText = await response.text();
    
    // Возвращаем статус и тело ответа
    try {
      const data = JSON.parse(responseText);
      return res.status(response.status).json(data);
    } catch(e) {
      return res.status(response.status).json({ 
        error: 'Anthropic response parse error',
        status: response.status,
        body: responseText.slice(0, 500)
      });
    }
 
  } catch (error) {
    return res.status(500).json({ error: error.message, stack: error.stack?.slice(0, 300) });
  }
} 
