import { Router } from 'express';
import * as userCtrl from '../controllers/user.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import authorize from '../middleware/role.middleware.js';
import validate from '../middleware/validate.js';
import upload from '../middleware/upload.js';
import {
  registerSchema,
  validationSchema,
  loginSchema,
  personalDataSchema,
  companySchema,
  changePasswordSchema,
  refreshTokenSchema,
  inviteSchema,
} from '../validators/user.validator.js';

const router = Router();

// 1) Registro
router.post('/register', validate(registerSchema), userCtrl.register);

// 2) Validación email
router.put('/validation', authMiddleware, validate(validationSchema), userCtrl.validateEmail);

// 3) Login
router.post('/login', validate(loginSchema), userCtrl.login);

// 4a) Onboarding: datos personales
router.put('/register', authMiddleware, validate(personalDataSchema), userCtrl.updatePersonalData);

// 4b) Onboarding: compañía
router.patch('/company', authMiddleware, validate(companySchema), userCtrl.updateCompany);

// 5) Logo
router.patch('/logo', authMiddleware, upload.single('logo'), userCtrl.uploadLogo);

// 6) Obtener usuario
router.get('/', authMiddleware, userCtrl.getUser);

// 7a) Refresh token
router.post('/refresh', validate(refreshTokenSchema), userCtrl.refreshToken);

// 7b) Logout
router.post('/logout', authMiddleware, userCtrl.logout);

// 8) Eliminar usuario
router.delete('/', authMiddleware, userCtrl.deleteUser);

// 9) Cambiar contraseña (bonus)
router.put('/password', authMiddleware, validate(changePasswordSchema), userCtrl.changePassword);

// 10) Invitar compañeros
router.post('/invite', authMiddleware, authorize('admin'), validate(inviteSchema), userCtrl.inviteUser);

export default router;
