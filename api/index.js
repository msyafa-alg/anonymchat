// In-memory storage
let messages = [];
let users = [];
let messageId = 1;
let userId = 1;

// Maximum messages to keep
const MAX_MESSAGES = 50;

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET request - fetch messages and users
    if (req.method === 'GET') {
        try {
            // Clean up inactive users (older than 1 minute)
            const now = Date.now();
            users = users.filter(u => now - u.lastSeen < 60000);
            
            // Get last message ID from query
            const lastId = parseInt(req.query.lastId) || 0;
            const newMessages = messages.filter(msg => msg.id > lastId);
            
            return res.status(200).json({
                success: true,
                messages: newMessages,
                users: users.map(u => ({ id: u.id, name: u.name })),
                onlineCount: users.length,
                timestamp: Date.now()
            });
        } catch (error) {
            return res.status(500).json({ success: false, error: 'Server error' });
        }
    }

    // POST request - handle all actions
    if (req.method === 'POST') {
        try {
            const { action, userName, message } = req.body;

            // ACTION: JOIN
            if (action === 'join') {
                const randomNum = Math.floor(Math.random() * 9000 + 1000);
                const newUserName = `Anonym-${randomNum}`;
                
                const newUser = {
                    id: userId++,
                    name: newUserName,
                    lastSeen: Date.now()
                };
                
                users.push(newUser);
                
                // Add system message
                const systemMsg = {
                    id: messageId++,
                    userName: '💬 System',
                    message: `👋 ${newUserName} joined the chat`,
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    isSystem: true
                };
                messages.push(systemMsg);
                
                // Trim messages if needed
                if (messages.length > MAX_MESSAGES) {
                    messages = messages.slice(-MAX_MESSAGES);
                }
                
                return res.status(200).json({
                    success: true,
                    user: newUser,
                    users: users.map(u => ({ id: u.id, name: u.name })),
                    onlineCount: users.length
                });
            }

            // ACTION: SEND MESSAGE
            if (action === 'send') {
                if (!userName || !message) {
                    return res.status(400).json({ 
                        success: false, 
                        error: 'Username and message required' 
                    });
                }
                
                const newMessage = {
                    id: messageId++,
                    userName: userName,
                    message: message.substring(0, 500),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    timestamp: Date.now()
                };
                
                messages.push(newMessage);
                
                // Trim messages
                if (messages.length > MAX_MESSAGES) {
                    messages = messages.slice(-MAX_MESSAGES);
                }
                
                return res.status(201).json({
                    success: true,
                    message: newMessage
                });
            }

            // ACTION: HEARTBEAT
            if (action === 'heartbeat') {
                const user = users.find(u => u.name === userName);
                if (user) {
                    user.lastSeen = Date.now();
                }
                
                return res.status(200).json({ 
                    success: true 
                });
            }

            // ACTION: LEAVE
            if (action === 'leave') {
                users = users.filter(u => u.name !== userName);
                
                return res.status(200).json({ 
                    success: true 
                });
            }

            // Unknown action
            return res.status(400).json({ 
                success: false, 
                error: 'Unknown action' 
            });

        } catch (error) {
            return res.status(500).json({ 
                success: false, 
                error: 'Server error' 
            });
        }
    }

    // Method not allowed
    return res.status(405).json({ 
        success: false, 
        error: 'Method not allowed' 
    });
}