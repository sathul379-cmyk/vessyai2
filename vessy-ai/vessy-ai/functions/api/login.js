export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, password, clientIp } = await request.json();

        if (!username || !password) {
            return json({ error: 'Username and password required.' }, 400);
        }

        const kv = env.VESSY_CHATS;

        // CHECK IP BAN
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
                        ? `${Math.ceil((new Date(ipBan.expiresAt) - Date.now()) / 60000)} min left`
                        : 'permanent';
                    return json({ error: `Your IP is banned (${remaining}). Contact support.` }, 403);
                }
            }
        }

        if (kv) {
            // CHECK USER BAN
            const banData = await kv.get(`ban:${username.toLowerCase()}`, 'json');
            if (banData) {
                if (banData.expiresAt && new Date() > new Date(banData.expiresAt)) {
                    await kv.delete(`ban:${username.toLowerCase()}`);
                } else {
                    const remaining = banData.expiresAt
                        ? `${Math.ceil((new Date(banData.expiresAt) - Date.now()) / 60000)} min left`
                        : 'permanent';
                    return json({ error: `Account banned (${remaining}). Contact support.` }, 403);
                }
            }
        }

        if (kv) {
            const userData = await kv.get(`user:${username.toLowerCase()}`, 'json');
            if (!userData) {
                return json({ error: 'Account not found. Check username or create a new account.' }, 401);
            }

            const hashedInput = await hashPassword(password);
            if (hashedInput !== userData.passwordHash) {
                return json({ error: 'Incorrect password.' }, 401);
            }

            const token = generateToken();
            await kv.put(`session:${token}`, JSON.stringify({
                username: userData.username,
                createdAt: new Date().toISOString()
            }), { expirationTtl: 60 * 60 * 24 * 30 });

            return json({ success: true, username: userData.username, email: userData.email || '', token });
        }

        // FALLBACK: No KV — accept any login for development
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
