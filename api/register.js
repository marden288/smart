const bcrypt = require('bcryptjs');

const state = global.__SMART_MIRROR_STATE__ || (global.__SMART_MIRROR_STATE__ = {
  users: [],
  announcements: [],
  events: []
});

// Ensure default admin exists
(function ensureDefaults() {
  if (state.users.length) return;

  const defaultAdmin = {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  state.users.push(defaultAdmin);
})();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password, confirmPassword } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    if (state.users.find(u => u.username === username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = {
      id: state.users.length + 1,
      username,
      password: bcrypt.hashSync(password, 10),
      role: 'user',
      createdAt: new Date().toISOString()
    };

    state.users.push(newUser);
    return res.json({ success: true, message: 'Registration successful!' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

