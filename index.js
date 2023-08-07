require("dotenv").config();

const express = require("express");
const session = require("express-session");
const RedisStore = require("connect-redis")(session);
const Redis = require("ioredis");
const cors = require("cors");
const { manageContext } = require("./gpt_helpers/gpt_helpers");
const { fetchFromOpenAI } = require("./gpt_helpers/chatgptFetch");
const { generateSecret } = require("./helpers/secretGeneration");

const { REDIS_URL, NODE_ENV, PORT = 3000 } = process.env;

const MAX_CONTEXT_MESSAGES = 10;
const reqLimit = 4;
const cookieMaxAge = null; // Cookie se eliminará cuando el navegador se cierre

let requestStore;

if (NODE_ENV !== "development" && REDIS_URL) {
  console.log("entro");
  requestStore = new Redis(REDIS_URL);
  requestStore.on("connect", () => console.log("Connected to Redis"));
  requestStore.on("error", (err) => console.error("Error occurred with Redis:", err));
  requestStore.on("end", () => console.warn("Redis connection closed"));
} else {
  requestStore = new Redis({ db: 1, dropBufferSupport: true });
}

const sessionStore = NODE_ENV !== "development" && REDIS_URL ? new RedisStore({ client: requestStore }) : new session.MemoryStore();

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
      maxAge: cookieMaxAge,
    },
  })
);

app.use((req, res, next) => {
  try {
    const lastRequestTime = req.session.lastRequestTime || 0;
    const currentTime = Date.now();

    if (currentTime - lastRequestTime >= 60 * 1000) { // 1 minuto
      req.session.requestCount = 1;
      req.session.lastRequestTime = currentTime;
    } else {
      req.session.requestCount += 1;
      req.session.lastRequestTime = currentTime;
    }

    console.log(`Received request from IP: ${req.ip}`);
    console.log(`Request count for IP ${req.ip}: ${req.session.requestCount}`);

    if (req.session.requestCount > reqLimit) {
      console.log(`Rate limit: ${reqLimit} exceeded for IP ${req.ip}`);

      const timeRemainingInSeconds = Math.ceil((60 * 1000 - (currentTime - lastRequestTime)) / 1000);
      console.log(`Time remaining: ${timeRemainingInSeconds} seconds`);

      return res.json({
        ratelimitreached: true,
        reqlimit: reqLimit,
        cookieMaxAge: cookieMaxAge,
        timeremaining: timeRemainingInSeconds,
      });
    }
  } catch (error) {
    console.error("Error in middleware:", error);
    return res.status(500).json({ error: error.toString() });
  }

  console.log("------------------------------------------------------------------------------------");
  console.log("------------------------------------------------------------------------------------");
  next();
});

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