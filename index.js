const express = require("express");
const session = require("express-session");
const {  manageContext } = require("./gpt_helpers/gpt_helpers");
const { fetchFromOpenAI } = require("./gpt_helpers/chatgptFetch");
const { generateSecret } = require("./helpers/secretGeneration");

const app = express();
const PORT = process.env.PORT || 3000; 
const MAX_CONTEXT_MESSAGES = 10;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: generateSecret(),
    resave: false,
    saveUninitialized: true,
    // cookie: { secure: true }
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
