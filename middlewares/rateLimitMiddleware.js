
// Importem les constants que necessitem per al middleware des de l'arxiu constants.js
const { REQ_LIMIT, MAX_IDLE_TIME_IN_MS } = require('../constants/constants.js');

// Definim el middleware de límit de peticions
function rateLimitMiddleware(req, res, next) {
  try {
    // Obtenim el temps de la darrera petició de la sessió o 0 si no hi ha cap
    const lastRequestTime = req.session.lastRequestTime || 0;
    // Obtenim l'hora actual en milisegons
    const currentTime = Date.now();
    // Calculem el temps transcorregut des de l'última petició fins ara
    const timeElapsed = currentTime - lastRequestTime;

    // Si el temps transcorregut és més gran o igual que el temps màxim d'inactivitat
    if (timeElapsed >= MAX_IDLE_TIME_IN_MS) {
      // Reiniciem el comptador de peticions de la sessió a 1 i actualitzem el temps de l'última petició
      req.session.requestCount = 1;
      req.session.lastRequestTime = currentTime;
    } else {
      // Si encara estem dins del temps d'inactivitat, incrementem el comptador de peticions i actualitzem el temps de l'última petició
      req.session.requestCount += 1;
      req.session.lastRequestTime = currentTime;
    }

    // Mostrem en el log informació sobre la petició actual i el nombre de peticions realitzades des de la sessió
    console.log(`Received request from sessionID: ${req.sessionID}`);
    console.log(`Request count for sessionID ${req.sessionID}: ${req.session.requestCount}`);

    // Si s'ha superat el límit de peticions per minut
    if (req.session.requestCount > REQ_LIMIT) {
      // Mostrem en el log que s'ha superat el límit i calculem el temps restant fins que es reiniciï el comptador de peticions
      console.log(`Rate limit: ${REQ_LIMIT} exceeded for sessionID ${req.sessionID}`);
      const timeRemainingInSeconds = Math.ceil((MAX_IDLE_TIME_IN_MS - timeElapsed) / 1000);
      console.log(`Time remaining: ${timeRemainingInSeconds} seconds`);

      // Enviem una resposta JSON al client indicant que s'ha arribat al límit de peticions per minut
      return res.json({
        ratelimitreached: true,
        reqlimit: REQ_LIMIT,
        maxIdleTime: MAX_IDLE_TIME_IN_MS,
        timeremaining: timeRemainingInSeconds,
      });
    }
  } catch (error) {
    // Si hi ha algun error durant el procés, mostrem l'error en el log i enviem una resposta d'error al client
    console.error("Error in rate limit middleware:", error);
    return res.status(500).json({ error: error.toString() });
  }

  // Mostrem en el log una línia separadora per marcar la fi del middleware i cridem la funció next() per passar al següent middleware o ruta
  console.log("------------------------------------------------------------------------------------");
  console.log("------------------------------------------------------------------------------------");
  next();
}

// Exportem el middleware perquè pugui ser utilitzat en altres parts del nostre codi
module.exports = rateLimitMiddleware;
