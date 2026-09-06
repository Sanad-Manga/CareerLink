const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const blacklist = require("../middleware/tokenBlacklist");
const validator = require("validator");
const xss = require("xss");
const { sendResetEmail, sendOtpEmail } = require("../services/emailService");
const { OTP_EXPIRY_MINUTES } = require("../config/constants");

// Generate JWT Token
const generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, jti: crypto.randomUUID() },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRE || '7d',
    }
  );
};

// POST /api/v1/auth/register
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Validate email format
    if (!validator.isEmail(email)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Sanitize inputs
    const sanitizedEmail = xss(validator.normalizeEmail(email));
    const sanitizedName = xss(validator.escape(name));

    // Block script injection attempts in name field
    const xssPattern = /(<script|alert\s*\(|javascript:|on\w+=)/i;
    if (xssPattern.test(name)) {
      return res.status(400).json({
        success: false,
        message: "Invalid characters in name field",
      });
    }

    // Validate name length
    if (!validator.isLength(sanitizedName, { min: 2, max: 50 })) {
      return res.status(400).json({
        success: false,
        message: "Name must be between 2 and 50 characters",
      });
    }

    // Validate name contains letters, spaces, hyphens and apostrophes only
    if (/[^a-zA-Z\s\-']/.test(sanitizedName)) {
      return res.status(400).json({
        success: false,
        message: "Name contains invalid characters",
      });
    }

    const allowedRoles = ["jobSeeker", "recruiter"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Role must be 'jobSeeker' or 'recruiter'",
      });
    }

    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already in use",
      });
    }

    // Pass plain password — pre-save hook handles hashing
    const user = new User({
      name: sanitizedName,
      email: sanitizedEmail,
      password: password,
      role,
      status: role === "recruiter" ? "pending" : "approved",
    });

    await user.save();

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/login
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = validator.normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Generate token
    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        profilePicture: user.profilePicture || "",
        skills: user.skills || [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/logout
exports.logout = async (req, res, next) => {
  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.decode(token);
    if (decoded?.jti) {
      blacklist.add(decoded.jti);
    }
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/forgot-password
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Please provide an email",
      });
    }

    const normalizedEmail = validator.normalizeEmail(email);
    const user = await User.findOne({ email: normalizedEmail });

    // Always return 200 to avoid email enumeration
    if (!user) {
      return res.status(200).json({
        success: true,
        message: "If that email exists, an OTP has been sent",
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    user.otp = otpHash;
    user.otpExpire = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
    await user.save();

    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      user.otp = undefined;
      user.otpExpire = undefined;
      await user.save();
      console.error("Email error:", emailErr);
      return res.status(500).json({ success: false, message: "Failed to send OTP email" });
    }

    res.status(200).json({
      success: true,
      message: "If that email exists, an OTP has been sent",
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/auth/verify-otp
exports.verifyOtp = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and OTP",
      });
    }

    const otpHash = crypto.createHash("sha256").update(otp).digest("hex");

    const normalizedEmail = validator.normalizeEmail(email);
    const user = await User.findOne({
      email: normalizedEmail,
      otp: otpHash,
      otpExpire: { $gt: Date.now() },
    }).select("+otp +otpExpire");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "OTP is invalid or has expired",
      });
    }

    user.otp = undefined;
    user.otpExpire = undefined;

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpire = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified",
      resetToken,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/auth/validate-reset-token/:token
exports.validateResetToken = async (req, res, next) => {
  try {
    const tokenHash = crypto.createHash("sha256").update(req.params.token).digest("hex");
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire");
    if (!user) {
      return res.status(400).json({ success: false, message: "Token is invalid or has expired" });
    }
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/auth/reset-password/:token
exports.resetPassword = async (req, res, next) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Please provide a new password",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const resetTokenHash = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: resetTokenHash,
      resetPasswordExpire: { $gt: Date.now() },
    }).select("+resetPasswordToken +resetPasswordExpire +password +passwordHistory");

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Token is invalid or has expired",
      });
    }

    // Check new password is not the same as current password
    const isSameAsCurrent = await bcrypt.compare(password, user.password);
    if (isSameAsCurrent) {
      return res.status(400).json({
        success: false,
        message: "New password cannot be the same as your current password",
      });
    }

    // Check new password against last 5 password history
    const history = user.passwordHistory || [];
    for (const oldHash of history) {
      const reused = await bcrypt.compare(password, oldHash);
      if (reused) {
        return res.status(400).json({
          success: false,
          message: "You cannot reuse any of your last 5 passwords",
        });
      }
    }

    // Push current hash to history (keep last 5)
    history.push(user.password);
    user.passwordHistory = history.slice(-5);

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    const newToken = generateToken(user);

    res.status(200).json({
      success: true,
      token: newToken,
      user: {
        _id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (err) {
    next(err);
  }
};

