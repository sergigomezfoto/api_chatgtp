require('dotenv').config();

const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis')(session);
const {requestStore,REDIS_URL} = require('./redis/redis.js'); // Importar la configuració de Redis
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

const sessionStore = NODE_ENV !== 'development' && REDIS_URL ? new RedisStore({ client: requestStore }) : new session.MemoryStore();

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    store: sessionStore,
    secret: generateSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === 'production',
      sameSite: 'none',
      httpOnly: true,
      maxAge: COOKIE_MAX_AGE,
    },
  })
);

app.use(rateLimitMiddleware);

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;
  const isInitializing = req.body.initialSetup;

  if (isInitializing) {
    req.session.messages = req.body.messages;
  } else {
    req.session.messages = req.session.messages || [];
    req.session.messages = manageContext(req.session.messages, userMessage, MAX_CONTEXT_MESSAGES);
  }

  try {
    const json = await fetchFromOpenAI(req.session.messages);
    req.session.messages.push(json.choices[0].message);
    json.limit = REQ_LIMIT;
    res.json(json);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});