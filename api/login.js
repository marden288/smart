const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-mirror-secret-key-2024';

// In-memory store (same approach as existing server.js)
// NOTE: For real persistence, use a DB/file.
const state = global.__SMART_MIRROR_STATE__ || (global.__SMART_MIRROR_STATE__ = {
  users: [],
  announcements: [],
  events: []
});

function ensureDefaults() {
  if (state.users.length) return;

  const defaultAdmin = {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
    createdAt: new Date().toISOString()
  };
  state.users.push(defaultAdmin);

  state.announcements.push({
    id: 1,
    title: 'Welcome to NU CEAT Smart Mirror',
    content: 'This is your announcement system. You can post announcements here.',
    date: new Date().toISOString(),
    priority: 'normal',
    createdBy: 'admin',
    createdAt: new Date().toISOString()
  });

  state.events.push({
    id: 1,
    title: 'Welcome Event',
    date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    description: 'Welcome to the Smart Mirror system!',
    createdBy: 'admin',
    createdAt: new Date().toISOString()
  });
}

ensureDefaults();

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const user = state.users.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    if (!bcrypt.compareSync(password, user.password)) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      token,
      user: { username: user.username, role: user.role }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

