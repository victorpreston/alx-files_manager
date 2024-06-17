import chai from 'chai';
import chaiHttp from 'chai-http';
import { MongoClient } from 'mongodb';
import { createClient } from 'redis';
import { promisify } from 'util';
import app from '../server';

chai.use(chaiHttp);
const { expect, request } = chai;

/**
 * Test cases for UsersController.js endpoint:
 * 1. POST /users
 */
describe('UserController.js tests', () => {
  let dbClient;
  let db;
  let rdClient;
  let asyncKeys;
  let asyncDel;
  const DB_HOST = process.env.DB_HOST || 'localhost';
  const DB_PORT = process.env.BD_PORT || 27017;
  const DATABASE = process.env.DB_DATABASE || 'files_manager';
  const user = { email: 'tester@mail.com', password: 'supersecretFYI' };

  before(() => new Promise((resolve) => {
    // Connect to db and clear collections
    dbClient = new MongoClient(`mongodb://${DB_HOST}:${DB_PORT}`, { useUnifiedTopology: true });
    dbClient.connect(async (error, client) => {
      if (error) throw error;
      db = await client.db(DATABASE);
      await db.collection('users').deleteMany({});

       // Connect to redis and set authentication tokens
       rdClient = createClient();
       asyncKeys = promisify(rdClient.keys).bind(rdClient);
       asyncDel = promisify(rdClient.del).bind(rdClient);
       rdClient.on('connect', async () => {
         resolve();
       });
    });
  }));

  after(async () => {
    // Clear db collections
    await db.collection('users').deleteOne({ email: user.email });
    await db.dropDatabase();
    await dbClient.close();

    // Clear redis keys and close connection
    const emailJobs = await asyncKeys('bull*')
    const deleteKeysOperations = [];
    for (const key of emailJobs) {
      deleteKeysOperations.push(asyncDel(key));
    }
    await Promise.all(deleteKeysOperations);
    rdClient.quit();
  });

  describe('POST /users', () => {
    it('should create a new a new user and add them to the database', (done) => {
      request(app)
        .post('/users')
        .send(user)
        .end((error, res) => {
          expect(error).to.be.null;
          expect(res).to.have.status(201);
          expect(res.body).to.have.property('id');
          expect(res.body).to.have.property('email');
          expect(res.body.email).to.equal(user.email);
          done();
        });
    });
  });
});