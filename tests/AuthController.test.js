import chai from 'chai';
import chaiHttp from 'chai-http';
import sha1 from 'sha1';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { promisify } from 'util';
import { v4 } from 'uuid';
import app from '../server';

chai.use(chaiHttp);
const { expect, request } = chai;

/**
 * Test cases for AuthController.js endpoints:
 * 1. GET /connect
 * 2. GET /disconnect
 * 3. GET /users/me
 */
describe('AuthController.js tests', () => {
  let dbClient;
  let db;
  let rdClient;
  let asyncSet;
  let asyncKeys;
  let asyncDel;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  const randomString = () => Math.random().toString(16).substring(2);
  const initialPassword = randomString();
  const hashedPassword = sha1(initialPassword);
  const user = { email: `${randomString()}@mail.com`, password: hashedPassword };
  const token = v4();

  before(() => new Promise((resolve) => {
    // Connect to db and clear collections
    dbClient = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    dbClient.connect(async (error, client) => {
      if (error) throw error;
      db = await client.db(DATABASE);
      await db.collection('users').deleteMany({});

      // Create new user
      const commandResults = await db.collection('users').insertOne(user);

      // Connect to redis and clear keys
      rdClient = createClient();
      asyncSet = promisify(rdClient.set).bind(rdClient);
      asyncKeys = promisify(rdClient.keys).bind(rdClient);
      asyncDel = promisify(rdClient.del).bind(rdClient);
      rdClient.on('connect', async () => {
        await asyncSet(`auth_${token}`, commandResults.insertedId.toString());
        resolve();
      });
    });
  }));

  after(async () => {
    // Clear db collections
    await db.collection('users').deleteMany({});
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

  describe('GET /connect', () => {
    it('should login user and return token', (done) => {
      request(app)
        .get('/connect')
        .auth(user.email, initialPassword)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.token).to.be.a('string');
          done();
        });
    });

    it('should return unauthorized email is missing', (done) => {
      request(app)
        .get('/connect')
        .auth('', user.password)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });

    it('should return unauthorized password is missing', (done) => {
      request(app)
        .get('/connect')
        .auth(user.email)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });

    it('should return unauthorized when credentials are missing', (done) => {
      request(app)
        .get('/connect')
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });

    it('should return unauthorized when credentials are incorrect', (done) => {
      const email = `${randomString()}@test.com`;
      const password = randomString();
      request(app)
        .get('/connect')
        .auth(email, password)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });
  });

  describe('GET /users/me', () => {
    it('should return details of a user with valid token', (done) => {
      request(app)
        .get('/users/me')
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(200);
          expect(res.body.id).is.a('string');
          expect(res.body.email).to.equal(user.email);
          expect(res.body.password).to.equal(undefined);
          done();
        });
    });

    it('should return unauthorized with wrong token', (done) => {
      request(app)
        .get('/users/me')
        .set('X-Token', v4())
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.equal('Unauthorized');
          done();
        });
    });
  });

  describe('GET /disconnect', () => {
    it('should logout user from the system', (done) => {
      request(app)
        .get('/disconnect')
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(204);
          expect(res.body).to.deep.equal({});
          done();
        });
    });

    it('should prevent authorization using logged out token', (done) => {
      request(app)
        .get('/connect')
        .set('X-Token', token)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(401);
          expect(res.body.error).to.deep.equal('Unauthorized');
          done();
        });
    });
  });
});