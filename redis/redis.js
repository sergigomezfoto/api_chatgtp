const Redis = require('ioredis');
const { REDIS_URL, NODE_ENV } = process.env;

let requestStore;

if (NODE_ENV !== 'development' && REDIS_URL) {
  console.log('entro');
  requestStore = new Redis(REDIS_URL);
  requestStore.on('connect', () => console.log('Connected to Redis'));
  requestStore.on('error', (err) => console.error('Error occurred with Redis:', err));
  requestStore.on('end', () => console.warn('Redis connection closed'));
} else {
  requestStore = new Redis({ db: 1, dropBufferSupport: true });
}

module.exports = { requestStore, REDIS_URL };