const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    select: false,
  },
  profilePicture: {
    type: String,
  },
  bio: {
    type: String,
  },
  skills: {
    type: [String],
    default: [],
  },
  embedding: {
    type: [Number],
    select: false,
  },
  role: {
    type: String,
    enum: ['jobSeeker', 'recruiter', 'admin'],
    default: 'jobSeeker',
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  savedJobs: {
    type: [mongoose.Schema.Types.ObjectId],
    ref: 'JobPost',
    default: [],
    select: false,
  },
  resetPasswordToken: {
    type: String,
    select: false,
  },
  resetPasswordExpire: {
    type: Date,
    select: false,
  },
  otp: {
    type: String,
    select: false,
  },
  otpExpire: {
    type: Date,
    select: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  passwordHistory: {
    type: [String],   // stores bcrypt hashes of old passwords
    default: [],
    validate: [arrayLimit, '{PATH} exceeds the limit of 5'],
  }
});
// Mongoose 9+ async hooks don't receive a next callback — the promise resolving signals completion
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

function arrayLimit(val) {
  return val.length <= 5;   // keep last 5 passwords
}

module.exports = mongoose.model('User', userSchema);