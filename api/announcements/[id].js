const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'smart-mirror-secret-key-2024';

const state = global.__SMART_MIRROR_STATE__ || (global.__SMART_MIRROR_STATE__ = {
  users: [],
  announcements: [],
  events: []
});

module.exports = async (req, res) => {
  const { id } = req.query;
  const annId = parseInt(id, 10);

  if (!Number.isFinite(annId)) return res.status(400).json({ error: 'Invalid id' });

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access token required' });

  return jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });

    if (req.method === 'PUT') {
      const { title, content } = req.body || {};
      const announcement = state.announcements.find(a => a.id === annId);
      if (!announcement) return res.status(404).json({ error: 'Announcement not found' });

      if (title) announcement.title = title;
      if (content) announcement.content = content;
      announcement.updatedAt = new Date().toISOString();

      return res.json({ success: true, announcement });
    }

    if (req.method === 'DELETE') {
      const index = state.announcements.findIndex(a => a.id === annId);
      if (index === -1) return res.status(404).json({ error: 'Announcement not found' });
      state.announcements.splice(index, 1);
      return res.json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  });
};

