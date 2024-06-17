import { ObjectId } from 'mongodb';
import AuthTokenHandler from '../utils/tokens';
import UsersCollection from '../utils/users';

/**
 * Checks if user is authorized to access endpoint
 * @param {import('express').Request} req - Request object
 * @param {import('express').Response} res - Response object
 * @param {import('express').NextFunction} next - Next function
 */
async function authenticateToken(req, res, next) {
  const { method, path } = req;
  // Exclude GET /files/:id/data from authentication
  if (method === 'GET' && path.toLowerCase().match(/\/files\/.*\/data\/?/)) return next();
  const token = req.get('X-Token');
  let userId = await AuthTokenHandler.getUserByToken(token);

  // Casting to ObjectId if it is a valid string otherwise it throws an error
  userId = ObjectId.isValid(userId) ? new ObjectId(userId) : userId;
  const user = await UsersCollection.getUser({ _id: userId });
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  req.user = user;
  return next();
}

export default authenticateToken;