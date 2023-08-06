// 1. Imports i configuracions
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const Redis = require("ioredis");
const cors = require('cors');
const { manageContext } = require("./gpt_helpers/gpt_helpers");
const { fetchFromOpenAI } = require("./gpt_helpers/chatgptFetch");
const { generateSecret } = require("./helpers/secretGeneration");

const { REDIS_URL, NODE_ENV, PORT = 3000 } = process.env;
const MAX_CONTEXT_MESSAGES = 10;
const redisClient = new Redis(REDIS_URL);

// 2. Configuració  Redis
redisClient.on("connect", () => console.log("Connected to Redis"));
redisClient.on("error", err => console.error("Error occurred with Redis:", err));
redisClient.on("end", () => console.warn("Redis connection closed"));

// 3. Configuració  Express
const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
    store: new RedisStore({ client: redisClient }),
    secret: generateSecret(),
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: NODE_ENV === "production",
      sameSite: "none",
      httpOnly: true,
      //maxAge: 24 * 60 * 60 * 1000, // 1 día
    },
}));


// 4. Express
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
        res.json(json);
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server started on :${PORT}`);
});