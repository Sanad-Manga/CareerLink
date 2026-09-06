// Shared application constants.

// How long a password-reset OTP stays valid after it is sent.
// Single source of truth: used to set `otpExpire` in authController and
// interpolated into the OTP email copy so the two can't drift apart.
const OTP_EXPIRY_MINUTES = 10;

module.exports = { OTP_EXPIRY_MINUTES };
