// State
let myUser = null;
let lastMessageId = 0;

// DOM Elements
const messagesArea = document.getElementById('messagesArea');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const myUsernameSpan = document.getElementById('myUsername');
const onlineCountSpan = document.getElementById('onlineCount');
const activeUsersDiv = document.getElementById('activeUsers');
const connectionStatus = document.getElementById('connectionStatus');

// Initialize
async function init() {
    try {
        updateStatus('Connecting...', '#f39c12');
        
        // Join as new user
        const joinRes = await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join' })
        });
        
        if (!joinRes.ok) {
            throw new Error(`HTTP error! status: ${joinRes.status}`);
        }
        
        const joinData = await joinRes.json();
        
        if (joinData.success) {
            myUser = joinData.user;
            myUsernameSpan.textContent = myUser.name;
            updateStatus('Connected', '#27ae60');
            
            // Update users list
            updateUsersList(joinData.users, joinData.onlineCount);
            
            // Start polling
            startPolling();
            startHeartbeat();
            
            addSystemMessage(`✨ Welcome ${myUser.name}! You're connected.`);
        }
    } catch (error) {
        console.error('Init error:', error);
        updateStatus('Connection failed', '#e74c3c');
        addSystemMessage('❌ Failed to connect. Refreshing...');
        
        // Retry after 3 seconds
        setTimeout(() => {
            window.location.reload();
        }, 3000);
    }
}

// Poll for new messages
function startPolling() {
    const poll = async () => {
        try {
            const res = await fetch(`/api/index?lastId=${lastMessageId}`, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
            }
            
            const data = await res.json();
            
            if (data.success) {
                // Update messages
                if (data.messages && data.messages.length > 0) {
                    data.messages.forEach(msg => {
                        const isOwn = msg.userName === myUser?.name;
                        addMessage(msg.userName, msg.message, msg.time, isOwn, msg.isSystem);
                        lastMessageId = Math.max(lastMessageId, msg.id);
                    });
                }
                
                // Update users and online count
                if (data.users) {
                    updateUsersList(data.users, data.onlineCount);
                }
                
                updateStatus('Connected', '#27ae60');
            }
        } catch (error) {
            console.error('Poll error:', error);
            updateStatus('Reconnecting...', '#f39c12');
        }
        
        // Poll every 1 second
        setTimeout(poll, 1000);
    };
    
    poll();
}

// Heartbeat every 30 seconds
function startHeartbeat() {
    setInterval(async () => {
        if (myUser) {
            try {
                await fetch('/api/index', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        action: 'heartbeat', 
                        userName: myUser.name 
                    })
                });
            } catch (error) {
                console.error('Heartbeat error:', error);
            }
        }
    }, 30000);
}

// Send message
messageForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const message = messageInput.value.trim();
    if (!message || !myUser) return;
    
    // Disable input temporarily
    messageInput.disabled = true;
    
    try {
        const res = await fetch('/api/index', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send',
                userName: myUser.name,
                message: message
            })
        });
        
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        
        const data = await res.json();
        if (data.success) {
            messageInput.value = '';
        }
    } catch (error) {
        console.error('Send error:', error);
        addSystemMessage('❌ Failed to send message');
    } finally {
        messageInput.disabled = false;
        messageInput.focus();
    }
});

// Helper Functions
function updateStatus(text, color) {
    if (connectionStatus) {
        connectionStatus.innerHTML = `<i class="fas fa-circle" style="color: ${color}"></i> ${text}`;
    }
}

function updateUsersList(users, count) {
    if (onlineCountSpan) {
        onlineCountSpan.textContent = `${count || 0} online`;
    }
    
    if (activeUsersDiv && users) {
        let html = '';
        users.forEach(user => {
            const isMe = user.name === myUser?.name;
            html += `
                <div class="user-item">
                    <i class="fas fa-circle" style="color: ${isMe ? '#27ae60' : '#3498db'}; font-size: 8px;"></i>
                    <span>${escapeHtml(user.name)}${isMe ? ' (You)' : ''}</span>
                </div>
            `;
        });
        
        if (users.length === 0) {
            html = '<p class="no-users">No users online</p>';
        }
        
        activeUsersDiv.innerHTML = html;
    }
}

function addMessage(userName, message, time, isOwn = false, isSystem = false) {
    const messageDiv = document.createElement('div');
    
    if (isSystem) {
        messageDiv.className = 'system-message';
        messageDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(message)}`;
    } else {
        messageDiv.className = `message ${isOwn ? 'own' : 'other'}`;
        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-user">${escapeHtml(userName)}</span>
                <span class="message-time">${time}</span>
            </div>
            <div class="message-content">${escapeHtml(message)}</div>
        `;
    }
    
    messagesArea.appendChild(messageDiv);
    scrollToBottom();
}

function addSystemMessage(text) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'system-message';
    systemDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(text)}`;
    messagesArea.appendChild(systemDiv);
    scrollToBottom();
}

function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Leave on page unload
window.addEventListener('beforeunload', async () => {
    if (myUser) {
        try {
            await fetch('/api/index', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'leave', 
                    userName: myUser.name 
                }),
                keepalive: true
            });
        } catch (error) {
            console.error('Leave error:', error);
        }
    }
});

// Start the app
init();