import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';

// Rate limit response handler
const rateLimitHandler = (req: Request, res: Response) => {
  res.status(429).json({
    error: 'Too many requests, please try again later.',
    retryAfter: res.getHeader('Retry-After'),
  });
};

// Authentication endpoints - strict limits (login, signup, password reset)
// 10 requests per minute to prevent brute force
export const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 attempts per minute
  message: { error: 'Too many authentication attempts. Please wait a minute.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// Stricter limiter for password reset/OTP - 3 per minute
export const sensitiveAuthLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 3,
  message: { error: 'Too many attempts. Please wait before trying again.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// Public read endpoints - more generous
// 100 requests per minute per IP
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Rate limit exceeded. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// Protected endpoints - standard CRUD operations
// 60 requests per minute per user
export const protectedLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// High-cost operations - file uploads, reports, heavy queries
// 20 requests per hour per user
export const heavyOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  message: { error: 'Too many heavy operations. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// Bid placement limiter - prevent bid spamming
// 30 bids per hour per user
export const bidLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: { error: 'Bid limit reached. You can place more bids in an hour.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// API explorer/debug endpoints - limit to prevent abuse
// 30 requests per minute
export const apiExplorerLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'API explorer rate limit reached.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// Global rate limiter - catch-all safety net
// 200 requests per minute per IP
export const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  message: { error: 'Global rate limit exceeded.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
  skip: (req) => {
    // Skip rate limiting for static assets
    return !req.path.startsWith('/api');
  },
});

// Document upload limiter
// 15 uploads per hour
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: 'Upload limit reached. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});

// Smart matching / marketplace limiter - computationally expensive
// 20 requests per minute
export const marketplaceLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  message: { error: 'Please wait before refreshing marketplace.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: rateLimitHandler,
  validate: { xForwardedForHeader: false },
});
