/**
 * Custom handler for unmatched routes
 * @param {import('express').Request} req - Request object
 * @param {import('express').Response} res - Response object
 */
function unmatchedRouteHandler(req, res) {
    if (req.method.toLocaleLowerCase() === 'options') res.end();
    else res.status(404).json({ error: 'Endpoint not found' });
  }
  
  export default unmatchedRouteHandler;