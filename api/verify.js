const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-mirror-secret-key-2024';

const state = global.__SMART_MIRROR_STATE__ || (global.__SMART_MIRROR_STATE__ = {
  users: [],
  announcements: [],
  events: []
});

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { token } = req.body || {};
  if (!token) return res.json({ authenticated: false });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.json({ authenticated: false });
    return res.json({
      authenticated: true,
      user: { username: user.username, role: user.role }
    });
  });
};

