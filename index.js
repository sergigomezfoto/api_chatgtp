// Importem el mòdul que ens permet llegir variables d'entorn des d'un fitxer .env
require('dotenv').config();

// Importem els mòduls necessaris per al nostre servidor
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const { requestStore, REDIS_URL } = require('./redis/redis.js'); // Importem la configuració de Redis
const cors = require('cors');
const { manageContext } = require('./gpt_helpers/gpt_helpers');
const { fetchFromOpenAI } = require('./gpt_helpers/chatgptFetch');
const { generateSecret } = require('./helpers/secretGeneration');
const rateLimitMiddleware = require('./middlewares/rateLimitMiddleware');
const {
  MAX_CONTEXT_MESSAGES,
  COOKIE_MAX_AGE,
  REQ_LIMIT,
} = require('./constants/constants.js');

const { NODE_ENV, PORT = 3000 } = process.env;

// Creem l'emmagatzematge de les sessions, si estem en entorn de desenvolupament (development) utilitzem MemoryStore, si no, utilitzem Redis
const sessionStore = NODE_ENV !== 'development' && REDIS_URL ? new RedisStore({ client: requestStore }) : new session.MemoryStore();

// Creem una nova instància de l'aplicació Express
const app = express();

// Configurem l'aplicació per confiar en les cabçaleres de proxy i habilitar el cors
app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));

// Afegim els middlewares per processar les peticions JSON i les peticions URL codificades
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configurem el middleware de les sessions utilitzant el sistema d'emmagatzematge creat anteriorment
app.use(
  session({
    store: sessionStore,
    secret: generateSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production', // En producció, només permetem connexions segures (HTTPS)
      sameSite: 'none', // Permetem que les cookies siguin enviades a diferents dominis en les peticions CORS
      httpOnly: true, // Evitem l'accés directe a les cookies des de JavaScript
      maxAge: COOKIE_MAX_AGE, // L'edat màxima de les cookies en milisegons, pot ser nul·la per eliminar la cookie al tancar el navegador
    },
  })
);

// Afegim el middleware de límit de peticions per sessió, importat de l'arxiu rateLimitMiddleware.js
app.use(rateLimitMiddleware);

// Definim l'endpoint per gestionar les peticions POST a /api/chat
app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  const isInitializing = req.body.initialSetup;

  // Si es tracta d'una inicialització, carreguem els missatges de la sessió
  if (isInitializing) {
    req.session.messages = req.body.messages;
  } else {
    // Si no és una inicialització, obtenim els missatges de la sessió o una llista buida si no n'hi ha
    req.session.messages = req.session.messages || [];
    // Gestionem el context dels missatges per assegurar que no superem el límit de context
    req.session.messages = manageContext(req.session.messages, userMessage, MAX_CONTEXT_MESSAGES);
  }

  try {
    // Realitzem la crida a l'API d'OpenAI amb els missatges de la sessió
    const json = await fetchFromOpenAI(req.session.messages);
    // Afegim el missatge de resposta de l'API a la llista de missatges de la sessió
    req.session.messages.push(json.choices[0].message);
    // Afegim el límit de peticions per minut a la resposta JSON
    json.limit = REQ_LIMIT;
    // Enviem la resposta JSON al client
    res.json(json);
  } catch (error) {
    // Si hi ha un error durant el procés, mostrem l'error en el log i enviem una resposta d'error al client
    console.error("Error:", error);
    res.status(500).json({ error: error.toString() });
  }
});

// Iniciem el servidor i l'escoltem en el port especificat a l'entorn o el port 3000 per defecte
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});