export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, userMessage, aiMessage, timestamp } = await request.json();
        if (!username || !userMessage) return json({ error: 'Missing data' }, 400);

        const kv = env.VESSY_CHATS;
        if (kv) {
            const normalizedUsername = username.toLowerCase();
            const key = `chats:${normalizedUsername}`;
            let existing = [];
            try { existing = await kv.get(key, 'json') || []; } catch { existing = []; }

            existing.push({ role: 'user', content: userMessage, timestamp });
            existing.push({ role: 'assistant', content: aiMessage, timestamp });
            if (existing.length > 200) existing = existing.slice(-200);
            await kv.put(key, JSON.stringify(existing));

            const settings = await kv.get(`settings:${normalizedUsername}`, 'json') || {};
            if (settings.personalizationEnabled !== false) {
                const memory = await kv.get(`memory:${normalizedUsername}`, 'json') || { snippets: [] };
                const snippets = mergeMemorySnippets(memory.snippets || [], extractMemorySnippets(userMessage));
                await kv.put(`memory:${normalizedUsername}`, JSON.stringify({
                    snippets,
                    updatedAt: new Date().toISOString()
                }));
            }
        }

        return json({ success: true });
    } catch (error) {
        return json({ success: false, error: error.message }, 500);
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
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
