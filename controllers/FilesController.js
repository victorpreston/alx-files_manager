import fs from 'fs';
import mime from 'mime-types';
import Queue from 'bull';
import { ObjectId } from 'mongodb';
import dbClient from '../utils/db';
import FilesCollection from '../utils/files';
import AuthTokenHandler from '../utils/tokens';
import UsersCollection from '../utils/users';
import formatFileDocument from '../utils/format';

// Thumbnail generating queue
const fileQueue = Queue('thumbnail generation');

class FilesController {
  /**
   * Controller for POST /files endpoint for handling file creation
   * @typedef {import("express").Request} Request
   * @typedef {import("express").Response} Response
   * @param {Request} req - request object
   * @param {Response} res - response object
   */
  static async postUpload(req, res) {
    const userId = req.user._id;
    let fileDocument;
    try {
      fileDocument = await FilesCollection.createFile({ ...req.body, userId });
    } catch (err) {
      res.status(400).json({ error: err.message });
      return;
    }

    if (!fileDocument.type !== 'folder') {
      // Store file data in local storage
      FilesCollection.storeFileData(fileDocument.localPath, req.body.data);

      // Add thumbnail job to queue
      const jobData = { fileId: fileDocument._id, userId };
      fileQueue.add(jobData);
    }
    res.status(201).json(formatFileDocument(fileDocument));
  }

  /**
   * Controller for GET /files/:id that retrieves files
   * information by their ids
   * @param {Request} req - request object
   * @param {Response} res - response object
   */
  static async getShow(req, res) {
    // Request params retrieval and conversion to ObjectIds
    const userId = req.user._id;
    const { id } = req.params;
    const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;

    const fileDocument = await FilesCollection.getFile({ _id, userId });
    if (!fileDocument) return res.status(404).json({ error: 'Not found' });

    const formattedResponse = formatFileDocument(fileDocument);
    return res.status(200).json(formattedResponse);
  }

  /**
   * Controller for GET /files endpoint that returns
   * all files of a logged in user
   * @param {Request} req - request object
   * @param {Response} res - response object
   */
  static async getIndex(req, res) {
    const MAX_PAGE_SIZE = 20;
    const FilesCollection = dbClient.getCollection('files');
    const userId = req.user._id;
    const { parentId = '0', page = 0 } = req.query;
    // Convert id query parameters to ObjectIds
    const _parentId = parentId && ObjectId.isValid(parentId) ? new ObjectId(parentId) : parentId;

    // Check if page number is valid
    const _page = /^\d+$/.test(page) ? parseInt(page, 10) : 0;

    // Pipeline for aggregation operation
    const pipeline = [
      { $match: { parentId: _parentId, userId } },
      { $sort: { _id: 1 } },
      { $skip: _page * MAX_PAGE_SIZE },
      { $limit: MAX_PAGE_SIZE },
    ];
    const fileDocuments = await (await FilesCollection.aggregate(pipeline)).toArray();
    const formattedResponse = fileDocuments.map((document) => formatFileDocument(document));
    res.status(200).json(formattedResponse);
  }

  /**
 * Controller for GET /files/:id/publish endpoint that updates
 * file document's isPublic field to true
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
  static async putPublish(req, res) {
    const userId = req.user._id;
    const { id } = req.params;

    // Search filers
    const updateFilter = { _id: ObjectId.isValid(id) ? new ObjectId(id) : id, userId };

    // Update parameters
    const updateOperation = { $set: { isPublic: true } };

    const commandResult = await FilesCollection.updateFile(updateFilter, updateOperation);
    if (commandResult.matchedCount) {
      const modifiedFileDOcument = await FilesCollection.getFile({ _id: updateFilter._id });
      res.status(200).json(formatFileDocument(modifiedFileDOcument));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  }

  /**
 * Controller for GET /files/:id/unpublish endpoint that updates
 * file document's isPublic field to false
 * @param {Request} req - request object
 * @param {Response} res - response object
 */
  static async putUnpublish(req, res) {
    const userId = req.user._id;
    const { id } = req.params;

    // Search filter
    const updateFilter = { _id: ObjectId.isValid(id) ? new ObjectId(id) : id, userId };
    // Update parameters
    const updateOperation = { $set: { isPublic: false } };

    const commandResult = await FilesCollection.updateFile(updateFilter, updateOperation);
    if (commandResult.matchedCount) {
      const modifiedFileDOcument = await FilesCollection.getFile({ _id: updateFilter._id });
      res.status(200).json(formatFileDocument(modifiedFileDOcument));
    } else {
      res.status(404).json({ error: 'Not found' });
    }
  }

  /**
   * Controller for /GET /files/:id/data endpoint that retrieves
   * data associated with a file
   * @param {Request} req - request object
   * @param {Response} res - response object
   */
  static async getFile(req, res) {
    const IMG_SIZES = ['500', '250', '100'];
    const token = req.get('X-Token');
    const userId = await AuthTokenHandler.getUserByToken(token);
    const user = await UsersCollection.getUser({
      _id: ObjectId.isValid(userId)
        ? ObjectId(userId) : userId,
    });
    const { id } = req.params;
    const { size } = req.query;
    const _id = ObjectId.isValid(id) ? new ObjectId(id) : id;
    const fileDocument = await FilesCollection.getFile({ _id });
    if (!fileDocument) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (!fileDocument.isPublic && !user) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    if (!fileDocument.isPublic && fileDocument.userId.toString() !== userId) {
      res.status(404).json({ error: 'Not found' });
      return;
    }

    if (fileDocument.type === 'folder') {
      res.status(400).json({ error: "A folder doesn't have content" });
      return;
    }
    let filePath = fileDocument.localPath;
    if (fileDocument.type === 'image' && IMG_SIZES.includes(size)) {
      filePath = `${filePath}_${size}`;
    }
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.append('Content-Type', mime.contentType(fileDocument.name));
    res.sendFile(filePath);
  }
}

export default FilesController;