import { Request, Response, NextFunction } from 'express';
import { getAuth } from 'firebase-admin/auth';
import { Role } from '../models';

export interface AuthRequest extends Request {
  firebaseUser?: {
    uid: string;
    email?: string;
  };
}

const superAdminEmail = () => process.env.SUPERADMIN_EMAIL || 'appsbeem@gmail.com';

export const verifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
    return;
  }

  const token = authHeader.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') {
    res.status(401).json({ success: false, message: 'Token tidak valid' });
    return;
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as AuthRequest).firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
    };
    next();
  } catch {
    res.status(401).json({ success: false, message: 'Token tidak valid atau sudah kedaluwarsa' });
  }
};

export const optionalVerifyFirebaseToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7).trim();
  if (!token || token === 'null' || token === 'undefined') {
    return next();
  }

  try {
    const decoded = await getAuth().verifyIdToken(token);
    (req as AuthRequest).firebaseUser = {
      uid: decoded.uid,
      email: decoded.email,
    };
  } catch {
    // Abaikan error, biarkan firebaseUser kosong
  }
  next();
};

export const isSuperAdminUser = async (uid: string, email?: string): Promise<boolean> => {
  if (email && email === superAdminEmail()) return true;
  const role = await Role.findOne({ where: { userId: uid, name: 'SUPER_ADMIN' } });
  return !!role;
};

export const requireSuperAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const adminKey = req.headers['x-admin-key'];
  if (process.env.ADMIN_API_KEY && adminKey === process.env.ADMIN_API_KEY) {
    next();
    return;
  }

  const firebaseUser = (req as AuthRequest).firebaseUser;
  if (!firebaseUser) {
    res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
    return;
  }

  if (await isSuperAdminUser(firebaseUser.uid, firebaseUser.email)) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Akses khusus Super Admin' });
};

export const requireSelf = (paramName = 'uid') => (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const firebaseUser = (req as AuthRequest).firebaseUser;
  const targetUid = req.params[paramName] || req.body?.uid;

  if (!firebaseUser) {
    res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
    return;
  }

  if (firebaseUser.uid === targetUid) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Tidak diizinkan mengakses data pengguna lain' });
};

export const requireSelfOrSuperAdmin = (paramName = 'uid') => async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const firebaseUser = (req as AuthRequest).firebaseUser;
  const targetUid = req.params[paramName] || req.body?.uid;

  if (!firebaseUser) {
    res.status(401).json({ success: false, message: 'Token autentikasi diperlukan' });
    return;
  }

  if (firebaseUser.uid === targetUid) {
    next();
    return;
  }

  if (await isSuperAdminUser(firebaseUser.uid, firebaseUser.email)) {
    next();
    return;
  }

  res.status(403).json({ success: false, message: 'Tidak diizinkan mengakses data pengguna lain' });
};
