export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, email, password } = await request.json();

        if (!username || !password || username.length < 3 || password.length < 6) {
            return json({ error: 'Username (3+ chars) and password (6+ chars) required.' }, 400);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return json({ error: 'Username: letters, numbers, underscores only.' }, 400);
        }

        // Try KV first
        const kv = env.VESSY_CHATS;

        if (kv) {
            // Check if username exists
            const existing = await kv.get(`user:${username.toLowerCase()}`, 'json');
            if (existing) {
                return json({ error: 'Username is already taken.' }, 409);
            }

            const hashedPassword = await hashPassword(password);
            const token = generateToken();

            // Save user
            await kv.put(`user:${username.toLowerCase()}`, JSON.stringify({
                username, email: email || '',
                passwordHash: hashedPassword,
                createdAt: new Date().toISOString()
            }));

            // Save session
            await kv.put(`session:${token}`, JSON.stringify({
                username, createdAt: new Date().toISOString()
            }), { expirationTtl: 60 * 60 * 24 * 30 });

            return json({ success: true, username, token });
        }

        // FALLBACK: No KV available — allow signup with local token
        // This lets the app work during development or before KV is set up
        const token = generateToken();
        return json({ success: true, username, token, note: 'Running in local mode — connect KV for persistent storage.' });

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
