export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, token, chatId } = await request.json();
        if (!username) return json({ history: [] });

        const kv = env.VESSY_CHATS;
        if (kv) {
            const normalizedUsername = username.toLowerCase();
            const session = await kv.get(`session:${token}`, 'json');
            if (!session || session.username?.toLowerCase() !== normalizedUsername) {
                return json({ history: [], sessions: [], error: 'Invalid session.' }, 401);
            }

            let sessions = [];
            try { sessions = await kv.get(`chat-sessions:${normalizedUsername}`, 'json') || []; } catch { sessions = []; }

            const requestedId = sanitizeChatId(chatId);
            const activeId = requestedId || sessions[0]?.id || '';
            if (activeId) {
                const activeSession = await readChatSession(kv, `chat-session:${normalizedUsername}:${activeId}`, env);
                if (activeSession) {
                    return json({
                        chatId: activeSession.id,
                        history: activeSession.messages || [],
                        sessions,
                        activeSession: summarizeSession(activeSession)
                    });
                }
            }

            let legacyHistory = [];
            try { legacyHistory = await kv.get(`chats:${normalizedUsername}`, 'json') || []; } catch { legacyHistory = []; }
            if (legacyHistory.length) {
                const legacySession = {
                    id: 'legacy',
                    title: createTitle(legacyHistory.find(item => item.role === 'user')?.content),
                    preview: String(legacyHistory[legacyHistory.length - 1]?.content || '').slice(0, 140),
                    createdAt: legacyHistory[0]?.timestamp || null,
                    updatedAt: legacyHistory[legacyHistory.length - 1]?.timestamp || null,
                    messageCount: legacyHistory.length,
                    modelTier: 'smart'
                };
                return json({ chatId: 'legacy', history: legacyHistory, sessions: [legacySession, ...sessions] });
            }

            return json({ history: [], sessions: [] });
        }

        return json({ history: [] });
    } catch {
        return json({ history: [] });
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

function sanitizeChatId(value) {
    const id = String(value || '').trim();
    return /^[a-zA-Z0-9_-]{3,80}$/.test(id) ? id : '';
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
        modelTier: session.modelTier === 'fast' ? 'fast' : 'smart'
    };
}

function createTitle(message) {
    const text = String(message || 'New chat').replace(/\s+/g, ' ').trim();
    return (text || 'New chat').slice(0, 70);
}
