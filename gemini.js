const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function runGemini() {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const result = await model.generateContent(prompt);
    const text = response.text();
    console.log(text);
    return text;
}

module.exports = { runGemini };