import chai from 'chai';
import chaiHttp from 'chai-http';
import { MongoClient } from 'mongodb';
import sha1 from 'sha1';
import app from '../server';

chai.use(chaiHttp);
const { expect, request } = chai;

/**
 * Test cases for AppController.js endpoints:
 * 1. GET /status
 * 2. GET /stats
 */
describe('App controller tests', () => {
  let client;
  let db;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  const users = [];
  const files = [];
  const randomString = () => Math.random().toString(16).substring(2);

  before(() => new Promise((resolve) => {
    // Connect to db
    client = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    client.connect(async (error, client) => {
      if (error) throw error;

      // Clear user and files collections
      db = client.db(DATABASE);
      db.collection('users').deleteMany({});
      await db.collection('files').deleteMany({});

      // Populate user and files collections
      for (let i = 0; i < 5; i++) {
        const newUser = {
          email: `${randomString()}@mail.com`,
          password: sha1(randomString()),
        };
        const newFile = {
          name: randomString(),
          type: 'folder',
          parentId: 0,
          isPublic: false,
        };
        users.push(newUser);
        files.push(newFile);
      }
      await db.collection('users').insertMany(users);
      await db.collection('files').insertMany(files);
      resolve();
    });
  }));

  after(async () => {
    // Clear collection and close connection
    await db.collection('users').deleteMany({});
    await db.collection('files').deleteMany({});
    await db.dropDatabase();
    await client.close();
  });

  describe('GET /status', () => {
    it('should return status of redis and mongodb clients', (done) => {
      request(app)
        .get('/status')
        .end((error, res) => {
          const status = res.body;
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(status).to.have.property('redis');
          expect(status.redis).to.be.a('boolean');
          expect(status).to.have.property('db');
          expect(status.db).to.be.a('boolean');
          done();
        });
    });
  });
  describe('GET /stats', () => {
    it('should return number of users(5) and files(5) in the database', (done) => {
      request(app)
        .get('/stats')
        .end((error, res) => {
          const stats = res.body;
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(stats.users).to.equal(5);
          expect(stats.files).to.equal(5);
          done();
        });
    });
  });
});