import express from 'express';
import router from './router/index';
import unmatchedRouteHandler from './middleware/unmatchedRouteHandler';
import errorHandler from './middleware/errorHandler';
import shutdown from 'utils/shutdown';



/**
 * Express server.
 */

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(router);
app.use(unmatchedRouteHandler);
app.use(errorHandler);
app.use(express.urlencoded({ extended: true }));

const server = app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

/**
 * Gracefully shutdown the server.
 */

const handler = () => shutdown(server);
process.on('SIGINT', handler);
process.on('SIGTERM', handler);
process.on('SIGQUIT', handler);

export default app;

