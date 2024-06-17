import { createClient } from 'redis';
import { promisify } from 'util';

// Redis client class
class RedisClient {
  /**
   * Initializes new instance
   */
  constructor() {
    this.redisClient = createClient();
    this.redisClient.on('error', (error) => {
      console.log(error.message);
    });
  }

  /**
   * Check connection status of redis client
   * @returns {boolean} - redis client connection status
   */
  isAlive() {
    return this.redisClient.connected;
  }

  /**
   * Search for value associated with given key
   * @param {string} key - key to search for in redis
   * @returns {*} - value associated with key if found or null
   */
  async get(key) {
    const asyncGet = promisify(this.redisClient.get).bind(this.redisClient);
    const value = await asyncGet(key);
    return value;
  }

  /**
   * Adds a value with given key to redis
   * @param {string} key
   * @param {*} value
   * @param {int} - ttl for given key
   */

  async set(key, value, duration) {
    const asyncSet = promisify(this.redisClient.set).bind(this.redisClient);
    await asyncSet(key, value, 'EX', duration);
  }

  /**
   * Deletes a value associated with given key from redis
   * @param {string} key
   */
  async del(key) {
    const asyncDel = promisify(this.redisClient.del).bind(this.redisClient);
    await asyncDel(key);
  }

  /**
   * Closes redis client connection
   */
  async close() {
    this.redisClient.quit();
  }
}

const redisClient = new RedisClient();
export default redisClient;