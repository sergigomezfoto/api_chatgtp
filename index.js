const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const Redis = require("ioredis");
require("dotenv").config();
const { REDIS_URL } = process.env;
const redisClient = new Redis(REDIS_URL);
const sessionStore = new RedisStore({ client: redisClient });
// Añade los manejadores de eventos aquí
redisClient.on("connect", function () {
  console.log("Connected to Redis");
});

redisClient.on("error", function (err) {
  console.error("Error occurred with Redis:", err);
});

redisClient.on("end", function () {
  console.warn("Redis connection closed");
});

const { manageContext } = require("./gpt_helpers/gpt_helpers");
const { fetchFromOpenAI } = require("./gpt_helpers/chatgptFetch");
const { generateSecret } = require("./helpers/secretGeneration");

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_CONTEXT_MESSAGES = 10;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store:sessionStore,
    secret: generateSecret(),
    resave: false,
    saveUninitialized: true,
    // cookie: {
    //   secure: true,
    //   sameSite: "lax",
    // },
  })
);

app.post("/api/chat", async (req, res) => {
  const userMessage = req.body.message;

  const isInitializing = req.body.initialSetup;

  if (isInitializing) {
    req.session.messages = req.body.messages;
  } else {
    if (!req.session.messages) {
      req.session.messages = [];
    }
    req.session.messages = manageContext(req.session.messages, userMessage, MAX_CONTEXT_MESSAGES);
  }

  try {
    const json = await fetchFromOpenAI(req.session.messages);
    req.session.messages.push(json.choices[0].message);
    res.json(json);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on :${PORT}`);
});
