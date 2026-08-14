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
        for (const user of users) {
            const ban = await kv.get(`ban:${user.toLowerCase()}`, 'json');
            if (!ban) continue;
            if (ban.expiresAt && new Date() > new Date(ban.expiresAt)) {
                await kv.delete(`ban:${user.toLowerCase()}`);
                continue;
            }
            userBans.push({ username: user, ...ban });
        }

        // Get all IP bans
        let bannedIps = [];
        try {
            const ipRegistry = await kv.get('banned-ips:registry', 'json') || [];
            const activeIpRegistry = [];
            for (const ip of ipRegistry) {
                const ban = await kv.get(`ban-ip:${ip}`, 'json');
                if (!ban) continue;
                if (ban.expiresAt && new Date() > new Date(ban.expiresAt)) {
                    await kv.delete(`ban-ip:${ip}`);
                    continue;
                }
                activeIpRegistry.push(ip);
                bannedIps.push(ban);
            }
            if (activeIpRegistry.length !== ipRegistry.length) {
                await kv.put('banned-ips:registry', JSON.stringify(activeIpRegistry));
            }
        } catch {}

        // Get all chats
        const chats = {};
        for (const user of users) {
            try {
                chats[user] = await getUserChatMessages(kv, user.toLowerCase(), env);
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

async function getUserChatMessages(kv, username, env) {
    const sessions = await kv.get(`chat-sessions:${username}`, 'json') || [];
    if (!sessions.length) {
        return await kv.get(`chats:${username}`, 'json') || [];
    }

    const messages = [];
    for (const summary of sessions.slice(0, 20)) {
        if (!summary?.id) continue;
        const session = await readChatSession(kv, `chat-session:${username}:${summary.id}`, env);
        if (!session?.messages?.length) continue;
        messages.push({
            role: 'system',
            content: `Chat session: ${summary.title || summary.id}`,
            timestamp: session.createdAt || summary.createdAt || null
        });
        messages.push(...session.messages);
    }
    return messages.slice(-300);
}

async function readChatSession(kv, key, env) {
    const stored = await kv.get(key, 'json');
    if (!stored) return null;
    if (!stored.encrypted) return stored;
    return decryptJson(stored, env.CHAT_ENCRYPTION_SECRET);
}

async function decryptJson(payload, secret) {
    if (!secret) return null;
    const iv = base64Decode(payload.iv);
    const data = base64Decode(payload.data);
    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, await encryptionKey(secret), data);
    return JSON.parse(new TextDecoder().decode(decrypted));
}

async function encryptionKey(secret) {
    const material = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret));
    return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['decrypt']);
}

function base64Decode(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}
