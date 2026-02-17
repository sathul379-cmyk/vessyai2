export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, email, password } = await request.json();

        if (!username || !password || username.length < 3 || password.length < 6) return json({ error: 'Username (3+) and password (6+) required.' }, 400);
        if (!/^[a-zA-Z0-9_]+$/.test(username)) return json({ error: 'Letters, numbers, underscores only.' }, 400);
        if (username.toLowerCase() === 'admin') return json({ error: 'This username is reserved.' }, 403);

        const kv = env.VESSY_CHATS;
        if (kv) {
            const existing = await kv.get(`user:${username.toLowerCase()}`, 'json');
            if (existing) return json({ error: 'Username already taken.' }, 409);

            const hash = await hashPw(password);
            const token = genToken();

            await kv.put(`user:${username.toLowerCase()}`, JSON.stringify({ username, email: email || '', passwordHash: hash, createdAt: new Date().toISOString() }));

            let reg = await kv.get('usernames:registry', 'json') || [];
            reg.push(username.toLowerCase());
            await kv.put('usernames:registry', JSON.stringify(reg));

            await kv.put(`session:${token}`, JSON.stringify({ username, createdAt: new Date().toISOString() }), { expirationTtl: 2592000 });

            return json({ success: true, username, token });
        }

        return json({ success: true, username, token: genToken() });
    } catch (error) { return json({ error: error.message }, 500); }
}

async function hashPw(pw) { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw + 'vessy-ai-31-salt-2025')); return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join(''); }
function genToken() { const a = new Uint8Array(32); crypto.getRandomValues(a); return Array.from(a, b => b.toString(16).padStart(2, '0')).join(''); }
function json(d, s = 200) { return new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } }); }
