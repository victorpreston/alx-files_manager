import { ObjectId } from 'mongodb';

/**
 * Creates formatted output from given document
 * @param {Object} document - document from files collection
 * @returns {Object} - formatted output
 */
export default function formatFileDocument(document) {
  let { userId, parentId } = document;
  const {
    _id, name, type, isPublic,
  } = document;
  const id = _id.toString();
  userId = userId.toString();
  parentId = parentId instanceof ObjectId ? parentId.toString() : parentId;
  const formattedResponseDocument = {
    id,
    userId,
    name,
    type,
    isPublic,
    parentId,
  };
  return formattedResponseDocument;
}