const { validationResult } = require('express-validator');

/**
 * Express middleware to evaluate express-validator results.
 * If errors are found, it halts the request chain and returns a 400 response.
 */
function validate(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}

module.exports = validate;
