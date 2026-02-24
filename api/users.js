// Store active users
let users = [];
let userId = 1;

// User timeout (5 minutes)
const USER_TIMEOUT = 5 * 60 * 1000;

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET active users
  if (req.method === 'GET') {
    // Clean up inactive users
    const now = Date.now();
    users = users.filter(u => now - u.lastSeen < USER_TIMEOUT);
    
    res.status(200).json({
      success: true,
      users: users.map(u => ({ id: u.id, name: u.name })),
      count: users.length
    });
    return;
  }

  // POST new user (join)
  if (req.method === 'POST') {
    const randomNum = Math.floor(Math.random() * 9000 + 1000);
    const userName = `Anonym-${randomNum}`;
    
    const newUser = {
      id: userId++,
      name: userName,
      lastSeen: Date.now()
    };
    
    users.push(newUser);
    
    res.status(201).json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name
      }
    });
    return;
  }

  // DELETE user (leave)
  if (req.method === 'DELETE') {
    const { userId } = req.query;
    users = users.filter(u => u.id != userId);
    
    res.status(200).json({
      success: true,
      message: 'User removed'
    });
    return;
  }

  // PUT update last seen (heartbeat)
  if (req.method === 'PUT') {
    const { userId } = req.query;
    const user = users.find(u => u.id == userId);
    
    if (user) {
      user.lastSeen = Date.now();
    }
    
    res.status(200).json({ success: true });
    return;
  }

  res.status(405).json({ success: false, error: 'Method not allowed' });
};