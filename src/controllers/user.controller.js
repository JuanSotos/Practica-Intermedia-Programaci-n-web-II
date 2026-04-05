import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
import User from '../models/User.js';
import Company from '../models/Company.js';
import AppError from '../utils/AppError.js';
import notificationService from '../services/notification.service.js';

// --- Helpers ---

const generateAccessToken = (user) => {
  return jwt.sign({ id: user._id }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpires,
  });
};

const generateRefreshToken = (user) => {
  return jwt.sign({ id: user._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpires,
  });
};

const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sanitizeUser = (user) => {
  const obj = user.toJSON();
  delete obj.password;
  delete obj.verificationCode;
  delete obj.verificationAttempts;
  delete obj.refreshToken;
  return obj;
};


// 1) Registro — POST /api/user/register

export const register = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Comprobar si ya existe un usuario verificado (y activo) con ese email
    const verifiedUser = await User.findOne({ email, deleted: false, status: 'verified' });
    if (verifiedUser) {
      throw AppError.conflict('Ya existe un usuario registrado con ese email');
    }

    // Eliminar usuarios previos con ese email (pendientes o soft-deleted)
    // para evitar colisión con el índice unique de email
    await User.deleteMany({ email, $or: [{ status: 'pending' }, { deleted: true }] });

    // Cifrar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generar código de verificación
    const verificationCode = generateVerificationCode();

    // Crear usuario
    const user = await User.create({
      email,
      password: hashedPassword,
      verificationCode,
      verificationAttempts: 3,
    });

    // Generar tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Guardar refresh token en BD
    user.refreshToken = refreshToken;
    await user.save();

    // Emitir evento
    notificationService.emit('user:registered', {
      email: user.email,
      verificationCode,
    });

    res.status(201).json({
      user: {
        email: user.email,
        status: user.status,
        role: user.role,
      },
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// 2) Validación del email — PUT /api/user/validation

export const validateEmail = async (req, res, next) => {
  try {
    const { code } = req.body;
    const user = req.user;

    // Comprobar intentos restantes
    if (user.verificationAttempts <= 0) {
      throw AppError.tooManyRequests('Has agotado los intentos de verificación');
    }

    // Comprobar código
    if (user.verificationCode !== code) {
      user.verificationAttempts -= 1;
      await user.save();

      if (user.verificationAttempts <= 0) {
        throw AppError.tooManyRequests('Has agotado los intentos de verificación');
      }

      throw AppError.badRequest(
        `Código incorrecto. Te quedan ${user.verificationAttempts} intento(s)`
      );
    }

    // Código correcto
    user.status = 'verified';
    user.verificationCode = undefined;
    user.verificationAttempts = undefined;
    await user.save();

    // Emitir evento
    notificationService.emit('user:verified', { email: user.email });

    res.json({ message: 'Email verificado correctamente' });
  } catch (error) {
    next(error);
  }
};

// 3) Login — POST /api/user/login

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email, deleted: false });
    if (!user) {
      throw AppError.unauthorized('Credenciales incorrectas');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      throw AppError.unauthorized('Credenciales incorrectas');
    }

    // Generar tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      user: sanitizeUser(user),
      accessToken,
      refreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// 4a) Onboarding: datos personales — PUT /api/user/register

export const updatePersonalData = async (req, res, next) => {
  try {
    const { name, lastName, nif } = req.body;

    req.user.name = name;
    req.user.lastName = lastName;
    req.user.nif = nif;
    await req.user.save();

    res.json({
      user: sanitizeUser(req.user),
    });
  } catch (error) {
    next(error);
  }
};

// 4b) Onboarding: datos de compañía — PATCH /api/user/company

export const updateCompany = async (req, res, next) => {
  try {
    const user = req.user;
    const { isFreelance, name, cif, address } = req.body;

    let companyData;

    if (isFreelance) {
      // Autónomo: datos de la compañía = datos del usuario
      companyData = {
        name: user.name || name || '',
        cif: user.nif || cif || '',
        address: user.address || address || {},
        isFreelance: true,
      };
    } else {
      companyData = { name, cif, address, isFreelance: false };
    }

    // Buscar si ya existe una Company con ese CIF
    const existingCompany = await Company.findOne({
      cif: companyData.cif,
      deleted: false,
    });

    if (existingCompany) {
      // El usuario se une a la compañía existente como guest
      user.company = existingCompany._id;
      user.role = 'guest';
      await user.save();

      res.json({
        user: sanitizeUser(user),
        company: existingCompany,
        message: 'Te has unido a una compañía existente como guest',
      });
    } else {
      // Crear nueva compañía, usuario es owner y admin
      const company = await Company.create({
        owner: user._id,
        ...companyData,
      });

      user.company = company._id;
      user.role = 'admin';
      await user.save();

      res.status(201).json({
        user: sanitizeUser(user),
        company,
        message: 'Compañía creada correctamente',
      });
    }
  } catch (error) {
    next(error);
  }
};

