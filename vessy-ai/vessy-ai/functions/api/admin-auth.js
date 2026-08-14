const ADMIN_SESSION_TTL_SECONDS = 12 * 60 * 60;

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, token } = await request.json();

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Database not connected.' }, 500);

        if (!env.ADMIN_SESSION_SECRET) {
            return json({ error: 'Admin security is not configured.' }, 500);
        }

        const normalizedUsername = String(username || '').toLowerCase();
        if (normalizedUsername !== 'admin' || !token) {
            return json({ error: 'Admin account session required.' }, 403);
        }

        const accountSession = await kv.get(`session:${token}`, 'json');
        if (!accountSession || accountSession.username?.toLowerCase() !== 'admin') {
            return json({ error: 'Invalid admin account session.' }, 401);
        }

        const adminToken = randomHex(32);
        await kv.put(await adminSessionKey(adminToken, env), JSON.stringify({
            createdAt: new Date().toISOString(),
            username: accountSession.username,
            ip: getClientIp(request)
        }), { expirationTtl: ADMIN_SESSION_TTL_SECONDS });

        return json({ success: true, adminToken, expiresIn: ADMIN_SESSION_TTL_SECONDS });
    } catch (error) {
        return json({ error: 'Server error: ' + error.message }, 500);
    }
}

async function adminSessionKey(token, env) {
    return `admin-session:${await sha256Hex(token + env.ADMIN_SESSION_SECRET)}`;
}

async function sha256Hex(value) {
    const bytes = new TextEncoder().encode(value);
    const hash = await crypto.subtle.digest('SHA-256', bytes);
    return [...new Uint8Array(hash)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function randomHex(length) {
    const bytes = new Uint8Array(length);
    crypto.getRandomValues(bytes);
    return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function getClientIp(request) {
    const forwarded = request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')
        || request.headers.get('x-real-ip')
        || '';
    return forwarded.split(',')[0].trim();
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
