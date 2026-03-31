export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username } = await request.json();

        if (!username || username.length < 3) return json({ available: false });

        const kv = env.VESSY_CHATS;
        if (kv) {
            const existing = await kv.get(`user:${username.toLowerCase()}`, 'json');
            return json({ available: !existing });
        }

        // No KV — assume available
        return json({ available: true });
    } catch {
        return json({ available: true });
    }
}

function json(data) {
    return new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json' } });
}
