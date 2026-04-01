import mongoose from 'mongoose';
import app from './app.js';
import config from './config/index.js';

const start = async () => {
  try {
    if (!config.mongoUri) {
      throw new Error('MONGODB_URI no está definida en las variables de entorno');
    }

    await mongoose.connect(config.mongoUri);
    console.log('✅ Conectado a MongoDB Atlas');

    app.listen(config.port, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${config.port}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error.message);
    process.exit(1);
  }
};

start();
