export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { adminToken, action, username, ip, banType, durationMinutes } = await request.json();

        if (!await validateAdminSession(env, adminToken)) {
            return json({ error: 'Invalid or expired admin session.' }, 401);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Database not connected.' }, 500);

        // USER BAN
        if (action === 'ban-user' && username) {
            const expiresAt = banType === 'temp'
                ? new Date(Date.now() + (durationMinutes || 60) * 60 * 1000).toISOString()
                : null;

            await kv.put(`ban:${username.toLowerCase()}`, JSON.stringify({
                type: banType,
                byAdmin: 'admin',
                createdAt: new Date().toISOString(),
                expiresAt
            }));

            return json({ success: true, message: `${username} banned (${banType === 'temp' ? durationMinutes + 'min' : 'permanent'})` });
        }

        // USER UNBAN
        if (action === 'unban-user' && username) {
            await kv.delete(`ban:${username.toLowerCase()}`);
            return json({ success: true, message: `${username} unbanned.` });
        }

        // IP BAN
        if (action === 'ban-ip' && ip) {
            const expiresAt = banType === 'temp'
                ? new Date(Date.now() + (durationMinutes || 60) * 60 * 1000).toISOString()
                : null;

            await kv.put(`ban-ip:${ip}`, JSON.stringify({
                ip,
                type: banType,
                byAdmin: 'admin',
                createdAt: new Date().toISOString(),
                expiresAt
            }));

            let registry = await kv.get('banned-ips:registry', 'json') || [];
            if (!registry.includes(ip)) {
                registry.push(ip);
                await kv.put('banned-ips:registry', JSON.stringify(registry));
            }

            return json({ success: true, message: `IP ${ip} banned (${banType === 'temp' ? durationMinutes + 'min' : 'permanent'})` });
        }

        // IP UNBAN
        if (action === 'unban-ip' && ip) {
            await kv.delete(`ban-ip:${ip}`);
            let registry = await kv.get('banned-ips:registry', 'json') || [];
            registry = registry.filter(x => x !== ip);
            await kv.put('banned-ips:registry', JSON.stringify(registry));
            return json({ success: true, message: `IP ${ip} unbanned.` });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (error) {
        return json({ error: error.message }, 500);
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
