import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET || 'your-access-secret-key';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

export class AuthService {
  // Password Management
  static async hashPassword(password: string): Promise<string> {
    const salt = await bcryptjs.genSalt(12);
    return bcryptjs.hash(password, salt);
  }

  static async comparePassword(
    password: string,
    hash: string
  ): Promise<boolean> {
    return bcryptjs.compare(password, hash);
  }

  static validatePassword(password: string): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    if (!/\d/.test(password)) {
      errors.push('Password must contain at least one digit');
    }
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Token Management
  static generateAccessToken(userId: string): string {
    return jwt.sign({ userId }, JWT_ACCESS_SECRET, { expiresIn: '15m' });
  }

  static generateRefreshToken(userId: string): string {
    return jwt.sign({ userId }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
  }

  static verifyAccessToken(token: string): {
    valid: boolean;
    userId?: string;
    error?: string;
  } {
    try {
      const decoded = jwt.verify(token, JWT_ACCESS_SECRET) as {
        userId: string;
      };
      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false, error: 'Invalid or expired access token' };
    }
  }

  static verifyRefreshToken(token: string): {
    valid: boolean;
    userId?: string;
    error?: string;
  } {
    try {
      const decoded = jwt.verify(token, JWT_REFRESH_SECRET) as {
        userId: string;
      };
      return { valid: true, userId: decoded.userId };
    } catch (error) {
      return { valid: false, error: 'Invalid or expired refresh token' };
    }
  }
}

export default AuthService;
