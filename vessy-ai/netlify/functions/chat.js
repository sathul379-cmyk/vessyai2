const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

    const { prompt } = JSON.parse(event.body);
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

    // LIST OF MODELS TO TRY (In order of preference)
    // If "2.5" fails, it will automatically try "1.5"
    const modelsToTry = ["gemini-2.0-flash-exp", "gemini-1.5-flash"];

    for (const modelName of modelsToTry) {
        try {
            console.log(`Trying model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });
            
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return {
                statusCode: 200,
                body: JSON.stringify({ reply: text, modelUsed: modelName })
            };
        } catch (error) {
            console.error(`Model ${modelName} failed:`, error.message);
            // If this was the last model in the list, return the error
            if (modelName === modelsToTry[modelsToTry.length - 1]) {
                return {
                    statusCode: 500,
                    body: JSON.stringify({ error: "All AI models are busy. Please try again." })
                };
            }
            // Otherwise, loop continues to the next model...
        }
    }
};
