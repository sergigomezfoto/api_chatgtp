// Importem les llibreries necessàries
const { Configuration, OpenAIApi } = require('openai');
require("dotenv").config();

// Configurem la clau d'accés a l'API de OpenAI
const config = new Configuration({
  apiKey: process.env.OPENAI_KEY
});
const openai = new OpenAIApi(config);

// Funció asincrònica que realitza una sol·licitud a l'API de OpenAI per obtenir una resposta generada pel model de llenguatge
async function fetchFromOpenAI(messages) {
  try {
    // Realitzem una crida a l'API de OpenAI per crear una completació de xat amb el model GPT-3.5 Turbo
    const response = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: messages,
      temperature: 0.5,
    });

    // Retornem les dades de resposta obtingudes de l'API de OpenAI
    return response.data;
  } catch (error) {
    // En cas d'error durant la sol·licitud a l'API, mostrem l'error en el log i llancem una excepció amb un missatge d'error personalitzat
    console.error('Error from OpenAI:', error.response?.data);
    throw new Error('Failed to fetch from OpenAI');
  }
}

// Exportem la funció fetchFromOpenAI perquè pugui ser utilitzada en altres parts del nostre codi
module.exports = { fetchFromOpenAI };
