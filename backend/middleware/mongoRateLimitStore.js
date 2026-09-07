// Mongo-backed store for express-rate-limit v8 (fixed-window counter).
//
// Same rationale as the JWT blacklist (Z1): a MemoryStore resets on redeploy and
// is per-instance, so cycling requests during a deploy window or hitting a second
// instance bypasses the limit. Rows self-evict via a TTL index on `expiresAt`
// (see models/RateLimitHit).
const RateLimitHit = require("../models/RateLimitHit");

class MongoRateLimitStore {
  // `prefix` namespaces keys so multiple limiters can share the collection
  // (e.g. the auth limiter and the AI limiter).
  constructor({ prefix = "" } = {}) {
    this.prefix = prefix;
    this.windowMs = 60 * 1000;
  }

  // Called once by express-rate-limit with the resolved limiter options.
  init(options) {
    this.windowMs = options.windowMs;
  }

  _key(key) {
    return `${this.prefix}${key}`;
  }

  async increment(key) {
    const now = Date.now();
    const resetTime = new Date(now + this.windowMs);

    // Match only a live window; on a miss, upsert a fresh one. `key` isn't
    // unique, so an expired row (not yet reaped by TTL) can't cause a conflict.
    const doc = await RateLimitHit.findOneAndUpdate(
      { key: this._key(key), expiresAt: { $gt: new Date(now) } },
      { $inc: { totalHits: 1 }, $setOnInsert: { key: this._key(key), expiresAt: resetTime } },
      { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
    );

    return { totalHits: doc.totalHits, resetTime: doc.expiresAt };
  }

  async decrement(key) {
    await RateLimitHit.findOneAndUpdate(
      { key: this._key(key), expiresAt: { $gt: new Date() }, totalHits: { $gt: 0 } },
      { $inc: { totalHits: -1 } }
    );
  }

  async resetKey(key) {
    await RateLimitHit.deleteMany({ key: this._key(key) });
  }

  // Wipes every window. This is what keeps the existing test's afterEach hook
  // (`authLimiterStore.resetAll()`) working unmodified.
  async resetAll() {
    await RateLimitHit.deleteMany({});
  }
}

module.exports = MongoRateLimitStore;
