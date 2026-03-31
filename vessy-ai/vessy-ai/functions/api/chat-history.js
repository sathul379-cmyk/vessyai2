export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username } = await request.json();
        if (!username) return json({ history: [] });

        const kv = env.VESSY_CHATS;
        if (kv) {
            let history = [];
            try { history = await kv.get(`chats:${username.toLowerCase()}`, 'json') || []; } catch { history = []; }
            return json({ history });
        }

        return json({ history: [] });
    } catch {
        return json({ history: [] });
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
