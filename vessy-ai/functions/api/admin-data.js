export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, token } = await request.json();

        // ONLY admin can access
        if (!username || username.toLowerCase() !== 'admin') {
            return json({ error: 'Access denied. Admin only.' }, 403);
        }

        // Verify admin password was used (check session)
        const kv = env.VESSY_CHATS;

        if (!kv) {
            return json({ error: 'KV storage not connected. Bind VESSY_CHATS in Cloudflare settings.' }, 500);
        }

        // Verify admin session
        if (token) {
            const session = await kv.get(`session:${token}`, 'json');
            if (!session || session.username.toLowerCase() !== 'admin') {
                return json({ error: 'Invalid admin session.' }, 403);
            }
        }

        // Get all usernames
        const registry = await kv.get('usernames:registry', 'json') || [];

        // Get all chats for each user (excluding admin)
        const chats = {};
        const users = [];

        for (const user of registry) {
            if (user.toLowerCase() === 'admin') continue;
            users.push(user);
            try {
                const userChats = await kv.get(`chats:${user.toLowerCase()}`, 'json') || [];
                if (userChats.length > 0) {
                    chats[user] = userChats;
                }
            } catch {
                chats[user] = [];
            }
        }

        return json({ users, chats });

    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
