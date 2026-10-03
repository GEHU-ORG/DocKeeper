require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });

const { GoogleGenerativeAI } = require('@google/generative-ai');

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log("No GEMINI_API_KEY found in .env files.");
    return;
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
    const result = await model.generateContent("Respond with the word 'SUCCESS' if you can read this.");
    console.log("API Response:", result.response.text());
    console.log("✅ API KEY IS WORKING. Quota is NOT exceeded.");
  } catch (error) {
    console.error("❌ API CALL FAILED!");
    console.error(error);
  }
}

main();
