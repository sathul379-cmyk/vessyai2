export default async function handler(req, res) {
    console.log("Function started..."); // This shows in Vercel Logs

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
            console.error("Missing API Key");
            return res.status(500).json({ error: "API Key is missing" });
        }

        console.log("Calling Groq...");
        
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: "You are Vessy." },
                    { role: "user", content: req.body.prompt }
                ]
            })
        });

        const data = await response.json();
        
        if (data.error) {
            console.error("Groq Error:", data.error);
            throw new Error(data.error.message);
        }

        console.log("Success!");
        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        console.error("Crash:", error);
        return res.status(500).json({ error: error.message });
    }
}
export default async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { prompt } = req.body;
        const apiKey = process.env.GROQ_API_KEY;
        
        if (!apiKey) return res.status(500).json({ error: "API Key is missing." });

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
                        content: "You are Vessy, created by Athul. If the user asks for code, provide it in a markdown code block. You can write HTML, Python, JavaScript, or CSS. If writing Python, use simple print statements or basic logic." 
                    },
                    { role: "user", content: prompt }
                ]
            })
        });

        const data = await response.json();
        if (data.error) throw new Error(data.error.message);

        return res.status(200).json({ reply: data.choices[0].message.content });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