// 5) Logo de la compañía — PATCH /api/user/logo

export const uploadLogo = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user.company) {
      throw AppError.badRequest('No tienes una compañía asociada');
    }

    if (!req.file) {
      throw AppError.badRequest('No se ha proporcionado ninguna imagen');
    }

    const logoUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;

    const company = await Company.findByIdAndUpdate(
      user.company,
      { logo: logoUrl },
      { new: true }
    );

    res.json({
      company,
      message: 'Logo actualizado correctamente',
    });
  } catch (error) {
    next(error);
  }
};

// 6) Obtener usuario — GET /api/user

export const getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -verificationCode -verificationAttempts -refreshToken')
      .populate('company');

    res.json({ user });
  } catch (error) {
    next(error);
  }
};

// 7a) Refresh token — POST /api/user/refresh

export const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    // Verificar el refresh token
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.refreshSecret);
    } catch {
      throw AppError.unauthorized('Refresh token inválido o expirado');
    }

    // Buscar usuario y comprobar que el token coincide
    const user = await User.findById(decoded.id);
    if (!user || user.deleted || user.refreshToken !== token) {
      throw AppError.unauthorized('Refresh token inválido');
    }

    // Generar nuevos tokens (rotación)
    const newAccessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);

    user.refreshToken = newRefreshToken;
    await user.save();

    res.json({
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
    });
  } catch (error) {
    next(error);
  }
};

// 7b) Logout — POST /api/user/logout

export const logout = async (req, res, next) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();

    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    next(error);
  }
};

// 8) Eliminar usuario — DELETE /api/user

export const deleteUser = async (req, res, next) => {
  try {
    const soft = req.query.soft === 'true';

    if (soft) {
      req.user.deleted = true;
      req.user.refreshToken = null;
      await req.user.save();
    } else {
      await User.findByIdAndDelete(req.user._id);
    }

    // Emitir evento
    notificationService.emit('user:deleted', {
      userId: req.user._id,
      soft,
    });

    res.json({
      message: soft
        ? 'Usuario marcado como eliminado (soft delete)'
        : 'Usuario eliminado permanentemente',
    });
  } catch (error) {
    next(error);
  }
};

// 9) Cambiar contraseña — PUT /api/user/password

export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Verificar contraseña actual
    const isMatch = await bcrypt.compare(currentPassword, req.user.password);
    if (!isMatch) {
      throw AppError.unauthorized('La contraseña actual es incorrecta');
    }

    // Cifrar nueva contraseña
    req.user.password = await bcrypt.hash(newPassword, 10);
    await req.user.save();

    res.json({ message: 'Contraseña actualizada correctamente' });
  } catch (error) {
    next(error);
  }
};

// 10) Invitar compañeros — POST /api/user/invite

export const inviteUser = async (req, res, next) => {
  try {
    const { email, password, name, lastName } = req.body;

    if (!req.user.company) {
      throw AppError.badRequest('No tienes una compañía asociada para invitar usuarios');
    }

    // Comprobar si el email ya existe
    const existing = await User.findOne({ email, deleted: false });
    if (existing) {
      throw AppError.conflict('Ya existe un usuario con ese email');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = generateVerificationCode();

    const invited = await User.create({
      email,
      password: hashedPassword,
      name,
      lastName,
      role: 'guest',
      company: req.user.company,
      verificationCode,
      verificationAttempts: 3,
    });

    // Emitir evento
    notificationService.emit('user:invited', {
      email: invited.email,
      companyId: req.user.company,
    });

    res.status(201).json({
      user: {
        email: invited.email,
        role: invited.role,
        status: invited.status,
        company: invited.company,
      },
      message: 'Usuario invitado correctamente',
    });
  } catch (error) {
    next(error);
  }
};
