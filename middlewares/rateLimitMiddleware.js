
const { REQ_LIMIT, MAX_IDLE_TIME_IN_MS } = require('../constants/constants.js');

function rateLimitMiddleware(req, res, next) {
  try {
    const lastRequestTime = req.session.lastRequestTime || 0;
    const currentTime = Date.now();
    const timeElapsed = currentTime - lastRequestTime;

    if (timeElapsed >= MAX_IDLE_TIME_IN_MS) {
      req.session.requestCount = 1;
      req.session.lastRequestTime = currentTime;
    } else {
      req.session.requestCount += 1;
      req.session.lastRequestTime = currentTime;
    }

    console.log(`Received request from sessionID: ${req.sessionID}`);
    console.log(`Request count for sessionID ${req.sessionID}: ${req.session.requestCount}`);

    if (req.session.requestCount > REQ_LIMIT) {
      console.log(`Rate limit: ${REQ_LIMIT} exceeded for sessionID ${req.sessionID}`);
      const timeRemainingInSeconds = Math.ceil((MAX_IDLE_TIME_IN_MS - timeElapsed) / 1000);
      console.log(`Time remaining: ${timeRemainingInSeconds} seconds`);

      return res.json({
        ratelimitreached: true,
        reqlimit: REQ_LIMIT,
        maxIdleTime: MAX_IDLE_TIME_IN_MS,
        timeremaining: timeRemainingInSeconds,
      });
    }
  } catch (error) {
    console.error("Error in rate limit middleware:", error);
    return res.status(500).json({ error: error.toString() });
  }

  console.log("------------------------------------------------------------------------------------");
  console.log("------------------------------------------------------------------------------------");
  next();
}

module.exports = rateLimitMiddleware;