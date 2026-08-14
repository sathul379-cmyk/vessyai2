const FAST_CHAT_LIMIT = 90;
const SMART_CHAT_LIMIT = 50;
const VOICE_LIMIT = 25;
const TIME_ZONE = 'Asia/Calcutta';
const RECORD_TTL_SECONDS = 60 * 60 * 24 * 14;

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { action, username, token, kind, modelTier } = await request.json();
        if (!username || !token) return json({ error: 'Username and token required.' }, 400);

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Database not connected.' }, 500);

        const normalizedUsername = String(username).toLowerCase();
        const session = await kv.get(`session:${token}`, 'json');
        if (!session || session.username?.toLowerCase() !== normalizedUsername) {
            return json({ error: 'Invalid session.' }, 401);
        }

        const dateKey = getDateKey();
        const storageKey = `usage:${normalizedUsername}:${dateKey}`;
        const current = await kv.get(storageKey, 'json') || createEmptyUsage(dateKey);

        if (action === 'get') {
            return json(buildUsageResponse(current));
        }

        if (action === 'consume') {
            if (!isValidKind(kind)) return json({ error: 'Invalid usage kind.' }, 400);
            normalizeUsageShape(current);
            const tier = normalizeModelTier(modelTier);
            const bucket = getBucket(current, kind, tier);
            const limit = getLimit(kind, tier);
            if (bucket.used >= limit) {
                return json({
                    success: false,
                    allowed: false,
                    kind,
                    modelTier: kind === 'chat' ? tier : null,
                    usage: buildUsageResponse(current)
                });
            }

            bucket.used += 1;
            current.updatedAt = new Date().toISOString();
            await kv.put(storageKey, JSON.stringify(current), { expirationTtl: RECORD_TTL_SECONDS });
            return json({
                success: true,
                allowed: true,
                kind,
                modelTier: kind === 'chat' ? tier : null,
                usage: buildUsageResponse(current)
            });
        }

        if (action === 'release') {
            if (!isValidKind(kind)) return json({ error: 'Invalid usage kind.' }, 400);
            normalizeUsageShape(current);
            const bucket = getBucket(current, kind, normalizeModelTier(modelTier));
            bucket.used = Math.max(0, bucket.used - 1);
            current.updatedAt = new Date().toISOString();
            await kv.put(storageKey, JSON.stringify(current), { expirationTtl: RECORD_TTL_SECONDS });
            return json({
                success: true,
                usage: buildUsageResponse(current)
            });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function createEmptyUsage(dateKey) {
    return {
        dateKey,
        chatFast: { used: 0 },
        chatSmart: { used: 0 },
        voice: { used: 0 },
        updatedAt: new Date().toISOString()
    };
}

function buildUsageResponse(usage) {
    normalizeUsageShape(usage);
    return {
        dateKey: usage.dateKey,
        resetLabel: 'Daily limits reset every day.',
        chat: summarizeBucket(usage.chatSmart.used, SMART_CHAT_LIMIT),
        chatFast: summarizeBucket(usage.chatFast.used, FAST_CHAT_LIMIT),
        chatSmart: summarizeBucket(usage.chatSmart.used, SMART_CHAT_LIMIT),
        voice: summarizeBucket(usage.voice.used, VOICE_LIMIT)
    };
}

function summarizeBucket(used, limit) {
    return {
        used,
        limit,
        remaining: Math.max(0, limit - used)
    };
}

function getDateKey() {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: TIME_ZONE,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).format(new Date());
}

function isValidKind(kind) {
    return kind === 'chat' || kind === 'voice';
}

function normalizeUsageShape(usage) {
    usage.chatFast ||= { used: 0 };
    usage.chatSmart ||= { used: 0 };
    usage.voice ||= { used: 0 };
    if (usage.chat?.used && !usage.chatSmart.used) {
        usage.chatSmart.used = usage.chat.used;
    }
}

function normalizeModelTier(value) {
    return value === 'fast' ? 'fast' : 'smart';
}

function getBucket(usage, kind, tier) {
    if (kind === 'voice') return usage.voice;
    return tier === 'fast' ? usage.chatFast : usage.chatSmart;
}

function getLimit(kind, tier) {
    if (kind === 'voice') return VOICE_LIMIT;
    return tier === 'fast' ? FAST_CHAT_LIMIT : SMART_CHAT_LIMIT;
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
