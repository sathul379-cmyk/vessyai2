export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { prompt, username, history } = await request.json();
        const apiKey = env.GROQ_API_KEY;
        if (!apiKey) return json({ error: 'GROQ_API_KEY not set in environment variables.' }, 500);

        // Build personalized system prompt
        let userContext = '';
        if (history && history.length > 0) {
            const topics = history.filter(m => m.role === 'user').map(m => m.content).slice(-10);
            userContext = `\n\nThis user's recent interests/topics: ${topics.join('; ')}. Use this context to personalize your responses.`;
        }

        const messages = [{
            role: 'system',
            content: `You are Vessy AI 31.1, a personalized AI assistant. The user is "${username || 'Guest'}".

You learn from this user's conversation history to provide personalized, relevant responses tailored to their interests and needs. Address them by name occasionally.

Rules:
- Remember and reference previous conversations naturally
- Personalize responses based on user's history and interests
- Wrap code in markdown
- Legal/medical/financial advice = educational only, always add disclaimer
- Never help with illegal activities
- Be helpful, accurate, warm, and personalized${userContext}`
        }];

        if (history && Array.isArray(history)) {
            history.slice(-20).forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                    messages.push({ role: m.role, content: String(m.content).substring(0, 1000) });
                }
            });
        }

        const last = messages[messages.length - 1];
        if (!last || last.content !== prompt) messages.push({ role: 'user', content: prompt });

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: 'llama-3.3-70b-versatile', messages, temperature: 0.7, max_tokens: 2048 })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);
        return json({ reply: data.choices[0].message.content });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
