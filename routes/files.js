import { Router } from 'express';
import FilesController from '../controllers/FilesController';
import authenticateToken from '../middleware/auth';

const filesRouter = Router();

/**
 * GET /files/:id/data is excluded from this middleware
 * It uses a different authentication approach since it
 * response unauthorized access differs from the rest of the
 * files routes
 */
filesRouter.use(authenticateToken);

/**
 * @apiDefine XToken
 * @apiHeader {String} X-Token Users access token
 * @apiHeaderExample Header-Example:
 * "": ""
 */

/**
 * @apiDefine Unauthorized
 * @apiError UnauthorizedAccess Invalid or missing token
 */

/**
 * @apiDefine NotFound
 * @apiError NotFound File not found
 */

/**
 * @api {post} /files Post a file
 * @apiName PostFile
 * @apiGroup Files
 * @apiDescription Upload a new file or folder to the API.
 * Three thumbnails of the file are generated when the files is uploaded.
 * The thumbnails' widths are `100`, `250` and `500`
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiBody {String} name Filename
 * @apiBody {String=folder, file, image} type File type
 * @apiBody {String} [parentId=0] File's parent Id. Default: 0
 * @apiBody {Boolean} [isPublic=false] File view status
 * @apiBody {String} [data] Base64 content of file. Mandatory for type `file` and `image`
 * @apiSuccessExample Success-Response
 *  HTTP/1.1 201 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": false
 *  }
 * @apiError MissingFileName File name is absent
 * @apiError MissingFileType File type is absent
 * @apiError MissingFileData File data is missing. Applicable to uploads of type `file` and `image`
 */
filesRouter.post('/files', FilesController.postUpload);

/**
 * @api {get} /files/:id Get file details
 * @apiName GetFilesById
 * @apiGroup Files
 * @apiDescription Get file information from the API.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiQuery {Number=100, 250, 500} [size] Specific file size to retrieve.
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": false
 *  }
 */
filesRouter.get('/files/:id', FilesController.getShow);

/**
 * @api {get} /files Get user's files
 * @apiName GetFiles
 * @apiGroup Files
 * @apiDescription Get all files belonging to a user.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiQuery {String=0} [parentId] Parent id of files you want to view
 * @apiQuery {Number=0} [page] Page for navigation. Max files per page is 20
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  [
 *    {
 *      "id": "6432fdc01815ce25f2bc5871",
 *      "name": "myFile.txt",
 *      "type": "folder",
 *      "userId": "643307deac9bf5303c49bc6e"
 *      "parentId": "6432fe1b1815ce25f2bc5873",
 *      "isPublic": false
 *    },
 *    {
 *      "id": "6432fdc01815ce25f2bc7122",
 *      "name": "myFile.txt",
 *      "type": "folder",
 *      "userId": "643307deac9bf5303c49bc6e",
 *      "parentId": "6432fe1b1815ce25f2bc5873",
 *      "isPublic": false
 *    },
 *    {
 *      "id": "6432fdc01815ce25f2bc9876",
 *      "name": "myFile.txt",
 *      "type": "folder",
 *      "userId": "643307deac9bf5303c49bc6e",
 *      "parentId": 0,
 *      "isPublic": true
 *    }
 *  ]
 */
filesRouter.get('/files', FilesController.getIndex);

/**
 * @api {put} /files/:id Publish a file
 * @apiName PutPublish
 * @apiGroup Files
 * @apiDescription Change the viewing status of a file to public. This allows
 * other users to view data from this file.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": true
 *  }
 */
filesRouter.put('/files/:id/publish', FilesController.putPublish);

/**
 * @api {put} /files/:id Unpublish a file
 * @apiName PutUnPublish
 * @apiGroup Files
 * @apiDescription Change the viewing status of a file to private.
 * Other users cannot see your file when you unpublish it.
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  {
 *    "id": "6432fdc01815ce25f2bc5871",
 *    "name": "myFile.txt",
 *    "type": "folder",
 *    "userId": "643307deac9bf5303c49bc6e",
 *    "parentId": "6432fe1b1815ce25f2bc5873",
 *    "isPublic": false
 *  }
 */
filesRouter.put('/files/:id/unpublish', FilesController.putUnpublish);

/**
 * @api {put} /files/:id/data Gets file data
 * @apiName GetFileData
 * @apiGroup Files
 * @apiDescription This endpoint retrieves data of a `file` or `image`
 * belonging to a user. The files data is also accessible to other users
 * if it has been published, i.e, `isPublic` is `true`
 * @apiUse XToken
 * @apiUse Unauthorized
 * @apiUse NotFound
 * @apiParam {String} id Files unique ID
 * @apiSuccessExample Success-Example:
 *  HTTP/1.1 200 OK
 *  "Hello World"
 */
filesRouter.get('/files/:id/data', FilesController.getFile);

export default filesRouter;