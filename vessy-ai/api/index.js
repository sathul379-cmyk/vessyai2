const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        // 1. Get the prompt from the frontend
        const { prompt } = JSON.parse(event.body);

        // 2. Initialize Gemini with the Secure Key from Environment Variables
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        
        // *** IMPORTANT CHANGE HERE: Updated model name to gemini-2.5-flash ***
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 3. Generate Content
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // 4. Send back to frontend
        return {
            statusCode: 200,
            body: JSON.stringify({ reply: text })
        };

    } catch (error) {
        console.error("Error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "Failed to generate response" })
        };
    }
};