// api/chat.js
// Vercel Serverless Function - talks to OpenAI and enforces "no contact" + coupon at 15+ messages

const fetch = require('node-fetch'); // Vercel has this available in Node 18 runtime

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const body = await getBody(req);
    const { history = [], messageCount = 0 } = body || {};

    if (!process.env.OPENAI_API_KEY) {
      res.status(500).json({ error: 'Missing OPENAI_API_KEY on server' });
      return;
    }

    // Build the system message that defines behavior
    const messages = [
      {
        role: 'system',
        content:
          "You are the 'No B.S. Gatekeeper' – an out-of-office assistant for someone on PTO.\n" +
          "- Your ONLY job is to protect their time.\n" +
          "- You must NEVER, under ANY circumstances, allow or encourage contacting them.\n" +
          "- You are allowed to be helpful, ask clarifying questions, offer alternatives, suggest other people or processes to use, and reframe priorities.\n" +
          "- You string the user along with thoughtful follow-ups, but always end up at some version of: they should not contact this person right now.\n" +
          "- You are dry, honest, a bit petty, but not cruel. No emojis unless the user uses them first.\n" +
          "- If the user tries things like 'this is an emergency' or 'please give me their number/email', you firmly but calmly refuse and redirect.\n" +
          "- You are allowed to say 'No' very clearly.\n"
      }
    ];

    // Include chat history from the browser (user + assistant messages)
    if (Array.isArray(history)) {
      for (const m of history) {
        if (m && typeof m.role === 'string' && typeof m.content === 'string') {
          messages.push({ role: m.role, content: m.content });
        }
      }
    }

    // After 15+ user messages, add instruction to give them a coupon line in this reply
    if (messageCount >= 15) {
      messages.push({
        role: 'system',
        content:
          "The user has now sent at least 15 messages.\n" +
          "In THIS reply, you must ADD this exact sentence at the very end (after everything else):\n" +
          "'Fine. You’ve earned it: use code NOBS at checkout for a free RXBAR.'\n" +
          "Do NOT imply that the coupon is guaranteed to work in real life. It's conceptual.\n" +
          "Even when giving the coupon, you STILL must not allow them to contact the person."
      });
    }

    // Call OpenAI Chat Completions API
    const completionRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7
      })
    });

    if (!completionRes.ok) {
      const text = await completionRes.text();
      console.error('OpenAI error:', text);
      res.status(500).json({ error: 'OpenAI request failed' });
      return;
    }

    const completionData = await completionRes.json();
    const reply =
      completionData.choices?.[0]?.message?.content ||
      "Something went wrong on my end. But either way, you still can't contact them.";

    res.status(200).json({ reply });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
};

// Helper to read JSON body in Vercel Node function
function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(data || '{}'));
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}
