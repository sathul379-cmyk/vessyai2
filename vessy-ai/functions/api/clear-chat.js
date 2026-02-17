export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username } = await request.json();
        if (!username) return json({ error: 'Missing username' }, 400);

        const kv = env.VESSY_CHATS;
        if (kv) {
            await kv.put(`chats:${username.toLowerCase()}`, JSON.stringify([]));
        }

        return json({ success: true });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
