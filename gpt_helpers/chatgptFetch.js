
require("dotenv").config();

const KEY = process.env.OPENAI_KEY;

async function fetchFromOpenAI(messages) {
    const data = {
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.8,
    };
  
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${KEY}`,
      },
      body: JSON.stringify(data),
    });
  
    if (!response.ok) {
      throw new Error('Failed to fetch from OpenAI');
    }
  
    return await response.json();
  }

module.exports = { fetchFromOpenAI };