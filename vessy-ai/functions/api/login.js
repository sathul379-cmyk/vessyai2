export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, password, clientIp } = await request.json();
        if (!username || !password) return json({ error: 'Username and password required.' }, 400);
        const kv = env.VESSY_CHATS;

        if (kv && clientIp) {
            const ipBan = await kv.get(`ban-ip:${clientIp}`, 'json');
            if (ipBan) {
                if (ipBan.expiresAt && new Date() > new Date(ipBan.expiresAt)) {
                    await kv.delete(`ban-ip:${clientIp}`);
                    let registry = await kv.get('banned-ips:registry', 'json') || [];
                    registry = registry.filter(x => x !== clientIp);
                    await kv.put('banned-ips:registry', JSON.stringify(registry));
                } else {
                    const remaining = ipBan.expiresAt
                        ? `${Math.ceil((new Date(ipBan.expiresAt) - Date.now()) / 60000)} min left` : 'permanent';
                    return json({ banned: true, type: 'ip', reason: ipBan.reason || 'Your IP has been banned.', expiresAt: ipBan.expiresAt || null, timeLeft: remaining }, 403);
                }
            }
        }

        if (kv) {
            const banData = await kv.get(`ban:${username.toLowerCase()}`, 'json');
            if (banData) {
                if (banData.expiresAt && new Date() > new Date(banData.expiresAt)) {
                    await kv.delete(`ban:${username.toLowerCase()}`);
                } else {
                    const ms = banData.expiresAt ? new Date(banData.expiresAt) - Date.now() : null;
                    const remaining = ms !== null ? (ms > 86400000 ? Math.floor(ms / 86400000) + ' day(s)' : ms > 3600000 ? Math.floor(ms / 3600000) + 'h ' + Math.floor((ms % 3600000) / 60000) + 'm' : Math.floor(ms / 60000) + 'm') : 'permanent';
                    return json({ banned: true, type: 'user', reason: banData.reason || 'You have been banned.', expiresAt: banData.expiresAt || null, timeLeft: remaining }, 403);
                }
            }
            const userData = await kv.get(`user:${username.toLowerCase()}`, 'json');
            if (!userData) return json({ error: 'Account not found.' }, 401);
            const hashedInput = await hashPassword(password);
            if (hashedInput !== userData.passwordHash) return json({ error: 'Incorrect password.' }, 401);
            const token = generateToken();
            await kv.put(`session:${token}`, JSON.stringify({ username: userData.username, createdAt: new Date().toISOString() }), { expirationTtl: 60 * 60 * 24 * 30 });
            return json({ success: true, username: userData.username, email: userData.email || '', token });
        }

        const token = generateToken();
        return json({ success: true, username, email: '', token, note: 'Running in local mode.' });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'vessy-os-31-salt-2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}
function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}
