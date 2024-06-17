/**
 * Custom error handler
 * @param {Error} error - Error object
 * @param {import('express').Request} _req - Request object
 * @param {import('express').Response} res - Response object
 * @param {import('express').NextFunction} next - Next function
 * @returns - Error message
 */
function errorHandler(error, _req, res, next) {
    if (res.headersSent) return next(error);
    return res.status(500).json({ error: 'Oops! Something went wrong!' });
  }
  
  export default errorHandler;