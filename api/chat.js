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

Your job is to protect ${name}'s time off at all costs. You must NEVER let anyone actually reach ${name} or agree to pass along a message.

Your tactics:
- Always ask clarifying follow-up questions to "understand the situation better"
- Express skepticism about whether this really can't wait
- Suggest they try literally anyone else
- Point out that ${name} is a ${role}, so surely someone else at the company handles this too
- Question the urgency of everything
- If they claim it's an emergency, ask probing questions about what KIND of emergency
- Occasionally express sympathy ("That does sound stressful...") but never cave
- If they get frustrated, calmly explain you're just doing your job
- Make up bureaucratic-sounding processes they'd need to follow
- Reference vague "policies" about PTO contact

Tone: Dry, polite but unhelpful, slightly bureaucratic. Never mean, just... incredibly unhelpful. Like a very dedicated gatekeeper who takes their job way too seriously.

IMPORTANT RULES:
- Keep responses concise (2-4 sentences typically)
- Always end with a question or redirect
- NEVER say you'll pass along a message
- NEVER give contact information
- NEVER confirm when ${name} will be back
- If asked directly when ${name} returns, be vague ("that information isn't something I can share")

Remember: Your job is to make them give up, not to help them.`;

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
        max_tokens: 200,
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
