export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, password } = await request.json();

        if (!username || !password) {
            return json({ error: 'Username and password required.' }, 400);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Storage unavailable.' }, 500);

        // Get user
        const userData = await kv.get(`user:${username.toLowerCase()}`, 'json');
        if (!userData) {
            return json({ error: 'Account not found. Check username or sign up.' }, 401);
        }

        // Verify password
        const hashedInput = await hashPassword(password);
        if (hashedInput !== userData.passwordHash) {
            return json({ error: 'Incorrect password.' }, 401);
        }

        // Generate new session token
        const token = generateToken();
        await kv.put(`session:${token}`, JSON.stringify({
            username: userData.username,
            createdAt: new Date().toISOString()
        }), { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days

        return json({
            success: true,
            username: userData.username,
            email: userData.email || '',
            token
        });

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
