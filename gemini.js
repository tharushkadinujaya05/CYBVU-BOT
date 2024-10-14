const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI.API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

async function run() {
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });
    const prompt = "Write a story about a magic backpack.";
    const result = await model.generateContent(prompt);
    console.log(result.response.text());
}

