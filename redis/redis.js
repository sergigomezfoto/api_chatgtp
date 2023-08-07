// Importem la llibreria ioredis, que és un client de Redis per a Node.js
const Redis = require('ioredis');

// Obtenim les variables d'entorn REDIS_URL i NODE_ENV utilitzant destructuring
const { REDIS_URL, NODE_ENV } = process.env;

// Declarem una variable per emmagatzemar la connexió de Redis
let requestStore;

// Comprovem si estem en entorn de producció (NODE_ENV és diferent de "development") i si tenim una URL de Redis vàlida (REDIS_URL)
if (NODE_ENV !== 'development' && REDIS_URL) {
  // Si és així, inicialitzem la connexió a Redis amb la URL proporcionada
  requestStore = new Redis(REDIS_URL);

  // Afegim gestors d'esdeveniments per a la connexió
  requestStore.on('connect', () => console.log('Connected to Redis'));
  requestStore.on('error', (err) => console.error('Error occurred with Redis:', err));
  requestStore.on('end', () => console.warn('Redis connection closed'));
} else {
  // Si no estem en entorn de producció o no tenim una URL de Redis, creem una connexió local a Redis amb la configuració per defecte
  requestStore = new Redis({ db: 1, dropBufferSupport: true });
}

// Exportem la connexió de Redis (requestStore) i la URL de Redis (REDIS_URL) perquè puguin ser utilitzades en altres parts del nostre codi
module.exports = { requestStore, REDIS_URL };