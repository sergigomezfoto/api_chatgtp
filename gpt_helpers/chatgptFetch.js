
const { Configuration, OpenAIApi } = require('openai');
require("dotenv").config();

const config = new Configuration({
  apiKey: process.env.OPENAI_KEY
});
const openai = new OpenAIApi(config);

async function fetchFromOpenAI(messages) {
  try {
      const response = await openai.createChatCompletion({
          model: "gpt-3.5-turbo",
          messages: messages,
          temperature: 0,
      });

      return response.data;
  } catch (error) {
      console.error('Error from OpenAI:', error.response?.data);
      throw new Error('Failed to fetch from OpenAI');
  }
}
module.exports = { fetchFromOpenAI };