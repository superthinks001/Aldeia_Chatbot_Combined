import express, { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { query, queryOne, execute } from '../database/client';
import { logger } from '../utils/logger';
import { sanitizeInput } from '../middleware/sanitizeInput';
import { User, ApiResponse } from '@aldeia/shared-types';
import { validation, stringUtils } from '@aldeia/utils';

const router = express.Router();

// Apply input sanitization middleware
router.use(sanitizeInput);

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-change-in-production';
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || '24h') as string | number;

// ====================================================================
// AUTH MIDDLEWARE - Used by protected routes
// ====================================================================

export const authenticateToken = (req: Request, res: Response, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required'
    } as ApiResponse);
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: 'Invalid or expired token'
      } as ApiResponse);
    }
    
    req.user = user;
    next();
  });
};

// ====================================================================
// USER REGISTRATION
// ====================================================================

interface RegisterRequest {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword }: RegisterRequest = req.body;

    // Validation
    if (!validation.required(name) || !validation.required(email) || !validation.required(password)) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      } as ApiResponse);
    }

    if (!validation.email(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      } as ApiResponse);
    }

    if (!validation.minLength(password, 8)) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long'
      } as ApiResponse);
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        error: 'Passwords do not match'
      } as ApiResponse);
    }

    // Check if user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      } as ApiResponse);
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const userId = stringUtils.generateId();
    const user = await createUser({
      id: userId,
      name: stringUtils.sanitize(name),
      email: email.toLowerCase(),
      password: hashedPassword,
      role: 'user'
    });

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    logger.info(`New user registered: ${user.email}`);

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        token
      },
      message: 'User registered successfully'
    } as ApiResponse);

  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      error: 'Registration failed'
    } as ApiResponse);
  }
});

// ====================================================================
// USER LOGIN
// ====================================================================

interface LoginRequest {
  email: string;
  password: string;
}

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Validation
    if (!validation.required(email) || !validation.required(password)) {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required'
      } as ApiResponse);
    }

    if (!validation.email(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      } as ApiResponse);
    }

    // Get user from database
    const user = await getUserByEmail(email.toLowerCase());
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse);
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password'
      } as ApiResponse);
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN } as SignOptions
    );

    // Update last login
    await updateLastLogin(user.id);

    logger.info(`User logged in: ${user.email}`);

    res.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt
        },
        token
      },
      message: 'Login successful'
    } as ApiResponse);

  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed'
    } as ApiResponse);
  }
});

// ====================================================================
// GET USER PROFILE (Protected Route)
// ====================================================================

router.get('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const userId = req.user.userId;
    const user = await getUserById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      }
    } as ApiResponse<Omit<User, 'password'>>);

  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get user profile'
    } as ApiResponse);
  }
});

// ====================================================================
// UPDATE USER PROFILE (Protected Route)
// ====================================================================

interface UpdateProfileRequest {
  name?: string;
  email?: string;
  currentPassword?: string;
  newPassword?: string;
}

router.put('/profile', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      } as ApiResponse);
    }

    const userId = req.user.userId;
    const { name, email, currentPassword, newPassword }: UpdateProfileRequest = req.body;

    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      } as ApiResponse);
    }

    const updates: any = {};

    // Update name
    if (name && name !== user.name) {
      updates.name = stringUtils.sanitize(name);
    }

    // Update email
    if (email && email !== user.email) {
      if (!validation.email(email)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid email format'
        } as ApiResponse);
      }

      // Check if new email is already taken
      const existingUser = await getUserByEmail(email.toLowerCase());
      if (existingUser && existingUser.id !== userId) {
        return res.status(409).json({
          success: false,
          error: 'Email already in use'
        } as ApiResponse);
      }

      updates.email = email.toLowerCase();
    }

    // Update password
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({
          success: false,
          error: 'Current password required to set new password'
        } as ApiResponse);
      }

      const isValidCurrentPassword = await bcrypt.compare(currentPassword, user.password);
      if (!isValidCurrentPassword) {
        return res.status(401).json({
          success: false,
          error: 'Current password is incorrect'
        } as ApiResponse);
      }

      if (!validation.minLength(newPassword, 8)) {
        return res.status(400).json({
          success: false,
          error: 'New password must be at least 8 characters long'
        } as ApiResponse);
      }

      const saltRounds = 12;
      updates.password = await bcrypt.hash(newPassword, saltRounds);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid updates provided'
      } as ApiResponse);
    }

    // Update user
    await updateUser(userId, updates);

    logger.info(`User profile updated: ${user.email}`);

    res.json({
      success: true,
      message: 'Profile updated successfully'
    } as ApiResponse);

  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile'
    } as ApiResponse);
  }
});

// ====================================================================
// LOGOUT (Client-side token invalidation)
// ====================================================================

router.post('/logout', authenticateToken, (req: Request, res: Response) => {
  // In a stateless JWT system, logout is handled client-side by removing the token
  // For more security, you could implement a token blacklist

  if (req.user) {
    logger.info(`User logged out: ${req.user.email}`);
  }

  res.json({
    success: true,
    message: 'Logged out successfully'
  } as ApiResponse);
});

// ====================================================================
// HELPER FUNCTIONS - Database Operations
// ====================================================================

interface CreateUserData {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'user' | 'admin';
}

async function createUser(userData: CreateUserData): Promise<User> {
  await execute(
    `INSERT INTO users (id, name, email, password_hash, role, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
    [userData.id, userData.name, userData.email, userData.password, userData.role]
  );

  return {
    id: userData.id,
    name: userData.name,
    email: userData.email,
    role: userData.role,
    createdAt: new Date()
  } as User;
}

async function getUserByEmail(email: string): Promise<any> {
  return await queryOne(
    'SELECT * FROM users WHERE email = $1',
    [email]
  );
}

async function getUserById(id: string): Promise<any> {
  return await queryOne(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
}

async function updateUser(id: string, updates: any): Promise<void> {
  const fields = Object.keys(updates).map((key, index) => `${key} = $${index + 1}`).join(', ');
  const values = [...Object.values(updates), id];

  await execute(
    `UPDATE users SET ${fields}, updated_at = CURRENT_TIMESTAMP WHERE id = $${values.length}`,
    values
  );
}

async function updateLastLogin(id: string): Promise<void> {
  await execute(
    'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
    [id]
  );
}

export default router;