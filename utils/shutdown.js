/* eslint no-console: off */
import dbClient from './db';
import redisClient from './redis';

/**
 * Handles graceful shutdown of server
 */
function shutdown(server) {
  console.log('Shutting down...');
  console.log('Closing all connections...');

  if (redisClient.isAlive()) redisClient.close();
  console.log('Closing Redis connection...');

  console.log('Closing DB connection...');
  if (dbClient.isAlive()) dbClient.close();

  server.close();
  console.log('Closing server...');
  console.log('Server closed');
  process.exit(0);
}

export default shutdown;