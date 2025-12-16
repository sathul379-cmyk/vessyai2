exports.handler = async function(event, context) {
    // 1. Allow only POST
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };
    
    try {
        const { prompt } = JSON.parse(event.body);
        
        // 2. Check API Key
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("API Key missing");
            return { statusCode: 500, body: JSON.stringify({ error: "Server Error: API Key is missing in Netlify." }) };
        }

        // 3. Call Groq (Llama 3.3)
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile", 
                messages: [
                    { 
                        role: "system", 
                        content: "You are Vessy, a futuristic AI assistant created by Athul. If the user asks for code (like a game or website), provide the full HTML/CSS/JS in a single code block so it can be previewed." 
                    },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            console.error("Groq Error:", data.error);
            throw new Error(data.error.message);
        }

        return {
            statusCode: 200,
            body: JSON.stringify({ reply: data.choices[0].message.content })
        };

    } catch (error) {
        console.error("Function Crash:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
};
