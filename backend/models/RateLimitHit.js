const mongoose = require("mongoose");

const rateLimitHitSchema = new mongoose.Schema({
  // Limiter key for the current window (e.g. an IP, or "ai:<userId>").
  key: {
    type: String,
    required: true,
  },
  // Running hit count for the window.
  totalHits: {
    type: Number,
    required: true,
    default: 0,
  },
  // End of the current window. A TTL index (below) evicts the row once the
  // window has passed, so the collection can't grow unbounded.
  expiresAt: {
    type: Date,
    required: true,
  },
});

rateLimitHitSchema.index({ key: 1 });
rateLimitHitSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("RateLimitHit", rateLimitHitSchema);
