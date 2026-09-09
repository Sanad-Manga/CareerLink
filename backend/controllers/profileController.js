const User = require("../models/User");
const hf = require("../services/hfService");
const { uploadProfilePicture } = require("../services/uploadService");
const { getUserEmbedding } = require("../services/embedding");

exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    res.status(200).json({ success: true, user });
  } catch (err) { next(err); }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const { name, bio } = req.body;
    const updates = {};

    if (name !== undefined) updates.name = name;
    if (bio !== undefined) {
      updates.bio = bio;
      updates.embedding = await getUserEmbedding(req.user.skills, bio);
    }

    if (req.file) {
      const result = await uploadProfilePicture(req.file.buffer, req.user._id);
      updates.profilePicture = result.secure_url;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(200).json({
        success: true,
        user: {
          _id: req.user._id,
          name: req.user.name,
          email: req.user.email,
          bio: req.user.bio || '',
          skills: req.user.skills || [],
          profilePicture: req.user.profilePicture || '',
          role: req.user.role,
          status: req.user.status,
        },
      });
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.status(200).json({
      success: true,
      user: {
        _id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        bio: updatedUser.bio || '',
        skills: updatedUser.skills || [],
        profilePicture: updatedUser.profilePicture || '',
        role: updatedUser.role,
        status: updatedUser.status,
      },
    });
  } catch (err) { next(err); }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: 'Please provide current and new password' });
    }

    if (newPassword.length < 6 || newPassword.length > 30) {
      return res.status(400).json({ success: false, message: 'Password must be between 6 and 30 characters' });
    }

    const user = await User.findById(req.user._id).select('+password');
    const isMatch = await user.comparePassword(currentPassword);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({ success: false, message: 'New password cannot be the same as current password' });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({ success: true, message: 'Password updated successfully' });
  } catch (err) { next(err); }
};

// Keyword-based tech skill extraction — NER models (dslim/bert-base-NER) are trained on
// CoNLL-2003 (Person/Org/Loc/Misc) and tag "GIU" as ORG while missing "Node.js"/"MERN".
const TECH_SKILLS = [
  // Languages (js/ts catch abbreviations; 'c' last so it doesn't shadow c++/c#)
  'javascript', 'js', 'typescript', 'ts', 'python', 'java', 'c++', 'c#', 'php', 'ruby', 'swift',
  'kotlin', 'go', 'golang', 'rust', 'scala', 'matlab', 'dart', 'lua', 'perl', 'haskell', 'c',
  // Web frontend
  'html', 'css', 'html5', 'css3', 'sass', 'less', 'react', 'vue', 'angular', 'svelte',
  'next.js', 'nextjs', 'nuxt', 'gatsby', 'tailwind', 'tailwindcss', 'bootstrap', 'jquery',
  'redux', 'mobx', 'zustand', 'vite', 'webpack', 'babel', 'vite',
  // Backend
  'node.js', 'nodejs', 'express', 'express.js', 'django', 'flask', 'fastapi', 'spring',
  'spring boot', 'laravel', 'rails', 'ruby on rails', 'asp.net', 'nestjs', 'nest.js',
  'fastify', 'hapi',
  // Databases
  'mongodb', 'mysql', 'postgresql', 'postgres', 'sqlite', 'redis', 'elasticsearch',
  'cassandra', 'oracle', 'sql server', 'mssql', 'firebase', 'supabase', 'dynamodb',
  'mariadb', 'sql', 'nosql',
  // Cloud & DevOps
  'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'vercel', 'netlify', 'railway',
  'docker', 'kubernetes', 'k8s', 'terraform', 'ansible', 'jenkins', 'github actions',
  'ci/cd', 'linux', 'bash', 'nginx', 'apache',
  // Stacks & concepts (no standalone 'mern'/'mean' — they'd double-fire on "mern stack"/"mean stack")
  'mern stack', 'mean stack', 'lamp', 'full stack', 'fullstack', 'full-stack',
  'rest api', 'restful', 'graphql', 'websockets', 'socket.io', 'microservices',
  'jwt', 'oauth', 'api', 'mvc',
  // AI / ML / Data
  'machine learning', 'deep learning', 'tensorflow', 'pytorch', 'scikit-learn',
  'keras', 'nlp', 'computer vision', 'data science', 'pandas', 'numpy', 'matplotlib',
  'hugging face', 'openai', 'langchain',
  // Tools
  'git', 'github', 'gitlab', 'bitbucket', 'figma', 'jira', 'postman', 'linux',
  'powershell', 'agile', 'scrum', 'jest', 'mocha', 'cypress', 'selenium',
  // Mobile
  'react native', 'flutter', 'android', 'ios', 'expo',
];

