import fs from 'fs';
import path from 'path';
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
  * 1. GET /files
  * 2. GET /files/:id
  * 3. GET /files:id/data
  */
describe('FileController.js tests - File info and data retrieval endpoints', () => {
  let dbClient;
  let db;
  let rdClient;
  let asyncSet;
  let asyncKeys;
  let asyncDel;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  const FOLDER_PATH = process.env.FOLDER_PATH || '/tmp/files_manager';
  const MAX_PAGE_SIZE = 20;
  const initialPassword = 'supersecretFYI';
  const hashedPassword = sha1(initialPassword);
  const userOne = { _id: new ObjectId(), email: 'tester@mail.com', password: hashedPassword };
  const userTwo = { _id: new ObjectId(), email: 'dev@mail.com', password: hashedPassword };
  const userOneToken = v4();
  const userTwoToken = v4();
  const userOneTokenKey = `auth_${userOneToken}`;
  const userTwoTokenKey = `auth_${userTwoToken}`;

  const folders = [];
  const files = [];
  const randomString = () => Math.random().toString(32).substring(2);

  before(() => new Promise((resolve) => {
    // Connect to db and clear collections
    dbClient = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    dbClient.connect(async (error, client) => {
      if (error) throw error;
      db = await client.db(DATABASE);
      await db.collection('users').deleteMany({});

      // Create test user
      await db.collection('users').insertMany([userOne, userTwo]);

      // Add files to db
      for (let i = 0; i < 10; i += 1) {
        const newFolder = {
          _id: new ObjectId(),
          name: randomString(),
          type: 'folder',
          parentId: '0',
          userId: (userOne._id),
          isPublic: !!(i % 2),
        };
        folders.push(newFolder);
      }
      for (let i = 0; i < 25; i += 1) {
        const newFile = {
          _id: new ObjectId(),
          name: `${randomString()}.txt`,
          type: 'file',
          parentId: folders[0]._id,
          userId: userOne._id,
          isPublic: !!(i % 2),
          localPath: path.join(FOLDER_PATH, v4()),
        };
        files.push(newFile);
      }
      await db.collection('files').insertMany(folders);
      await db.collection('files').insertMany(files);

      // Write data for testing
      const publicFile = files.find((file) => file.isPublic === true);
      const privateFile = files.find((file) => file.isPublic === false);
      const publicData = 'Hello World';
      const privateData = 'This is private';
      if (!fs.existsSync(FOLDER_PATH)) {
        fs.mkdirSync(FOLDER_PATH);
      }
      fs.writeFileSync(publicFile.localPath, publicData);
      fs.writeFileSync(privateFile.localPath, privateData);

      // Connect to redis and set authentication tokens
      rdClient = createClient();
      asyncSet = promisify(rdClient.set).bind(rdClient);
      asyncKeys = promisify(rdClient.keys).bind(rdClient);
      asyncDel = promisify(rdClient.del).bind(rdClient);
      rdClient.on('connect', async () => {
        await asyncSet(userOneTokenKey, userOne._id.toString());
        await asyncSet(userTwoTokenKey, userTwo._id.toString());
        resolve();
      });
    });
  }));

  after(async () => {
    // Delete files
    fs.rmdirSync(FOLDER_PATH, { recursive: true });

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

  describe('GET /files:id', () => {
    it('should return file details given valid token and user id', () => {
      const file = files[0];
      request(app)
        .get(`/files/${file._id}`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          const responseAttributes = ['id', 'userId', 'name', 'type', 'isPublic', 'parentId'];
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body).to.include.all.keys(responseAttributes);
          expect(res.body.id).to.equal(file._id.toString());
        });
    });

    it('should reject the request if the token is invalid', () => {
      const file = files[0];
      request(app)
        .get(`/files/${file._id}`)
        .set('X-Token', v4())
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
        });
    });

    it('should return not found if file does not exist', () => {
      request(app)
        .get(`/files/${new ObjectId().toString()}`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Not found');
        });
    });
  });

  describe('GET /files/:id/data', () => {
    it('should fetch data of specified file', (done) => {
      const file = files.find((file) => file.isPublic === true);
      request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.equal('Hello World');
          done();
        });
    });

    it('should allow cross-user file access as long as the files are public', () => {
      const file = files.find((file) => file.isPublic === true);
      request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userTwoToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.equal('Hello World');
        });
    });

    it('should allow user to view personal private files', () => {
      const file = files.find((file) => file.isPublic === false);
      request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.text).to.equal('This is private');
        });
    });

    it('should reject request for private files that do not belong to user', (done) => {
      const file = files.find((file) => file.isPublic === false);
      request(app)
        .get(`/files/${file._id.toString()}/data`)
        .set('X-Token', userTwoToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(404);
          expect(res.body.error).to.equal('Not found');
          done();
        });
    });

    it('should reject request for files that are folders', (done) => {
      const folder = folders[0];
      request(app)
        .get(`/files/${folder._id}/data`)
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal("A folder doesn't have content");
          done();
        });
    });
  });

  describe('GET /files', () => {
    it('should fetch files without query parameters parentId and page i.e. implicit ParentId=0 and page=0', () => {
      request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res.body).to.be.an('Array').with.lengthOf(10);
        });
    });
    it('should fetch files when parentId= 0 and page=0 i.e. explicit ParentId=0 and page=0', () => {
      request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: '0', page: 0 })
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res.body).to.be.an('Array').with.lengthOf(10);
        });
    });
    it('should fetch files when correct, non-zero parentId is provided', () => {
      request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: folders[0]._id.toString(), page: 0 })
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res.body).to.be.an('Array').with.lengthOf(MAX_PAGE_SIZE);
        });
    });
    it('should fetch second page when correct, non-zero parentId is provided', () => {
      request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: folders[0]._id.toString(), page: 1 })
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res.body).to.be.an('Array').with.lengthOf(5);
        });
    });

    it('should return an empty list when page is out of index', () => {
      request(app)
        .get('/files')
        .set('X-Token', userOneToken)
        .query({ parentId: folders[0]._id, page: 2 })
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res.body).to.be.an('Array').with.lengthOf(0);
        });
    });

    it('should return an empty list when user has no files', () => {
      request(app)
        .get('/files')
        .set('X-Token', userTwoToken)
        .query({ parentId: '0', page: 0 })
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res.body).to.be.an('Array').with.lengthOf(0);
        });
    });
  });
});