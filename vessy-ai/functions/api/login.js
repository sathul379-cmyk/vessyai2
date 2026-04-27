export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, password, clientIp } = await request.json();
        if (!username || !password) return json({ error: 'Username and password required.' }, 400);
        const kv = env.VESSY_CHATS;
        const normalizedUsername = username.toLowerCase();
        const resolvedIp = clientIp || getClientIp(request);

        if (kv && resolvedIp) {
            const ipBan = await kv.get(`ban-ip:${resolvedIp}`, 'json');
            if (ipBan) {
                if (ipBan.expiresAt && new Date() > new Date(ipBan.expiresAt)) {
                    await kv.delete(`ban-ip:${resolvedIp}`);
                    let registry = await kv.get('banned-ips:registry', 'json') || [];
                    registry = registry.filter(x => x !== resolvedIp);
                    await kv.put('banned-ips:registry', JSON.stringify(registry));
                } else {
                    return json({
                        banned: true,
                        restricted: true,
                        kind: ipBan.expiresAt ? 'temp banned' : 'banned',
                        type: 'ip',
                        reason: normalizeReason(ipBan.reason),
                        expiresAt: ipBan.expiresAt || null,
                        timeLeft: formatRemaining(ipBan.expiresAt)
                    }, 403);
                }
            }
        }

        if (kv) {
            const banData = await kv.get(`ban:${normalizedUsername}`, 'json');
            if (banData) {
                if (banData.expiresAt && new Date() > new Date(banData.expiresAt)) {
                    await kv.delete(`ban:${normalizedUsername}`);
                } else {
                    return json({
                        banned: true,
                        restricted: true,
                        kind: banData.type === 'temp' ? 'temp banned' : 'banned',
                        type: 'user',
                        reason: normalizeReason(banData.reason),
                        expiresAt: banData.expiresAt || null,
                        timeLeft: formatRemaining(banData.expiresAt)
                    }, 403);
                }
            }
            const userData = await kv.get(`user:${normalizedUsername}`, 'json');
            if (!userData) return json({ error: 'Account not found.' }, 401);
            const hashedInput = await hashPassword(password, CURRENT_PASSWORD_SALT);
            const legacyHashedInput = await hashPassword(password, LEGACY_PASSWORD_SALT);
            const usingLegacyHash = legacyHashedInput === userData.passwordHash;

            if (hashedInput !== userData.passwordHash && !usingLegacyHash) {
                return json({ error: 'Incorrect password.' }, 401);
            }

            if (usingLegacyHash) {
                await kv.put(`user:${normalizedUsername}`, JSON.stringify({
                    ...userData,
                    passwordHash: hashedInput
                }));
            }

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

const CURRENT_PASSWORD_SALT = 'vessy-os-31-salt-2025';
const LEGACY_PASSWORD_SALT = 'vessy-ai-31-salt-2025';

async function hashPassword(password, salt = CURRENT_PASSWORD_SALT) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
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

function getClientIp(request) {
    const forwarded = request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')
        || request.headers.get('x-real-ip')
        || '';
    return forwarded.split(',')[0].trim();
}

function normalizeReason(reason) {
    return typeof reason === 'string' && reason.trim() ? reason.trim() : 'Classified';
}

function formatRemaining(expiresAt) {
    if (!expiresAt) return 'permanently';

    const ms = new Date(expiresAt).getTime() - Date.now();
    if (ms <= 0) return '0 minutes';

    const totalMinutes = Math.ceil(ms / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) {
        return `${days} day${days === 1 ? '' : 's'}${hours ? ` ${hours} hour${hours === 1 ? '' : 's'}` : ''}`;
    }
    if (hours > 0) {
        return `${hours} hour${hours === 1 ? '' : 's'}${minutes ? ` ${minutes} minute${minutes === 1 ? '' : 's'}` : ''}`;
    }
    return `${totalMinutes} minute${totalMinutes === 1 ? '' : 's'}`;
}
