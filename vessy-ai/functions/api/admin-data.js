export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { adminPassword } = await request.json();

        if (adminPassword !== 'vessy@2015') {
            return json({ error: 'Access denied.' }, 403);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'KV not connected.' }, 500);

        const registry = await kv.get('usernames:registry', 'json') || [];
        const users = registry.filter(u => u.toLowerCase() !== 'admin');
        const chats = {};

        for (const user of users) {
            try { chats[user] = await kv.get(`chats:${user.toLowerCase()}`, 'json') || []; }
            catch { chats[user] = []; }
        }

        return json({ users, chats });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }
