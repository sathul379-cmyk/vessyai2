const ALLOWED_VOICES = new Set(['alloy', 'ash', 'cedar', 'coral', 'marin', 'nova', 'sage', 'verse']);

export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { text, voiceId, username, token, preview } = await request.json();

        if (!env.OPENAI_API_KEY) {
            return json({ error: 'Premium voice is not configured.' }, 503);
        }
        if (!text || !voiceId || !username || !token) {
            return json({ error: 'Missing voice request data.' }, 400);
        }

        const kv = env.VESSY_CHATS;
        if (!kv) return json({ error: 'Database not connected.' }, 500);

        const normalizedUsername = String(username).toLowerCase();
        const session = await kv.get(`session:${token}`, 'json');
        if (!session || session.username?.toLowerCase() !== normalizedUsername) {
            return json({ error: 'Invalid session.' }, 401);
        }

        const normalizedVoice = String(voiceId).replace(/^openai:/, '').toLowerCase();
        const voice = ALLOWED_VOICES.has(normalizedVoice) ? normalizedVoice : 'cedar';
        const input = String(text).replace(/\s+/g, ' ').trim().slice(0, 1200);
        if (!input) return json({ error: 'Voice text is empty.' }, 400);

        const instructions = preview
            ? 'Speak in a warm, human, natural tone. Sound welcoming and a little playful, like a polished voice assistant.'
            : 'Speak in a natural, human, conversational tone. Avoid sounding robotic, overly formal, or announcer-like.';

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini-tts',
                voice,
                input,
                instructions,
                response_format: 'mp3'
            })
        });

        if (!response.ok) {
            const errorBody = await safeJson(response);
            return json({ error: errorBody?.error?.message || 'Voice generation failed.' }, response.status);
        }

        return new Response(await response.arrayBuffer(), {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Cache-Control': 'no-store'
            }
        });
    } catch (error) {
        return json({ error: error.message || 'Voice generation failed.' }, 500);
    }
}

async function safeJson(response) {
    try {
        return await response.json();
    } catch {
        return null;
    }
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
