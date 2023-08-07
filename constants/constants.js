// constants.js

// límit requests
const REQ_LIMIT = 4;
const MAX_IDLE_TIME_IN_MS = 60 * 1000; // 1 minut

// sessió
const MAX_CONTEXT_MESSAGES = 10;
const COOKIE_MAX_AGE = null; //la cookie dura durant el navegador

module.exports = {
  REQ_LIMIT,
  MAX_IDLE_TIME_IN_MS,
  MAX_CONTEXT_MESSAGES,
  COOKIE_MAX_AGE,
};