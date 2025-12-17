export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { prompt } = req.body;
        const apiKey = process.env.GROQ_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: "API Key is missing in Vercel settings." });
        }

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
                        content: "You are Vessy, a futuristic AI assistant created by Athul. If the user asks for code, provide the full HTML/CSS/JS in a single code block." 
                    },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error("Error:", error);
        return res.status(500).json({ error: error.message });
    }
}
