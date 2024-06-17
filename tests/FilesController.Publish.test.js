import chai from 'chai';
import chaiHttp from 'chai-http';
import sha1 from 'sha1';
import { ObjectId, MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { promisify } from 'util';
import { v4 } from 'uuid';
import app from '../server';

chai.use(chaiHttp);
const { expect, request } = chai;
/**
 * Test cases for FileController.js endpoints:
 * 1. PUT files/:id/publish
 * 2. PUT files/:id/unpublish
 */
describe('FileController.js tests - publishing endpoints', () => {
  let dbClient;
  let db;
  let rdClient;
  let asyncSet;
  let asyncKeys;
  let asyncDel;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  const initialPassword = 'supersecretFYI';
  const hashedPassword = sha1(initialPassword);
  const user = { _id: new ObjectId(), email: 'tester@mail.com', password: hashedPassword };
  const token = v4();
  const tokenKey = `auth_${token}`;
  const file = {
    _id: new ObjectId(),
    name: Math.random().toString(32).substring(2),
    type: 'file',
    parentId: '0',
    userId: user._id,
    isPublic: false,
  };

  before(() => new Promise((resolve) => {
    // Connect to db and clear collections
    dbClient = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    dbClient.connect(async (error, client) => {
      if (error) throw error;
      db = await client.db(DATABASE);

      // Create test user and folder
      await db.collection('users').insertOne(user);
      await db.collection('files').insertOne(file);

      // Connect to redis and clear keys
      rdClient = createClient();
      asyncSet = promisify(rdClient.set).bind(rdClient);
      asyncKeys = promisify(rdClient.keys).bind(rdClient);
      asyncDel = promisify(rdClient.del).bind(rdClient);
      rdClient.on('connect', async () => {
        await asyncSet(tokenKey, user._id.toString());
        resolve();
      });
    });
  }));

  after(async () => {
    // Clear db collections
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
    await db.dropDatabase();
    await dbClient.close();

    // Clear redis keys and close connection
    const tokens = await asyncKeys('auth_*');
    const deleteKeysOperations = [];
    for (const key of tokens) {
      deleteKeysOperations.push(asyncDel(key));
    }
    await Promise.all(deleteKeysOperations);
    rdClient.quit();
  });

  describe('PUT /publish', () => {
    it('should set isPublished field to true', (done) => {
      request(app)
        .put(`/files/${file._id}/publish`)
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.isPublic).to.be.true;
          done();
        });
    });

    it('should unauthorize changes if incorrect token is provided', (done) => {
      request(app)
        .put(`/files/${file.id}/publish`)
        .set('X-Token', v4())
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });

    it('should not make any changes if file is not found', (done) => {
      request(app)
        .put(`/files/${new ObjectId()}/publish`)
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Not found');
          done();
        });
    });
  });

  describe('PUT /unpublish', () => {
    it('should set isPublished field to false', (done) => {
      request(app)
        .put(`/files/${file._id}/unpublish`)
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.isPublic).to.be.false;
          done();
        });
    });

    it('should unauthorize changes if incorrect token is provided', (done) => {
      request(app)
        .put(`/files/${file._id}/unpublish`)
        .set('X-Token', v4())
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });

    it('should not make any changes if file is not found', (done) => {
      request(app)
        .put(`/files/${new ObjectId()}/unpublish`)
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Not found');
          done();
        });
    });
  });
});