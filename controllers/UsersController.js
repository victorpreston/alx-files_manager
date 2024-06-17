import Queue from 'bull';
import UsersCollection from '../utils/users';

// User welcome email queue
const userQueue = Queue('send welcome email');

class UsersController {
  /**
   * Controller for endpoint POST /users for creating new users
   * @typedef {import("express").Request} Request
   * @typedef {import("express").Response} Response
   * @param {Request} req - request object
   * @param {Response} res - response object
   */
  static async postNew(req, res) {
    const { email, password } = req.body;
    if (email === undefined) {
      res.status(400).json({ error: 'Missing email' });
    } else if (password === undefined) {
      res.status(400).json({ error: 'Missing password' });
    } else if (await UsersCollection.getUser({ email })) {
      res.status(400).json({ error: 'Already exist' });
    } else {
      // Create new user
      const userId = await UsersCollection.createUser(email, password);
      userQueue.add({ userId });
      res.status(201).json({ id: userId, email });
    }
  }
}

export default UsersController;