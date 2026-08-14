export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, token } = await request.json();
        if (!username || !token) return json({ error: 'Missing username or token' }, 400);

        const kv = env.VESSY_CHATS;
        if (kv) {
            const normalizedUsername = username.toLowerCase();
            const session = await kv.get(`session:${token}`, 'json');
            if (!session || session.username?.toLowerCase() !== normalizedUsername) {
                return json({ error: 'Invalid session.' }, 401);
            }
            const sessions = await kv.get(`chat-sessions:${normalizedUsername}`, 'json') || [];
            await Promise.all(sessions.map(item => item?.id ? kv.delete(`chat-session:${normalizedUsername}:${item.id}`) : null));
            await kv.put(`chat-sessions:${normalizedUsername}`, JSON.stringify([]));
            await kv.put(`chats:${normalizedUsername}`, JSON.stringify([]));
        }

        return json({ success: true });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
