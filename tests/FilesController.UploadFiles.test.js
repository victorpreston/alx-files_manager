import fs from 'fs';
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
 * 1. POST files
 */
describe('FileController.js tests - file upload endpoint', () => {
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
  const initialPassword = 'supersecretFYI';
  const hashedPassword = sha1(initialPassword);
  const user = { _id: new ObjectId(), email: 'tester@mail.com', password: hashedPassword };
  const token = v4();
  const tokenKey = `auth_${token}`;
  const folder = {
    _id: new ObjectId(),
    name: 'poems',
    type: 'folder',
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
      await db.collection('users').deleteMany({});

      // Create test user
      await db.collection('users').insertOne(user);
      await db.collection('files').insertOne(folder);

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
    // Delete files
    fs.rmdirSync(FOLDER_PATH, { recursive: true });

    // Clear db collections
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
    await db.dropDatabase();
    await dbClient.close();

    // Clear redis keys and close connection
    const tokens = await asyncKeys('auth_*');
    const thumbnailJobs = await asyncKeys('bull*')
    const deleteKeysOperations = [];
    for (const key of tokens) {
      deleteKeysOperations.push(asyncDel(key));
    }
    for (const key of thumbnailJobs) {
      deleteKeysOperations.push(asyncDel(key));
    }
    await Promise.all(deleteKeysOperations);
    rdClient.quit();
  });

  describe('POST /files', () => {
    let file;
    const data = Buffer.from('Hello World').toString('base64');

    beforeEach(() => {
      file = {
        name: Math.random().toString(32).substring(2),
        type: 'file',
        isPublic: false,
        data: data,
      };
    });

    it('should add a file to the database with parentId=0', (done) => {
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((error, res) => {
          const responseAttributes = ['id', 'userId', 'name', 'type', 'isPublic', 'parentId'];
          expect(error).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body).to.include.all.keys(responseAttributes);
          expect(res.body.name).to.equal(file.name);
          expect(res.body.type).to.equal(file.type);
          expect(res.body.isPublic).to.equal(file.isPublic);
          expect(res.body.parentId).to.equal(0);
          expect(fs.existsSync(FOLDER_PATH)).to.be.true;
          expect(fs.lstatSync(FOLDER_PATH).isDirectory()).to.be.true;
          expect(fs.readdirSync(FOLDER_PATH)).to.have.lengthOf.greaterThan(0);
          done();
        });
    });

    it('should add a file to the database with a given parentId', (done) => {
      file.parentId = folder._id.toString();
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body.parentId).to.equal(folder._id.toString());
          expect(fs.readdirSync(FOLDER_PATH).length).to.equal(2);
          done();
        });
    });

    it('should unauthorize uploads using wrong token', (done) => {
      request(app)
        .post('/files')
        .set('X-Token', v4())
        .send(file)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });

    it('should unauthorize uploads with missing name', (done) => {
      delete file.name;
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Missing name');
          done();
        });
    });

    it('should unauthorize uploads with missing type', (done) => {
      delete file.type;
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Missing type');
          done();
        });
    });

    it('should unauthorize uploads with missing data if they are files', (done) => {
      delete file.data;
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Missing data');
          done();
        });
    });

    it('should unauthorize uploads if parentId is not linked to any document', (done) => {
      file.parentId = new ObjectId().toString();
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(400);
          expect(res.body.error).to.equal('Parent not found');
          done();
        });
    });

    it('should unauthorize uploads if parentId is for a file or image and not a folder', (done) => {
      request(app)
        .post('/files')
        .set('X-Token', token)
        .send(file)
        .end((_error, res) => {
          file.parentId = res.body.id;
          request(app)
            .post('/files')
            .set('X-Token', token)
            .send(file)
            .end((error, res) => {
              expect(error).to.be.null;
              expect(res).to.have.status(400);
              expect(res.body.error).to.equal('Parent is not a folder');
              done();
            });
        });
    });
  });
});