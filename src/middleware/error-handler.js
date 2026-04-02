const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Errores operacionales (AppError)
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      error: true,
      message: err.message,
    });
  }

  // Errores de Mongoose: validación
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message).join(', ');
    return res.status(400).json({
      error: true,
      message: messages,
    });
  }

  // Errores de Mongoose: clave duplicada
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern).join(', ');
    return res.status(409).json({
      error: true,
      message: `El campo ${field} ya existe`,
    });
  }

  // Errores de Mongoose: CastError
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: true,
      message: `Valor inválido para ${err.path}: ${err.value}`,
    });
  }

  // Errores de Multer
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: true,
      message: 'El archivo excede el tamaño máximo permitido (5 MB)',
    });
  }

  // Error genérico
  return res.status(500).json({
    error: true,
    message: 'Error interno del servidor',
  });
};

export default errorHandler;
