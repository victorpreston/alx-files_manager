import { Router } from 'express';
import AppController from '../controllers/AppController';

const appRouter = Router();

/**
 * @api {get} /status Get database and redis client status
 * @apiName GetStatus
 * @apiGroup Status
 * @apiDescription This end point returns the status of the mongodb
 * database client and redis client. `true` means that the specific
 * client is connected while `false` indicates failure to connect.
 * @apiSuccess {Boolean} db Database client connection status
 * @apiSuccess {Boolean} redis Redis client connection status
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "db": true,
 *    "redis": true
 *  }
 */
appRouter.get('/status', AppController.getStatus);

/**
 * @api {get} /stats Gets number of users and files
 * @apiName GetStats
 * @apiGroup Stats
 * @apiDescription This endpoint retrieves number of users and files.
 * @apiSuccess {Number} users Number of users in the database
 * @apiSuccess {Number} files Number of files in the database
 * @apiSuccessExample Success-Response:
 *  HTTP/1.1 200 OK
 *  {
 *    "users": 78,
 *    "files": 1112
 *  }
 */
appRouter.get('/stats', AppController.getStats);

export default appRouter;