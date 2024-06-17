import fs from 'fs';
import path from 'path';
import { ObjectId } from 'mongodb';
import { v4 } from 'uuid';
import dbClient from './db';

const FILE_TYPES = ['folder', 'file', 'image'];
const FILES_DIR = process.env.FOLDER_PATH || '/tmp/files_manager';

// Utility class for files database operations
class FilesCollection {
  /**
   * Creates file document in database
   * @param {object} fileData - file data
   * @returns {object} - formatted file document
   */
  static async createFile(fileData) {
    const collection = dbClient.getCollection('files');
    const { name, type, data } = fileData;
    let { parentId } = fileData;
    parentId = parentId && ObjectId.isValid(parentId) ? new ObjectId(parentId) : 0;

    // Validate name and type are okay
    if (!name) throw new Error('Missing name');
    if (!FILE_TYPES.includes(type)) throw new Error('Missing type');

    // Validate data is present if type is a file or image
    if (type !== 'folder' && !data) throw new Error('Missing data');

    // Validate parent folder exists in db, its type is a folder
    const parentDocument = await FilesCollection.getFile({ _id: parentId });
    if (parentId && !parentDocument) throw new Error('Parent not found');
    if (parentId && parentDocument.type !== 'folder') throw new Error('Parent is not a folder');

    // Store folder details in db
    const fileDocument = { ...fileData, parentId };
    if (type !== 'folder') {
      fileDocument.localPath = path.join(FILES_DIR, v4());
      delete fileDocument.data;
    }
    const fileId = (await collection.insertOne(fileDocument)).insertedId;
    fileDocument._id = fileId;
    if (type !== 'folder') fileDocument.data = data;
    return fileDocument;
  }

  /**
   * Retrieves file document from database
   * @param {object} query - query parameters
   * @returns { import('mongodb').Document} - file document
   */
  static async getFile(query) {
    const collection = dbClient.getCollection('files');
    const file = await collection.findOne(query);
    return file;
  }

  /**
   * Updates file document in database
   * @param {object} query - query parameters
   * @param {object} update - update parameters
   * @returns {object} - update result
   */
  static async updateFile(query, update) {
    const collection = dbClient.getCollection('files');
    const res = await collection.updateOne(query, update);
    return res;
  }

  /**
   * Stores file data in local storage
   * @param {string} path - path to store file in local storage
   * @param {string} data - file data in base64 format
   */
  static async storeFileData(path, data) {
    // Make FOLDER_PATH directory if doesn't exist or isn't a directory
    if (!fs.existsSync(FILES_DIR) || !fs.lstatSync(FILES_DIR).isDirectory()) {
      fs.mkdirSync(FILES_DIR, { recursive: true });
    }
    // Create new file if type is file or image and add its details to db
    fs.writeFileSync(path, Buffer.from(data, 'base64'));
  }
}

export default FilesCollection;