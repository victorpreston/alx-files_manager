import { Router } from 'express';
import AuthController from '../controllers/AuthController';
import authenticateToken from '../middleware/auth';

const authRouter = Router();

authRouter.use('/disconnect', authenticateToken);

/**
 * @apiDefine XToken
 * @apiHeader {String} X-Token Users access token
 * @apiHeaderExample Header-Example:
 * "X-Token": "a57826f0-c383-4013-b29e-d18c2e68900d"
 */

/**
 * @apiDefine Unauthorized
 * @apiError UnauthorizedAccess Invalid or missing token
 */

/**
 * @api {get} /connect User login
 * @apiName GetConnect
 * @apiGroup Authentication
 * @apiDescription Login in to the system through this endpoint.
 * Providing the right credential generates a user token that can
 * be used to access restricted endpoints. The token is valid for
 * 24 hours.
 * @apiBody {String} email User's email
 * @apiBody {String} password User's password
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "token": "a57826f0-c383-4013-b29e-d18c2e68900d"
 *  }
 */

authRouter.get('/connect', AuthController.getConnect);
/**
 * @api {get} /disconnect User logout
 * @apiName GetDisconnect
 * @apiGroup Authentication
 * @apiDescription Log out from the system through this endpoint.
 * Your use token cannot be used for subsequent access to restricted
 * endpoint after you log out.
 * @apiUse XToken
 * @apiUse Unauthorized
 */
authRouter.get('/disconnect', AuthController.getDisconnect);

export default authRouter;