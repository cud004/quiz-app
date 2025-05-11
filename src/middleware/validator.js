const ApiResponse = require('../utils/apiResponse');

/**
 * Middleware for validating request data against schemas
 * @param {Object} schema - Schema with body, params, and query validators
 */
exports.validateRequest = (schema) => {
  return (req, res, next) => {
    // Get validation schemas
    const { body, params, query } = schema || {};

    // Validate request body
    if (body) {
      const { error: bodyError } = body.validate(req.body, { abortEarly: false });
      if (bodyError) {
        const errors = bodyError.details.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }));
        return ApiResponse.validationError(res, errors);
      }
    }

    // Validate URL params
    if (params) {
      const { error: paramsError } = params.validate(req.params, { abortEarly: false });
      if (paramsError) {
        const errors = paramsError.details.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }));
        return ApiResponse.validationError(res, errors, 'Invalid URL parameters');
      }
    }

    // Validate query params
    if (query) {
      const { error: queryError } = query.validate(req.query, { abortEarly: false });
      if (queryError) {
        const errors = queryError.details.map(error => ({
          field: error.path.join('.'),
          message: error.message
        }));
        return ApiResponse.validationError(res, errors, 'Invalid query parameters');
      }
    }

    next();
  };
}; 