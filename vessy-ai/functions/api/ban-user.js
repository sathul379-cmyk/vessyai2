export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { adminPassword, action, username, ip, banType, durationMinutes, banReason, kickReason } = await request.json();

        // Verify admin password
        if (action !== 'check-status' && (!adminPassword || adminPassword !== 'vessy@2015')) {
            return json({ error: 'Invalid password. Access denied.' }, 403);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Database not connected.' }, 500);

        const normalizedUsername = typeof username === 'string' ? username.toLowerCase() : '';
        const resolvedIp = ip || getClientIp(request);

        // USER BAN
        if (action === 'ban-user' && username) {
            const expiresAt = banType === 'temp'
                ? new Date(Date.now() + normalizeDurationMinutes(durationMinutes) * 60 * 1000).toISOString()
                : null;

            await kv.put(`ban:${normalizedUsername}`, JSON.stringify({
                type: banType,
                reason: normalizeReason(banReason),
                byAdmin: 'admin',
                createdAt: new Date().toISOString(),
                expiresAt
            }));

            return json({
                success: true,
                message: `${username} banned (${banType === 'temp' ? formatRemaining(expiresAt) : 'permanent'})`
            });
        }

        // USER UNBAN
        if (action === 'unban-user' && username) {
            await kv.delete(`ban:${normalizedUsername}`);
            return json({ success: true, message: `${username} unbanned.` });
        }

        // IP BAN
        if (action === 'ban-ip' && ip) {
            const expiresAt = banType === 'temp'
                ? new Date(Date.now() + normalizeDurationMinutes(durationMinutes) * 60 * 1000).toISOString()
                : null;

            await kv.put(`ban-ip:${ip}`, JSON.stringify({
                ip,
                type: banType,
                reason: normalizeReason(banReason),
                byAdmin: 'admin',
                createdAt: new Date().toISOString(),
                expiresAt
            }));

            let registry = await kv.get('banned-ips:registry', 'json') || [];
            if (!registry.includes(ip)) {
                registry.push(ip);
                await kv.put('banned-ips:registry', JSON.stringify(registry));
            }

            return json({
                success: true,
                message: `IP ${ip} banned (${banType === 'temp' ? formatRemaining(expiresAt) : 'permanent'})`
            });
        }

        // IP UNBAN
        if (action === 'unban-ip' && ip) {
            await kv.delete(`ban-ip:${ip}`);
            let registry = await kv.get('banned-ips:registry', 'json') || [];
            registry = registry.filter(x => x !== ip);
            await kv.put('banned-ips:registry', JSON.stringify(registry));
            return json({ success: true, message: `IP ${ip} unbanned.` });
        }

        // KICK USER
        if (action === 'kick-user' && username) {
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
            await kv.put(`kick:${normalizedUsername}`, JSON.stringify({
                type: 'kick',
                by: 'admin',
                createdAt: new Date().toISOString(),
                expiresAt,
                reason: normalizeReason(kickReason || banReason)
            }), { expirationTtl: 3600 });
            return json({ success: true, message: `${username} kicked for ${formatRemaining(expiresAt)}.` });
        }

        // CHECK KICK STATUS
        if (action === 'check-kick' && username) {
            const restriction = await getRestrictionStatus(kv, normalizedUsername, resolvedIp);
            if (restriction?.restricted && restriction.type === 'kick') {
                return json({ kicked: true, reason: restriction.reason, timeLeft: restriction.timeLeft });
            }
            return json({ kicked: false, timeLeft: null });
        }

        if (action === 'check-status') {
            return json(await getRestrictionStatus(kv, normalizedUsername, resolvedIp));
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
}

function normalizeDurationMinutes(durationMinutes) {
    const parsed = Number(durationMinutes);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 60;
}

function normalizeReason(reason) {
    return typeof reason === 'string' && reason.trim() ? reason.trim() : 'Classified';
}

function getClientIp(request) {
    const forwarded = request.headers.get('CF-Connecting-IP')
        || request.headers.get('X-Forwarded-For')
        || request.headers.get('x-real-ip')
        || '';
    return forwarded.split(',')[0].trim();
}

async function getRestrictionStatus(kv, username, ip) {
    if (ip) {
        const ipBan = await kv.get(`ban-ip:${ip}`, 'json');
        if (ipBan) {
            if (isExpired(ipBan.expiresAt)) {
                await kv.delete(`ban-ip:${ip}`);
                await removeIpFromRegistry(kv, ip);
            } else {
                return buildRestrictionResponse(ipBan.expiresAt ? 'temp banned' : 'banned', 'ip', ipBan.reason, ipBan.expiresAt);
            }
        }
    }

    if (username) {
        const banData = await kv.get(`ban:${username}`, 'json');
        if (banData) {
            if (isExpired(banData.expiresAt)) {
                await kv.delete(`ban:${username}`);
            } else {
                return buildRestrictionResponse(banData.type === 'temp' ? 'temp banned' : 'banned', 'user', banData.reason, banData.expiresAt);
            }
        }

        const kickData = await kv.get(`kick:${username}`, 'json');
        if (kickData) {
            if (isExpired(kickData.expiresAt)) {
                await kv.delete(`kick:${username}`);
            } else {
                return buildRestrictionResponse('kicked', 'kick', kickData.reason, kickData.expiresAt);
            }
        }
    }

    return { restricted: false };
}

function buildRestrictionResponse(kind, type, reason, expiresAt) {
    return {
        restricted: true,
        kind,
        type,
        reason: normalizeReason(reason),
        expiresAt: expiresAt || null,
        timeLeft: formatRemaining(expiresAt)
    };
}

function isExpired(expiresAt) {
    return Boolean(expiresAt) && Date.now() >= new Date(expiresAt).getTime();
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

async function removeIpFromRegistry(kv, ip) {
    let registry = await kv.get('banned-ips:registry', 'json') || [];
    registry = registry.filter(entry => entry !== ip);
    await kv.put('banned-ips:registry', JSON.stringify(registry));
}
