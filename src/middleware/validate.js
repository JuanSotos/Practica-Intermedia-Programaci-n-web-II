import AppError from '../utils/AppError.js';

/**
 * Middleware genérico de validación con Zod.
 * Recibe un schema Zod y valida req.body.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const messages = result.error.errors.map((e) => e.message).join(', ');
    return next(AppError.badRequest(messages));
  }

  // Reemplazar body con los datos parseados 
  req.body = result.data;
  next();
};

export default validate;
