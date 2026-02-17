export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { username, password } = await request.json();

        if (!username || !password) {
            return json({ error: 'Username and password required.' }, 400);
        }

        const kv = env.VESSY_CHATS;

        if (kv) {
            const userData = await kv.get(`user:${username.toLowerCase()}`, 'json');
            if (!userData) {
                return json({ error: 'Account not found. Check username or create a new account.' }, 401);
            }

            const hashedInput = await hashPassword(password);
            if (hashedInput !== userData.passwordHash) {
                return json({ error: 'Incorrect password.' }, 401);
            }

            const token = generateToken();
            await kv.put(`session:${token}`, JSON.stringify({
                username: userData.username,
                createdAt: new Date().toISOString()
            }), { expirationTtl: 60 * 60 * 24 * 30 });

            return json({ success: true, username: userData.username, email: userData.email || '', token });
        }

        // FALLBACK: No KV — accept any login for development
        const token = generateToken();
        return json({ success: true, username, email: '', token, note: 'Running in local mode.' });

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
