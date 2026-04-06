import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import userRoutes from './routes/user.routes.js';
import errorHandler from './middleware/error-handler.js';

const app = express();

// --- Seguridad ---
app.use(helmet());

// Sanitización NoSQL manual — compatible con Express 5
const sanitize = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitize(obj[key]);
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitize(req.body);
  if (req.params) sanitize(req.params);
  next();
});

// Rate limiting global
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 peticiones por ventana
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: true, message: 'Demasiadas peticiones, intenta de nuevo más tarde' },
});
app.use(limiter);

// --- Body parsing ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- Archivos estáticos (uploads) ---
app.use('/uploads', express.static('uploads'));

// --- Rutas ---
app.use('/api/user', userRoutes);


// --- 404 ---
app.use((req, res) => {
  res.status(404).json({ error: true, message: 'Ruta no encontrada' });
});

// --- Middleware centralizado de errores ---
app.use(errorHandler);

export default app;
