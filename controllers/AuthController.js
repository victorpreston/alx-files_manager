import UsersCollection from '../utils/users';
import AuthTokenHandler from '../utils/tokens';
import PasswordHandler from '../utils/passwords';

class AuthController {
  /**
   * Controller for GET /connect endpoint for authorizing users
   * using Basic Auth scheme
   * @param {import("express").Request} req - request object
   * @param {import("express").Response} res - response object
   */
  static async getConnect(req, res) {
    // Get authorization parameters
    const authParams = req.get('Authorization');
    if (!authParams) return res.status(401).json({ error: 'Unauthorized' });

    // Get base64 authentication parameters and decrypt to ascii
    const credentials = Buffer
      .from(authParams.replace('Basic', ''), 'base64')
      .toString('ascii')
      .split(':');
    const email = credentials[0] || '';
    const password = credentials[1] || '';

    // Check if user exists
    const user = await UsersCollection.getUser({ email });
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Check if passwords match
    if (!PasswordHandler.isPasswordValid(password, user.password)) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = await AuthTokenHandler.createAuthToken(user);
    return res.status(200).json({ token });
  }

  /**
   * Controller for GET /disconnect endpoint that logs out user
   * if they were logged in.
   * @param {import("express").Request} req - request object
   * @param {import("express").Response} res - response object
   */
  static async getDisconnect(req, res) {
    const token = req.get('X-Token');
    if (!await AuthTokenHandler.getUserByToken(token)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    await AuthTokenHandler.deleteAuthToken(token);
    res.status(204).json();
  }

  /**
   * Controller for GET /users/me endpoint that retrieves information
   * about a logged in user
   * @param {import("express").Request} req - request object
   * @param {import("express").Response} res - response object
   */
  static async getMe(req, res) {
    const { user } = req;
    if (!user) res.status(401).json({ error: 'Unauthorized' });
    else res.status(200).json({ id: user._id.toString(), email: user.email });
  }
}

export default AuthController;