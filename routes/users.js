import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import UsersController from '../controllers/UsersController';
import authenticateToken from '../middleware/auth';

const usersRouter = Router();
usersRouter.use('/users/me', authenticateToken);

/**
 * @apiDefine XToken
 * @apiHeader {String} X-Token Users access token
 * @apiHeaderExample Header-Example:
 * "X-Token": "a57826f0-c383-4013-b29e-d18c2e68900d"
 */

/**
 * @api {post} /users Create new user
 * @apiName PostUser
 * @apiGroup User
 * @apiDescription Create a new user profile from this endpoint.
 * @apiBody {String} email User's email
 * @apiBody {String} password User's password
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 201 OK
 *  {
 *    "id": "12345678910",
 *    "email": "user@email.com"
 *  }
 * @apiError MissingEmail User email is not provided
 * @apiError MissingPassword User password is not provide
 */
usersRouter.post('/users', UsersController.postNew);

/**
 * @api {get} /users/me Get user details
 * @apiName GetUser
 * @apiGroup User
 * @apiUse XToken
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 201 OK
 *  {
 *    "id": "643307deac9bf5303c49bc6e",
 *    "email": "user@email.com"
 *  }
 */
usersRouter.get('/users/me', AuthController.getMe);

export default usersRouter;