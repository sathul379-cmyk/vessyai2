export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { action, username, token, settings } = await request.json();
        if (!username || !token) return json({ error: 'Username and token required.' }, 400);

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Database not connected.' }, 500);

        const normalizedUsername = username.toLowerCase();
        const session = await kv.get(`session:${token}`, 'json');
        if (!session || session.username?.toLowerCase() !== normalizedUsername) {
            return json({ error: 'Invalid session.' }, 401);
        }

        if (action === 'get') {
            const user = await kv.get(`user:${normalizedUsername}`, 'json');
            const storedSettings = await kv.get(`settings:${normalizedUsername}`, 'json') || {};
            const memory = await kv.get(`memory:${normalizedUsername}`, 'json') || { snippets: [] };
            return json({
                username: user?.username || username,
                email: user?.email || '',
                createdAt: user?.createdAt || null,
                settings: {
                    personalizationEnabled: storedSettings.personalizationEnabled !== false,
                    voiceReplyEnabled: storedSettings.voiceReplyEnabled !== false,
                    preferredVoiceId: storedSettings.preferredVoiceId || ''
                },
                memory: memory.snippets || [],
                voiceCatalog: buildVoiceCatalog(env)
            });
        }

        if (action === 'save-settings') {
            const existing = await kv.get(`settings:${normalizedUsername}`, 'json') || {};
            const nextSettings = {
                ...existing,
                ...sanitizeSettings(settings)
            };
            await kv.put(`settings:${normalizedUsername}`, JSON.stringify(nextSettings));
            return json({ success: true, settings: nextSettings });
        }

        if (action === 'clear-memory') {
            await kv.put(`memory:${normalizedUsername}`, JSON.stringify({ snippets: [], updatedAt: new Date().toISOString() }));
            return json({ success: true });
        }

        if (action === 'delete-account') {
            await kv.delete(`user:${normalizedUsername}`);
            await kv.delete(`chats:${normalizedUsername}`);
            await kv.delete(`memory:${normalizedUsername}`);
            await kv.delete(`settings:${normalizedUsername}`);
            await kv.delete(`ban:${normalizedUsername}`);
            await kv.delete(`kick:${normalizedUsername}`);
            await kv.delete(`session:${token}`);

            let registry = await kv.get('usernames:registry', 'json') || [];
            registry = registry.filter(entry => entry !== normalizedUsername);
            await kv.put('usernames:registry', JSON.stringify(registry));

            return json({ success: true });
        }

        return json({ error: 'Unknown action.' }, 400);
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function sanitizeSettings(settings) {
    const input = settings && typeof settings === 'object' ? settings : {};
    const output = {
        personalizationEnabled: input.personalizationEnabled !== false
    };

    if (typeof input.voiceReplyEnabled === 'boolean') {
        output.voiceReplyEnabled = input.voiceReplyEnabled;
    }
    if (typeof input.preferredVoiceId === 'string') {
        output.preferredVoiceId = input.preferredVoiceId.slice(0, 80);
    }

    return output;
}

function buildVoiceCatalog(env) {
    if (!env.OPENAI_API_KEY) {
        return {
            provider: 'browser',
            available: false,
            voices: []
        };
    }

    return {
        provider: 'openai',
        available: true,
        voices: [
            { id: 'openai:cedar', label: 'Cedar' },
            { id: 'openai:marin', label: 'Marin' },
            { id: 'openai:coral', label: 'Coral' },
            { id: 'openai:ash', label: 'Ash' },
            { id: 'openai:sage', label: 'Sage' },
            { id: 'openai:verse', label: 'Verse' },
            { id: 'openai:alloy', label: 'Alloy' },
            { id: 'openai:nova', label: 'Nova' }
        ]
    };
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
