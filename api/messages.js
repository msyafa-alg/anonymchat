// In-memory storage (akan hilang saat Vercel idle, tapi cukup untuk demo)
let messages = [];
let messageId = 1;

// Maximum messages to keep
const MAX_MESSAGES = 50;

module.exports = (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // GET messages
  if (req.method === 'GET') {
    const lastId = parseInt(req.query.lastId) || 0;
    const newMessages = messages.filter(msg => msg.id > lastId);
    
    res.status(200).json({
      success: true,
      messages: newMessages,
      timestamp: Date.now()
    });
    return;
  }

  // POST new message
  if (req.method === 'POST') {
    const { userName, message } = req.body;
    
    if (!userName || !message) {
      res.status(400).json({ 
        success: false, 
        error: 'Username and message required' 
      });
      return;
    }

    const newMessage = {
      id: messageId++,
      userName,
      message: message.substring(0, 500), // Limit message length
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      timestamp: Date.now()
    };

    messages.push(newMessage);

    // Keep only last MAX_MESSAGES
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(-MAX_MESSAGES);
    }

    res.status(201).json({
      success: true,
      message: newMessage
    });
    return;
  }

  // Method not allowed
  res.status(405).json({ success: false, error: 'Method not allowed' });
};