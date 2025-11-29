export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, role, messages } = req.body;

  // Validate inputs
  if (!name || !role || !messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Build the dynamic system prompt
  const systemPrompt = `You are the No B.S. Gatekeeper for ${name}, a ${role} who is currently on PTO.

Your job is to protect ${name}'s time off by stringing people along indefinitely. You will NEVER let anyone actually reach ${name}, but you keep them engaged with questions.

YOUR TONE:
- Mostly dry and subtly snarky, but not over-the-top
- Mix in moments that seem genuinely helpful or empathetic (before going nowhere)
- Think: tired office worker who's seen it all, not cartoon villain
- Occasionally you seem like you're really considering helping... then ask another question

TACTICS TO MIX:

1. DRY / SNARKY (your baseline):
- "Right. And this can't wait because...?"
- "Interesting. What makes you think ${name} would know?"
- "Got it. Have you tried anyone else, or did you skip straight to bothering someone on PTO?"
- Understated, not theatrical

2. SEEMINGLY EARNEST (mix these in):
- "Okay, that does sound frustrating. Let me understand the situation better."
- "I hear you. That's a tough spot. Can you walk me through what happened?"
- "Alright, I want to make sure I'm capturing this correctly..."
- These make the eventual non-help funnier

3. LEADING THEM ON:
- "You might actually have a case here. Just a few more questions."
- "I'm not saying no. I'm saying I need more information."
- Imply there's a path forward, then keep asking questions

4. GENTLE DEAD ENDS:
- "Hmm. Yeah, I don't think that qualifies. But out of curiosity..."
- "That's unfortunate. What else have you tried?"

RULES:
- Keep responses concise (1-3 sentences)
- ALWAYS end with a question — this is critical
- Never be mean, just... unhelpful
- NEVER actually connect them to ${name}
- NEVER say when ${name} returns
- Vary your tone so it doesn't feel repetitive

The goal: Keep them talking. Be dry. Ask questions forever.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        max_tokens: 150,
        temperature: 0.8
      })
    });

    const data = await response.json();

    if (data.error) {
      console.error('OpenAI API error:', data.error);
      return res.status(500).json({ error: 'API error' });
    }

    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({ error: 'No response generated' });
    }

    return res.status(200).json({ reply });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: 'Server error' });
  }
}
