
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
// Needed so OPTIONS requests succeed (some browsers/proxies)
app.options('*', cors());
app.use(express.static('public'));


// Secret key
const JWT_SECRET = process.env.JWT_SECRET || 'smart-mirror-secret-key-2024';


// Data storage
let announcements = [];
let events = [];
let users = [];

// Create default admin
const defaultAdmin = {
  id: 1,
  username: 'admin',
  password: bcrypt.hashSync('admin123', 10),
  role: 'admin',
  createdAt: new Date().toISOString()
};
users.push(defaultAdmin);

// Sample data
announcements.push({
  id: 1,
  title: 'Welcome to NU CEAT Smart Mirror',
  content: 'This is your announcement system. You can post announcements here.',
  date: new Date().toISOString(),
  priority: 'normal',
  createdBy: 'admin',
  createdAt: new Date().toISOString()
});

events.push({
  id: 1,
  title: 'Welcome Event',
  date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  description: 'Welcome to the Smart Mirror system!',
  createdBy: 'admin',
  createdAt: new Date().toISOString()
});

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

// Register
app.post('/api/register', (req, res) => {
  // Only allow JSON body
  // (keeps behavior consistent when deployed)

  const { username, password, confirmPassword } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  if (users.find(u => u.username === username)) {
    return res.status(400).json({ error: 'Username already exists' });
  }
  
  const newUser = {
    id: users.length + 1,
    username: username,
    password: bcrypt.hashSync(password, 10),
    role: 'user',
    createdAt: new Date().toISOString()
  };
  
  users.push(newUser);
  res.json({ success: true, message: 'Registration successful!' });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  const user = users.find(u => u.username === username);
  
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
  
  res.json({
    success: true,
    token: token,
    user: { username: user.username, role: user.role }
  });
});

// Verify token
app.post('/api/verify', (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.json({ authenticated: false });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.json({ authenticated: false });
    }
    res.json({
      authenticated: true,
      user: { username: user.username, role: user.role }
    });
  });
});

// Change password
app.post('/api/change-password', authenticateToken, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }
  
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }
  
  const user = users.find(u => u.id === req.user.id);
  
  if (!bcrypt.compareSync(currentPassword, user.password)) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }
  
  user.password = bcrypt.hashSync(newPassword, 10);
  res.json({ success: true, message: 'Password changed successfully!' });
});

// Get all data (PUBLIC for mirror)
app.get('/api/announcements-public', (req, res) => {
  res.json({ announcements: announcements, events: events });
});

// (Keep secured endpoint for admin UI if you need it)
app.get('/api/announcements', authenticateToken, (req, res) => {
  res.json({ announcements: announcements, events: events });
});


// --- SSE setup (simple polling fallback uses public page anyway) ---
let sseClients = [];

function broadcastSSEUpdate() {
  const payload = `event: update\ndata: updated\n\n`;
  sseClients.forEach(res => {
    try { res.write(payload); } catch (e) {}
  });
}

// SSE stream (PUBLIC)
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // initial ping
  res.write('event: ping\ndata: ok\n\n');

  sseClients.push(res);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== res);
  });
});

// Create announcement
app.post('/api/announcements', authenticateToken, (req, res) => {
  const { title, content, priority = 'normal' } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' });
  }
  const newAnnouncement = {
    id: Date.now(),
    title: title,
    content: content,
    date: new Date().toISOString(),
    priority: priority,
    createdBy: req.user.username,
    createdAt: new Date().toISOString()
  };
  announcements.unshift(newAnnouncement);
  broadcastSSEUpdate();
  res.json({ success: true, announcement: newAnnouncement });
});



// Update announcement
app.put('/api/announcements/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const { title, content } = req.body;
  
  const announcement = announcements.find(a => a.id === id);
  
  if (!announcement) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  
  if (title) announcement.title = title;
  if (content) announcement.content = content;
  announcement.updatedAt = new Date().toISOString();
  
  res.json({ success: true, announcement: announcement });
});

// Delete announcement
app.delete('/api/announcements/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = announcements.findIndex(a => a.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Announcement not found' });
  }
  
  announcements.splice(index, 1);
  res.json({ success: true });
});

// Create event
app.post('/api/events', authenticateToken, (req, res) => {
  const { title, date, description } = req.body;
  if (!title || !date) {
    return res.status(400).json({ error: 'Title and date are required' });
  }
  
  const newEvent = {
    id: Date.now(),
    title: title,
    date: date,
    description: description || '',
    createdBy: req.user.username,
    createdAt: new Date().toISOString()
  };
  
  events.push(newEvent);
  broadcastSSEUpdate();
  res.json({ success: true, event: newEvent });
});


// Delete event
app.delete('/api/events/:id', authenticateToken, (req, res) => {
  const id = parseInt(req.params.id);
  const index = events.findIndex(e => e.id === id);
  
  if (index === -1) {
    return res.status(404).json({ error: 'Event not found' });
  }
  
  events.splice(index, 1);
  res.json({ success: true });
});

// Get stats
app.get('/api/stats', authenticateToken, (req, res) => {
  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= now).length;
  
  res.json({
    totalAnnouncements: announcements.length,
    totalEvents: events.length,
    upcomingEvents: upcomingEvents
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n========================================');
  console.log('🚀 SMART MIRROR ADMIN PANEL');
  console.log('========================================');
  console.log(`📡 Server: http://localhost:${PORT}`);
  console.log(`🔐 Login: admin / admin123`);
  console.log('========================================\n');
});

