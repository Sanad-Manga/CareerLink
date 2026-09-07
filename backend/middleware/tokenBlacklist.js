// Mongo-backed JWT blacklist. Survives restarts, is shared across instances, and
// self-evicts via a TTL index on `expiresAt` (see models/BlacklistedToken).
const BlacklistedToken = require("../models/BlacklistedToken");

// Add a token's jti to the blacklist.
// `exp` is the JWT `exp` claim (seconds since epoch).
// Upsert so a double logout doesn't throw on the unique index.
const add = async (jti, exp) => {
  const expiresAt = new Date(exp * 1000);
  await BlacklistedToken.updateOne(
    { jti },
    { $setOnInsert: { jti, expiresAt } },
    { upsert: true }
  );
};

// Return true if the jti has been blacklisted.
const has = async (jti) => {
  const found = await BlacklistedToken.exists({ jti });
  return Boolean(found);
};

module.exports = { add, has };