function extractSkillsFromText(text) {
  const lower = text.toLowerCase();
  const found = [];
  for (const skill of TECH_SKILLS) {
    // Match whole words / tokens — avoid matching "c" inside "school"
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const boundary = /^[a-z]/.test(skill) ? `(?<![a-z])` : '';
    const endBoundary = /[a-z]$/.test(skill) ? `(?![a-z])` : '';
    const re = new RegExp(`${boundary}${escaped}${endBoundary}`, 'i');
    if (re.test(lower)) found.push(skill);
  }
  // Deduplicate: if "node.js" matched, drop plain "nodejs" duplicate
  const deduped = found.filter((s, _, arr) => {
    const normalized = s.replace(/[.\s-]/g, '');
    return !arr.some(other => other !== s && other.replace(/[.\s-]/g, '') === normalized && other.length > s.length);
  });
  // Map to canonical display names, then Set-dedup AFTER mapping so
  // 'js' + 'javascript' → ['JavaScript','JavaScript'] → ['JavaScript'] (not two entries)
  const map = {
    'javascript': 'JavaScript', 'js': 'JavaScript', 'typescript': 'TypeScript', 'ts': 'TypeScript',
    'python': 'Python', 'java': 'Java', 'php': 'PHP', 'html5': 'HTML5', 'css3': 'CSS3',
    'html': 'HTML', 'css': 'CSS', 'react': 'React', 'vue': 'Vue', 'angular': 'Angular',
    'svelte': 'Svelte', 'node.js': 'Node.js', 'nodejs': 'Node.js', 'express': 'Express',
    'mongodb': 'MongoDB', 'mysql': 'MySQL', 'postgresql': 'PostgreSQL', 'postgres': 'PostgreSQL',
    'redis': 'Redis', 'aws': 'AWS', 'gcp': 'GCP', 'docker': 'Docker',
    'kubernetes': 'Kubernetes', 'git': 'Git', 'github': 'GitHub', 'gitlab': 'GitLab',
    'mern stack': 'MERN Stack', 'mean stack': 'MEAN Stack',
    'sql': 'SQL', 'nosql': 'NoSQL', 'graphql': 'GraphQL', 'rest api': 'REST API',
    'api': 'API', 'jwt': 'JWT', 'linux': 'Linux', 'tailwind': 'Tailwind CSS',
    'tailwindcss': 'Tailwind CSS', 'bootstrap': 'Bootstrap', 'next.js': 'Next.js',
    'nextjs': 'Next.js', 'fullstack': 'Full Stack', 'full stack': 'Full Stack',
    'full-stack': 'Full Stack', 'machine learning': 'Machine Learning',
    'deep learning': 'Deep Learning', 'data science': 'Data Science',
    'react native': 'React Native', 'flutter': 'Flutter', 'sass': 'SASS', 'jest': 'Jest',
    'agile': 'Agile', 'scrum': 'Scrum', 'tensorflow': 'TensorFlow', 'pytorch': 'PyTorch',
    'scikit-learn': 'Scikit-learn', 'firebase': 'Firebase', 'supabase': 'Supabase',
  };
  const mapped = deduped.map(s => map[s.toLowerCase()] || s.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));
  return [...new Set(mapped)];
}

exports.extractSkills = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.bio || user.bio.trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Bio is empty. Update your profile first.",
      });
    }

    const skills = extractSkillsFromText(user.bio);

    user.skills = skills;
    user.embedding = await getUserEmbedding(skills, user.bio);
    await user.save();

    return res.status(200).json({ success: true, skills, extracted: skills });
  } catch (err) {
    next(err);
  }
};