exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    try {
        const { prompt } = JSON.parse(event.body);
        const apiKey = process.env.GROQ_API_KEY;

        if (!apiKey) return { statusCode: 500, body: JSON.stringify({ error: "API Key is missing" }) };

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    // *** THIS LINE MAKES IT SAY ATHUL MADE IT ***
                    { role: "system", content: "You are Vessy, a helpful AI assistant created by Athul. You format your answers using Markdown (bold, lists, code blocks)." },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: data.choices[0].message.content })
        };

    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};
