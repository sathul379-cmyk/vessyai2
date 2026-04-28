export async function onRequestPost(context) {
    try {
        const { request, env } = context;
        const { prompt, username, history, personalization, attachments, mode } = await request.json();
        const apiKey = env.GROQ_API_KEY;
        if (!apiKey) return json({ error: 'GROQ_API_KEY not set.' }, 500);

        const normalizedAttachments = Array.isArray(attachments) ? attachments.slice(0, 5) : [];
        const hasVisionInput = normalizedAttachments.some(item => item.kind === 'image' && item.analysisDataUrl);
        const model = hasVisionInput
            ? 'meta-llama/llama-4-scout-17b-16e-instruct'
            : 'llama-3.3-70b-versatile';
        const kv = env.VESSY_CHATS;
        const normalizedUsername = typeof username === 'string' ? username.toLowerCase() : '';
        const storedSettings = kv && normalizedUsername ? await kv.get(`settings:${normalizedUsername}`, 'json') || {} : {};
        const storedMemory = kv && normalizedUsername ? await kv.get(`memory:${normalizedUsername}`, 'json') || { snippets: [] } : { snippets: [] };

        let systemPrompt = `You are Vessy OS 31.1, a personalized AI assistant made by Athul Sanoj. The user is "${username || 'Guest'}".

Rules:
- Be warm, accurate, and natural.
- Keep the flow conversational and avoid robotic repetition.
- Do not overuse the user's name. Most replies should not mention the name at all.
- Only use the user's name when it genuinely adds warmth or clarity, and never in back-to-back replies.
- Prefer natural contractions and everyday wording over formal assistant language.
- Start with one human-sounding sentence, then continue with the helpful part.
- If the user shares files or images, analyze them directly and talk about what you found.
- For voice-call replies, sound like a real conversation: short natural sentences first, then details if needed.
- Avoid filler phrases like "you know", "as an AI", or repeated generic compliments unless they truly fit.
- Legal, medical, or financial advice must stay educational only and include a brief disclaimer.
- Never help with illegal activities.`;

        if (personalization) {
            systemPrompt += `\n\nPersonalization:\n${personalization}`;
        }

        if (storedSettings.personalizationEnabled !== false && storedMemory.snippets?.length) {
            systemPrompt += `\n\nLearned user details:\n- ${storedMemory.snippets.join('\n- ')}`;
        }

        if (mode === 'voice_call') {
            systemPrompt += `\n\nThe user is speaking in a live voice call. Reply in a natural spoken tone. Keep the opening sentence concise and human-sounding.`;
        }

        const messages = [{ role: 'system', content: systemPrompt }];
        if (history && Array.isArray(history)) {
            history.slice(-20).forEach(message => {
                if (message.role === 'user' || message.role === 'assistant') {
                    messages.push({
                        role: message.role,
                        content: String(message.content).substring(0, 2500)
                    });
                }
            });
        }

        const userMessage = buildUserMessage(prompt, normalizedAttachments, hasVisionInput);
        messages.push(userMessage);

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model,
                messages,
                temperature: mode === 'voice_call' ? 0.6 : 0.7,
                max_completion_tokens: 2048
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data?.error?.message || 'Groq request failed.');
        }
        if (data.error) throw new Error(data.error.message);

        return json({ reply: data.choices?.[0]?.message?.content || 'No reply generated.' });
    } catch (error) {
        return json({ error: error.message }, 500);
    }
}

function buildUserMessage(prompt, attachments, hasVisionInput) {
    if (!hasVisionInput) {
        const attachmentText = attachments.map(summarizeAttachment).filter(Boolean).join('\n\n');
        return {
            role: 'user',
            content: [prompt, attachmentText].filter(Boolean).join('\n\n')
        };
    }

    const content = [{ type: 'text', text: [prompt, buildVisionAttachmentText(attachments)].filter(Boolean).join('\n\n') }];
    attachments.forEach(attachment => {
        if (attachment.kind === 'image' && attachment.analysisDataUrl) {
            content.push({
                type: 'image_url',
                image_url: {
                    url: attachment.analysisDataUrl
                }
            });
        }
    });

    return {
        role: 'user',
        content
    };
}

function buildVisionAttachmentText(attachments) {
    const details = attachments.map(summarizeAttachment).filter(Boolean);
    if (!details.length) return '';
    return `Attached materials:\n${details.join('\n\n')}`;
}

function summarizeAttachment(attachment) {
    if (!attachment || !attachment.name) return '';

    if (attachment.kind === 'image') {
        return `Image: ${attachment.name}\nType: ${attachment.mimeType || 'unknown'}\nSize: ${attachment.size || 'unknown'}\nNote: ${attachment.note || 'Analyze the visible details in this image.'}`;
    }

    if (attachment.extractedText) {
        return `File: ${attachment.name}\nType: ${attachment.mimeType || 'unknown'}\nSize: ${attachment.size || 'unknown'}\nContents:\n${String(attachment.extractedText).substring(0, 7000)}`;
    }

    return `File: ${attachment.name}\nType: ${attachment.mimeType || 'unknown'}\nSize: ${attachment.size || 'unknown'}\nNote: ${attachment.note || 'Metadata only.'}`;
}

function json(data, status = 200) {
    return new Response(JSON.stringify(data), {
        status,
        headers: { 'Content-Type': 'application/json' }
    });
}
