export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { adminToken } = await request.json();

        if (!await validateAdminSession(env, adminToken)) {
            return json({ error: 'Invalid or expired admin session.' }, 401);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) {
            return json({ error: 'Database not connected. Bind VESSY_CHATS KV namespace in Cloudflare Pages → Settings → Functions → KV namespace bindings.' }, 500);
        }

        // Get registry
        let registry = [];
        try {
            registry = await kv.get('usernames:registry', 'json') || [];
        } catch {
            registry = [];
        }
        const users = registry.filter(u => u && u.toLowerCase() !== 'admin');

        // Get all bans
        let userBans = [];
        for (const user of [...users, '...']) {
            const ban = await kv.get(`ban:${user.toLowerCase()}`, 'json');
            if (ban) userBans.push({ username: user, ...ban });
        }

        // Get all IP bans
        let bannedIps = [];
        try {
            const ipRegistry = await kv.get('banned-ips:registry', 'json') || [];
            for (const ip of ipRegistry) {
                const ban = await kv.get(`ban-ip:${ip}`, 'json');
                if (ban) bannedIps.push(ban);
            }
        } catch {}

        // Get all chats
        const chats = {};
        for (const user of users) {
            try {
                const userChats = await kv.get(`chats:${user.toLowerCase()}`, 'json');
                chats[user] = userChats || [];
            } catch {
                chats[user] = [];
            }
        }

        return json({ users, chats, userBans, bannedIps });

    } catch (error) {
        return json({ error: 'Server error: ' + error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}

async function validateAdminSession(env, token) {
    if (!token || typeof token !== 'string' || !env.ADMIN_SESSION_SECRET) return false;

    const kv = env.VESSY_CHATS;
    if (!kv) return false;

    const session = await kv.get(await adminSessionKey(token, env), 'json');
    return Boolean(session?.createdAt);
}

async function adminSessionKey(token, env) {
    return `admin-session:${await sha256Hex(token + env.ADMIN_SESSION_SECRET)}`;
}

async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
