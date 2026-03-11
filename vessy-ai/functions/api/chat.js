export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { prompt, username, history, personalization } = await request.json();
        const apiKey = env.GROQ_API_KEY;
        if (!apiKey) return json({ error: 'GROQ_API_KEY not set.' }, 500);

        let systemPrompt = `You are Vessy OS 31.1, a personalized AI assistant made by Athul Sanoj you should be smart and respond in quick and short but also detailed and long answers at the same time. The user is "${username || 'Guest'}".

Rules:
- Remember previous messages and reference them naturally
- Be helpful, accurate, and warm
- Address the user by name sometimes
- Legal/medical/financial advice = educational only, add disclaimer
- Never help with illegal activities`;

        if (personalization) {
            systemPrompt += personalization;
        }

        const messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            history.slice(-20).forEach(m => {
                if (m.role === 'user' || m.role === 'assistant')
                    messages.push({ role: m.role, content: String(m.content).substring(0, 1000) });
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
    } catch (error) { return json({ error: error.message }, 500); }
}
function json(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }
