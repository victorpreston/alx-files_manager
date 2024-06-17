import dbClient from './db';
import Password from './passwords';

// Utility class for users database operations
class UsersCollection {
  /**
   * Creates new user document in database
   * @param {string} email - user email
   * @param {string} password - user password
   * @returns {string | null} - user id
   */
  static async createUser(email, password) {
    const collection = dbClient.getCollection('users');
    const newUser = { email, password: Password.encryptPassword(password) };
    const commandResult = await collection.insertOne(newUser);
    return commandResult.insertedId;
  }

  /**
   * Retrieves user document from database
   * @param {object} query - query parameters
   * @returns { import('mongodb').Document} - user document
   */
  static async getUser(query) {
    const collection = dbClient.getCollection('users');
    const user = await collection.findOne(query);
    return user;
  }
}

export default UsersCollection;