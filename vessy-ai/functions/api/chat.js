export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { prompt, username, history } = await request.json();
        const apiKey = env.GROQ_API_KEY;

        if (!apiKey) return json({ error: 'GROQ_API_KEY not set. Add it in Cloudflare Pages → Settings → Environment Variables.' }, 500);

        const messages = [{
            role: 'system',
            content: `You are Vessy OS 31.0 AI Assistant. User: "${username || 'Guest'}".
Rules:
- Remember previous messages and learn from conversation context
- Wrap code in markdown code blocks
- Be helpful, accurate, concise
- Legal/medical/financial advice = educational only, add disclaimer
- Never assist with illegal activities
- Running on Cloudflare Workers`
        }];

        if (history && Array.isArray(history)) {
            history.slice(-20).forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    messages.push({ role: msg.role, content: String(msg.content).substring(0, 1000) });
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
