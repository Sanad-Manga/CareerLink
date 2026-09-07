const User = require('../models/User');
const JobPost = require('../models/JobPost');
const Application = require('../models/Application');

// GET /api/v1/users
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .select('_id name email role status createdAt')
      .lean();

    res.status(200).json({
      success: true,
      total,
      page: Number(page),
      users,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id
exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('_id name email role status')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/v1/users/:id/status
exports.updateUserStatus = async (req, res, next) => {
  const { status } = req.body;
  const allowedStatuses = ['approved', 'rejected', 'pending'];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Status must be 'approved', 'rejected', or 'pending'",
    });
  }

  try {
    const user = await User.findById(req.params.id).select('_id name email role status');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Admins can't be demoted, and an admin can't change their own status.
    if (user.role === 'admin' || req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot modify this account',
      });
    }

    user.status = status;
    await user.save();

    res.status(200).json({
      success: true,
      user,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/users/:id/profile (any authenticated user)
exports.getPublicProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name email role bio skills profilePicture status')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ success: true, user });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Admins can't be deleted, and an admin can't delete their own account.
    if (user.role === 'admin' || req.params.id === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete this account',
      });
    }

    // Cascade: don't orphan documents tied to this user.
    const jobIds = await JobPost.find({ createdBy: user._id }).distinct('_id');

    await user.deleteOne();
    await JobPost.deleteMany({ createdBy: user._id });
    await Application.deleteMany({ job: { $in: jobIds } }); // applications TO a deleted recruiter's jobs
    await Application.deleteMany({ user: user._id });       // applications BY a deleted job seeker

    res.status(200).json({
      success: true,
      message: 'User deleted',
    });
  } catch (err) {
    next(err);
  }
};