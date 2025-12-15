const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async function(event, context) {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    try {
        const { prompt } = JSON.parse(event.body);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        // THESE ARE THE MODELS WE WILL TRY IN ORDER
        // We try your requested 2.5 first. If it fails, we try 2.0.
        const modelPriorityList = [
            "gemini-2.5-flash",      // Your requested model
            "gemini-2.0-flash-exp",  // The official 2.0 experimental model
            "gemini-1.5-pro"         // High-end backup
        ];

        let lastError = null;

        // Loop through the models until one works
        for (const modelName of modelPriorityList) {
            try {
                console.log(`Attempting to use model: ${modelName}`);
                const model = genAI.getGenerativeModel({ model: modelName });
                
                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text();

                // IF WE GET HERE, IT WORKED!
                return {
                    statusCode: 200,
                    body: JSON.stringify({ 
                        reply: text,
                        // We send back which model actually worked so you know
                        debug_model: modelName 
                    })
                };

            } catch (error) {
                console.log(`Model ${modelName} failed.`);
                lastError = error.message;
                // Continue to the next model in the list...
            }
        }

        // If the loop finishes and NOTHING worked:
        throw new Error(`All models failed. Last error: ${lastError}`);

    } catch (error) {
        console.error("FINAL CRASH:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ 
                error: "AI Error: " + error.message 
            })
        };
    }
};
