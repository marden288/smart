const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-mirror-secret-key-2024';

const state = global.__SMART_MIRROR_STATE__ || (global.__SMART_MIRROR_STATE__ = {
  users: [],
  announcements: [],
  events: []
});

function authenticateToken(req, res) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    return null;
  });
}

// Ensure defaults similar to server.js (only if arrays empty)
(function ensureDefaults() {
  if (state.users.length && state.announcements.length && state.events.length) return;

  if (!state.users.length) {
    const bcrypt = require('bcryptjs');
    const defaultAdmin = {
      id: 1,
      username: 'admin',
      password: bcrypt.hashSync('admin123', 10),
      role: 'admin',
      createdAt: new Date().toISOString()
    };
    state.users.push(defaultAdmin);
  }

  if (!state.announcements.length) {
    state.announcements.push({
      id: 1,
      title: 'Welcome to NU CEAT Smart Mirror',
      content: 'This is your announcement system. You can post announcements here.',
      date: new Date().toISOString(),
      priority: 'normal',
      createdBy: 'admin',
      createdAt: new Date().toISOString()
    });
  }

  if (!state.events.length) {
    state.events.push({
      id: 1,
      title: 'Welcome Event',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      description: 'Welcome to the Smart Mirror system!',
      createdBy: 'admin',
      createdAt: new Date().toISOString()
    });
  }
})();

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    return jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });
      return res.json({ announcements: state.announcements, events: state.events });
    });
  }

  if (req.method === 'POST') {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access token required' });

    return jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(403).json({ error: 'Invalid or expired token' });

      try {
        const { title, content, priority = 'normal' } = req.body || {};
        if (!title || !content) {
          return res.status(400).json({ error: 'Title and content are required' });
        }

        const newAnnouncement = {
          id: Date.now(),
          title,
          content,
          date: new Date().toISOString(),
          priority,
          createdBy: user.username,
          createdAt: new Date().toISOString()
        };

        state.announcements.unshift(newAnnouncement);
        return res.json({ success: true, announcement: newAnnouncement });
      } catch (e) {
        console.error(e);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
};

