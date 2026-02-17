export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, userMessage, aiMessage, timestamp } = await request.json();
        if (!username || !userMessage) return json({ error: 'Missing data' }, 400);

        const kv = env.VESSY_CHATS;
        if (kv) {
            const key = `chats:${username.toLowerCase()}`;
            let existing = await kv.get(key, 'json') || [];
            existing.push({ role: 'user', content: userMessage, timestamp });
            existing.push({ role: 'assistant', content: aiMessage, timestamp });
            if (existing.length > 200) existing = existing.slice(-200);
            await kv.put(key, JSON.stringify(existing));
        }
        return json({ success: true });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
