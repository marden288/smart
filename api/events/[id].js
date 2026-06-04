const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-mirror-secret-key-2024';

const state = global.__SMART_MIRROR_STATE__ || (global.__SMART_MIRROR_STATE__ = {
  users: [],
  announcements: [],
  events: []
});

module.exports = async (req, res) => {
  const { id } = req.query;
  const eventId = parseInt(id, 10);
  if (!Number.isFinite(eventId)) return res.status(400).json({ error: 'Invalid id' });

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  return jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });

    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method not allowed' });

    const index = state.events.findIndex(e => e.id === eventId);
    if (index === -1) return res.status(404).json({ error: 'Event not found' });

    state.events.splice(index, 1);
    return res.json({ success: true });
  });
};

