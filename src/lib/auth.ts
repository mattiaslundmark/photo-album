// Authentication utilities using JWT and bcrypt

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { createUser, getUserByUsername, getUserById } from './data';
import type { JWTPayload, User } from './types';

const JWT_EXPIRES_IN = '7d';
const SALT_ROUNDS = 12;
const COOKIE_NAME = 'auth_token';

/**
 * Get the JWT signing secret. There is deliberately no fallback: a missing
 * secret must fail loudly rather than sign tokens with a known default.
 */
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set');
  }
  return secret;
}

/**
 * Hash a password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verify a password against a hash
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Generate a JWT token for a user
 */
export function generateToken(user: User): string {
  const payload: JWTPayload = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Verify and decode a JWT token
 */
export function verifyToken(token: string): JWTPayload | null {
  try {
    const decoded = jwt.verify(token, getJwtSecret()) as JWTPayload;
    return decoded;
  } catch {
    return null;
  }
}

/**
 * Authenticate a user with username and password
 */
export async function authenticateUser(
  username: string,
  password: string
): Promise<{ user: User; token: string } | null> {
  const user = await getUserByUsername(username);
  if (!user) return null;

  const isValid = await verifyPassword(password, user.passwordHash);
  if (!isValid) return null;

  const token = generateToken(user);
  return { user, token };
}

/**
 * Register a new user
 */
export async function registerUser(
  username: string,
  password: string,
  role: 'admin' | 'viewer' = 'viewer'
): Promise<{ user: User; token: string }> {
  const passwordHash = await hashPassword(password);

  const user: User = {
    id: uuidv4(),
    username,
    passwordHash,
    role,
    createdAt: new Date().toISOString(),
  };

  await createUser(user);
  const token = generateToken(user);

  return { user, token };
}

/**
 * Get the current user from the request cookies (server-side)
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = verifyToken(token);
    if (!payload) return null;

    const user = await getUserById(payload.userId);
    return user;
  } catch {
    return null;
  }
}

/**
 * Check if user is admin
 */
export async function isAdmin(): Promise<boolean> {
  const user = await getCurrentUser();
  return user?.role === 'admin';
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Create an auth cookie value
 */
export function createAuthCookie(token: string): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
  };
} {
  return {
    name: COOKIE_NAME,
    value: token,
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    },
  };
}

/**
 * Create a cookie to clear auth
 */
export function clearAuthCookie(): {
  name: string;
  value: string;
  options: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: 'lax' | 'strict' | 'none';
    maxAge: number;
    path: string;
  };
} {
  return {
    name: COOKIE_NAME,
    value: '',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 0,
      path: '/',
    },
  };
}

export { COOKIE_NAME };
