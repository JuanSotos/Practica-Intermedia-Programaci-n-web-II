import AppError from '../utils/AppError.js';

/**
 * Middleware de autorización por roles.
 * @param  {...string} roles — Roles permitidos (p. ej. 'admin', 'guest')
 */
const authorize = (...roles) => (req, res, next) => {
  if (!req.user) {
    return next(AppError.unauthorized('No autenticado'));
  }

  if (!roles.includes(req.user.role)) {
    return next(AppError.forbidden('No tienes permisos para realizar esta acción'));
  }

  next();
};

export default authorize;
