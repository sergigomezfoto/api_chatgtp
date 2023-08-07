// 1. Imports and settings
require("dotenv").config();

const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const Redis = require("ioredis");
const cors = require("cors");
const NodeCache = require("node-cache");
const { manageContext } = require("./gpt_helpers/gpt_helpers");
const { fetchFromOpenAI } = require("./gpt_helpers/chatgptFetch");
const { generateSecret } = require("./helpers/secretGeneration");

const { REDIS_URL, NODE_ENV, PORT = 3000 } = process.env;

const MAX_CONTEXT_MESSAGES = 10;
const reqLimit = 4;
const LIMIT_RESET_TIME_IN_SEC = NODE_ENV === "development" ? 60 : 60; // 60 seconds for development, 2 hours for production 2 * 60 * 60

let requestStore;

if (NODE_ENV !== "development" && REDIS_URL) {
  console.log("entro");
  requestStore = new Redis(REDIS_URL);

  requestStore.on("connect", () => console.log("Connected to Redis"));
  requestStore.on("error", (err) => console.error("Error occurred with Redis:", err));
  requestStore.on("end", () => console.warn("Redis connection closed"));
} else {
  requestStore = new NodeCache({ stdTTL: LIMIT_RESET_TIME_IN_SEC, checkperiod: 120 });
}

const sessionStore = NODE_ENV !== "development" && REDIS_URL ? new RedisStore({ client: requestStore }) : new session.MemoryStore();

// Functions to get and increment request count
async function getRequestCountFromRedisOrMemory(ip) {
  if (NODE_ENV !== "development" && REDIS_URL) {
    return (await requestStore.get(ip)) || 0;
  } else {
    return requestStore.get(ip) || 0;
  }
}

async function incrementRequestCount(ip) {
  if (NODE_ENV !== "development" && REDIS_URL) {
    await requestStore.incr(ip);
    await requestStore.expire(ip, LIMIT_RESET_TIME_IN_SEC);
  } else {
    const requestCount = requestStore.get(ip) || 0;
    requestStore.set(ip, requestCount + 1, LIMIT_RESET_TIME_IN_SEC);
  }
}
async function getRequestCountRemainingTime(ip) {
    if (NODE_ENV !== 'development' && REDIS_URL) {
        const ttl = await requestStore.ttl(ip);
        return ttl >= 0 ? ttl : 0;
    } else {
        const expirationTime = requestStore.getTtl(ip);
        const currentTime = Date.now();
        const remainingTimeInSeconds = Math.ceil((expirationTime - currentTime) / 1000);
        return remainingTimeInSeconds >= 0 ? remainingTimeInSeconds : 0;
    }
}
// 3. Express setup
const app = express();

app.set("trust proxy", 1);
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
      secure: NODE_ENV === "production",
      sameSite: "none",
      httpOnly: true,
      //maxAge: 24 * 60 * 60 * 1000, // 1 day
    },
  })
);
// Middleware to limit requests by IP
app.use(async (req, res, next) => {
  try {
    const ip = req.ip;
    console.log(`Received request from IP: ${ip}`);

    const requestCount = await getRequestCountFromRedisOrMemory(ip);
    console.log(`Request count for IP ${ip}: ${requestCount}`);

    if (requestCount >= reqLimit) {
      // Don't send to OpenAI, return response directly to user
      console.log(`Rate limit: ${reqLimit} exceeded for IP ${ip}`);
      return res
        .json({
          role: "system",
          content: "Estoy haciendo demasiadas preguntas... necesito despedirme.",
        })
        .end();
    }
    // Calculate the remaining time for the reset
    const remainingTime = await getRequestCountRemainingTime(ip);
    console.log(`Time remaining for reset for IP ${ip}: ${remainingTime} seconds`);

    await incrementRequestCount(ip);
    console.log(`Request count updated for IP ${ip}`);
  } catch (error) {
    console.error("Error in middleware:", error);
    return res.status(500).json({ error: error.toString() });
  }
  console.log("------------------------------------------------------------------------------------");
  console.log("------------------------------------------------------------------------------------");
  next();
});

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
    json.limit = reqLimit;
    res.json(json);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.toString() });
  }
});

app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
