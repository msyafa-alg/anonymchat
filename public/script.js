// Configuration
const API_BASE = '/api';
let myUser = null;
let lastMessageId = 0;
let isTyping = false;
let typingTimeout;

// DOM Elements
const messagesArea = document.getElementById('messagesArea');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const myUsernameSpan = document.getElementById('myUsername');
const onlineCountSpan = document.getElementById('onlineCount');
const activeUsersDiv = document.getElementById('activeUsers');
const typingIndicator = document.getElementById('typingIndicator');
const connectionStatus = document.getElementById('connectionStatus');

// Initialize
async function init() {
    try {
        // Join as new user
        const joinRes = await fetch(`${API_BASE}/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const joinData = await joinRes.json();
        if (joinData.success) {
            myUser = joinData.user;
            myUsernameSpan.textContent = myUser.name;
            updateConnectionStatus(true);
            addSystemMessage(`✨ Welcome ${myUser.name}!`);
            
            // Start polling
            startPolling();
            startHeartbeat();
            loadActiveUsers();
        }
    } catch (error) {
        console.error('Init error:', error);
        updateConnectionStatus(false);
    }
}

// Poll for new messages
function startPolling() {
    const poll = async () => {
        try {
            const res = await fetch(`${API_BASE}/messages?lastId=${lastMessageId}`);
            const data = await res.json();
            
            if (data.success && data.messages.length > 0) {
                data.messages.forEach(msg => {
                    const isOwn = msg.userName === myUser?.name;
                    addMessage(msg.userName, msg.message, msg.time, isOwn);
                    lastMessageId = Math.max(lastMessageId, msg.id);
                });
            }
            
            updateConnectionStatus(true);
        } catch (error) {
            console.error('Poll error:', error);
            updateConnectionStatus(false);
        }
        
        // Poll every 1 second
        setTimeout(poll, 1000);
    };
    
    poll();
}

// Send heartbeat every 30 seconds
function startHeartbeat() {
    setInterval(async () => {
        if (myUser) {
            try {
                await fetch(`${API_BASE}/users?userId=${myUser.id}`, {
                    method: 'PUT'
                });
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        }
    }, 30000);
}

// Load active users
async function loadActiveUsers() {
    const load = async () => {
        try {
            const res = await fetch(`${API_BASE}/users`);
            const data = await res.json();
            
            if (data.success) {
                onlineCountSpan.textContent = `${data.count} online`;
                
                // Update users list
                let html = '';
                data.users.forEach(user => {
                    const isMe = user.id === myUser?.id;
                    html += `
                        <div class="user-item">
                            <i class="fas fa-circle" style="color: ${isMe ? '#27ae60' : '#3498db'}"></i>
                            <span>${user.name}${isMe ? ' (You)' : ''}</span>
                        </div>
                    `;
                });
                
                if (data.users.length === 0) {
                    html = '<p class="no-users">No users online</p>';
                }
                
                activeUsersDiv.innerHTML = html;
            }
        } catch (error) {
            console.error('Load users error:', error);
        }
        
        setTimeout(load, 5000);
    };
    
    load();
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || !myUser) return;
    
    try {
        const res = await fetch(`${API_BASE}/messages`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userName: myUser.name,
                message: message
            })
        });
        
        const data = await res.json();
        if (data.success) {
            messageInput.value = '';
        }
    } catch (error) {
        console.error('Send error:', error);
        alert('Failed to send message. Check connection.');
    }
});

// Typing indicator
messageInput.addEventListener('input', () => {
    if (!isTyping) {
        isTyping = true;
        // In a real app, you'd broadcast typing status
        // For now, we'll just show local indicator
    }
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        isTyping = false;
    }, 1000);
});

// Functions
function addMessage(userName, message, time, isOwn = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
    
    messageDiv.innerHTML = `
        <div class="message-header">
            <span class="message-user">${escapeHtml(userName)}</span>
            <span class="message-time">${time}</span>
        </div>
        <div class="message-content">${escapeHtml(message)}</div>
    `;
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(text) {
    const systemDiv = document.createElement('div');
    systemDiv.style.cssText = `
        text-align: center;
        color: #95a5a6;
        font-size: 12px;
        margin: 10px 0;
        font-style: italic;
        animation: fadeIn 0.3s ease;
    `;
    systemDiv.textContent = text;
    messagesArea.appendChild(systemDiv);
    scrollToBottom();
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #27ae60;"></i> Connected';
    } else {
        connectionStatus.innerHTML = '<i class="fas fa-circle" style="color: #e74c3c;"></i> Disconnected';
    }
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Handle page unload
window.addEventListener('beforeunload', async () => {
    if (myUser) {
        try {
            await fetch(`${API_BASE}/users?userId=${myUser.id}`, {
                method: 'DELETE',
                keepalive: true
            });
        } catch (error) {
            console.error('Cleanup error:', error);
        }
    }
});

// Start the app
init();