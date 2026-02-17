export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, email, password } = await request.json();

        if (!username || !password || username.length < 3 || password.length < 6) {
            return json({ error: 'Invalid username or password.' }, 400);
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            return json({ error: 'Username: letters, numbers, underscores only.' }, 400);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Storage unavailable.' }, 500);

        // Check if username exists
        const existing = await kv.get(`user:${username.toLowerCase()}`, 'json');
        if (existing) {
            return json({ error: 'Username is already taken.' }, 409);
        }

        // Hash password (simple but effective for KV — use Web Crypto)
        const hashedPassword = await hashPassword(password);

        // Generate session token
        const token = generateToken();

        // Save user
        await kv.put(`user:${username.toLowerCase()}`, JSON.stringify({
            username: username,
            email: email || '',
            passwordHash: hashedPassword,
            createdAt: new Date().toISOString(),
            termsAccepted: true
        }));

        // Add to username registry
        let registry = await kv.get('usernames:registry', 'json') || [];
        registry.push(username.toLowerCase());
        await kv.put('usernames:registry', JSON.stringify(registry));

        // Save session
        await kv.put(`session:${token}`, JSON.stringify({
            username: username,
            createdAt: new Date().toISOString()
        }), { expirationTtl: 60 * 60 * 24 * 30 }); // 30 day session

        return json({ success: true, username, token });

    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'vessy-os-31-salt-2025');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function generateToken() {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
