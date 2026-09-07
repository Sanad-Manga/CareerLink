const { rateLimit } = require('express-rate-limit');
const MongoRateLimitStore = require('./mongoRateLimitStore');

const authLimiterStore = new MongoRateLimitStore({ prefix: 'auth:' });

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX || '10'),
  store: authLimiterStore,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many attempts from this IP, please try again after 15 minutes',
  },
});

// Stricter, per-user limiter for the routes that call HuggingFace (job create /
// update classification, recommendations, cover-letter generation). These are
// all behind `protect`, so req.user is always populated — key on the user id,
// not the IP, so a shared NAT doesn't punish everyone and a single account
// can't burn the quota from many IPs.
const aiLimiterStore = new MongoRateLimitStore({ prefix: 'ai:' });

const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  store: aiLimiterStore,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user._id.toString(),
  validate: { keyGeneratorIpFallback: false },
  message: {
    success: false,
    message: 'Too many AI requests, please try again later',
  },
});

module.exports = { authLimiter, authLimiterStore, aiLimiter, aiLimiterStore };
