const mongoose = require("mongoose");

const blacklistedTokenSchema = new mongoose.Schema({
  // JWT ID claim of the invalidated token. Unique — this index also serves the
  // indexed lookup done by auth.protect() on every request.
  jti: {
    type: String,
    required: true,
    unique: true,
  },
  // When the token would have expired on its own. A TTL index (below) evicts the
  // row at this time, so the collection can't grow unbounded.
  expiresAt: {
    type: Date,
    required: true,
  },
});

blacklistedTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("BlacklistedToken", blacklistedTokenSchema);
