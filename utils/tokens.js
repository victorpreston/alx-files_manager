import { v4 } from 'uuid';
import redisClient from './redis';

// Auth token handler class
class AuthTokenHandler {
  /**
   * Creates a new auth token for given user
   * @param {object} user - user object
   * @param {number} duration - duration of token
   * @returns {string} - token
   */
  static async createAuthToken(user, duration = 60 * 60 * 24) {
    const token = v4();
    await redisClient.set(`auth_${token}`, user._id.toString(), duration);
    return token;
  }

  /**
   * Retrieves user object associated with given token
   * @param {string} token - token to search for
   * @returns {string | null} - user id or null if not found
   */
  static async getUserByToken(token) {
    const user = await redisClient.get(`auth_${token}`);
    return user;
  }

  /**
   * Deletes token from redis
   * @param {string} token - token to search for
   * @returns {number} - number of tokens deleted
   */
  static async deleteAuthToken(token) {
    const status = await redisClient.del(`auth_${token}`);
    return status;
  }
}

export default AuthTokenHandler;