export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, token, chatId, userMessage, aiMessage, timestamp, modelTier } = await request.json();
        if (!username || !token || !userMessage) return json({ error: 'Missing data' }, 400);

        const kv = env.VESSY_CHATS;
        if (kv) {
            const normalizedUsername = username.toLowerCase();
            const session = await kv.get(`session:${token}`, 'json');
            if (!session || session.username?.toLowerCase() !== normalizedUsername) {
                return json({ error: 'Invalid session.' }, 401);
            }

            const safeChatId = sanitizeChatId(chatId) || createChatId();
            const now = normalizeTimestamp(timestamp);
            const key = `chat-session:${normalizedUsername}:${safeChatId}`;
            let chatSession = await readChatSession(kv, key, env) || {
                id: safeChatId,
                title: createTitle(userMessage),
                createdAt: now,
                updatedAt: now,
                modelTier: normalizeModelTier(modelTier),
                messages: []
            };

            chatSession.updatedAt = now;
            chatSession.modelTier = normalizeModelTier(modelTier || chatSession.modelTier);
            chatSession.messages.push({ role: 'user', content: userMessage, timestamp: now });
            chatSession.messages.push({ role: 'assistant', content: aiMessage, timestamp: now });
            if (chatSession.messages.length > 160) chatSession.messages = chatSession.messages.slice(-160);

            await writeChatSession(kv, key, env, chatSession);
            await updateSessionRegistry(kv, normalizedUsername, summarizeSession(chatSession));

            const settings = await kv.get(`settings:${normalizedUsername}`, 'json') || {};
            if (settings.personalizationEnabled !== false) {
                const memory = await kv.get(`memory:${normalizedUsername}`, 'json') || { snippets: [] };
                const snippets = mergeMemorySnippets(memory.snippets || [], extractMemorySnippets(userMessage));
                await kv.put(`memory:${normalizedUsername}`, JSON.stringify({
                    snippets,
                    updatedAt: new Date().toISOString()
                }));
            }

            return json({ success: true, chatId: safeChatId, session: summarizeSession(chatSession) });
        }

        return json({ success: true });
    } catch (error) {
        return json({ success: false, error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
}

async function readChatSession(kv, key, env) {
    const stored = await kv.get(key, 'json');
    if (!stored) return null;
    if (!stored.encrypted) return stored;
    return decryptJson(stored, env.CHAT_ENCRYPTION_SECRET);
}

async function writeChatSession(kv, key, env, session) {
    const payload = env.CHAT_ENCRYPTION_SECRET
        ? await encryptJson(session, env.CHAT_ENCRYPTION_SECRET)
        : session;
    await kv.put(key, JSON.stringify(payload));
}

async function encryptJson(value, secret) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(JSON.stringify(value));
    const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await encryptionKey(secret), encoded);
    return {
        encrypted: true,
        version: 1,
        iv: base64Encode(iv),
        data: base64Encode(new Uint8Array(encrypted))
    };
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
    return crypto.subtle.importKey('raw', material, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

function base64Encode(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
}

function base64Decode(value) {
    return Uint8Array.from(atob(value), char => char.charCodeAt(0));
}

async function updateSessionRegistry(kv, username, summary) {
    const key = `chat-sessions:${username}`;
    let sessions = [];
    try { sessions = await kv.get(key, 'json') || []; } catch { sessions = []; }
    sessions = [summary, ...sessions.filter(item => item?.id !== summary.id)].slice(0, 50);
    await kv.put(key, JSON.stringify(sessions));
}

function summarizeSession(session) {
    const firstUser = session.messages?.find(item => item.role === 'user')?.content || session.title || 'New chat';
    const lastMessage = session.messages?.[session.messages.length - 1]?.content || '';
    return {
        id: session.id,
        title: session.title || createTitle(firstUser),
        preview: String(lastMessage || firstUser).replace(/\s+/g, ' ').trim().slice(0, 140),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        messageCount: session.messages?.length || 0,
        modelTier: normalizeModelTier(session.modelTier)
    };
}

function createChatId() {
    const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36);
    return `chat-${Date.now().toString(36)}-${random}`;
}

function sanitizeChatId(value) {
    const id = String(value || '').trim();
    return /^[a-zA-Z0-9_-]{3,80}$/.test(id) ? id : '';
}

function createTitle(message) {
    const text = String(message || 'New chat').replace(/\s+/g, ' ').trim();
    return (text || 'New chat').slice(0, 70);
}

function normalizeTimestamp(value) {
    const date = value ? new Date(value) : new Date();
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function normalizeModelTier(value) {
    return value === 'fast' ? 'fast' : 'smart';
}

function extractMemorySnippets(message) {
    const text = String(message || '').replace(/\s+/g, ' ').trim();
    if (!text || text.length < 8 || text.length > 220) return [];

    const lower = text.toLowerCase();
    const patterns = [
        /\b(call me|my name is|i am|i'm|i live|i work|i study|i like|i love|i prefer|my favorite|remember that)\b/i
    ];
    if (!patterns.some(pattern => pattern.test(lower))) return [];

    return [text];
}

function mergeMemorySnippets(existing, additions) {
    const seen = new Set();
    const merged = [...existing, ...additions]
        .map(item => String(item).trim())
        .filter(Boolean)
        .filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    return merged.slice(-20);
}
