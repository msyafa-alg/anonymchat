// State Management
let myUser = null;
let lastMessageId = 0;
let isDarkMode = false;
let isSidebarCollapsed = false;
let isMobileMenuOpen = false;
let typingTimeout;

// DOM Elements
const sidebar = document.getElementById('sidebar');
const messagesArea = document.getElementById('messagesArea');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');
const myUsernameSpan = document.getElementById('myUsername');
const myStatus = document.getElementById('myStatus');
const onlineCountSpan = document.getElementById('onlineCount');
const activeUsersDiv = document.getElementById('activeUsers');
const connectionStatus = document.getElementById('connectionStatus');
const typingIndicator = document.getElementById('typingIndicator');
const scrollBottomBtn = document.getElementById('scrollBottomBtn');
const themeToggle = document.getElementById('themeToggle');
const sidebarToggle = document.getElementById('sidebarToggle');
const mobileMenuBtn = document.getElementById('mobileMenuBtn');
const emojiBtn = document.getElementById('emojiBtn');
const emojiPicker = document.getElementById('emojiPicker');

// API Endpoint
const API_URL = '/api/index';

// Initialize
async function init() {
    try {
        updateConnectionStatus('Connecting...', '#f59e0b');
        
        const joinRes = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'join' })
        });
        
        if (!joinRes.ok) throw new Error(`HTTP ${joinRes.status}`);
        
        const joinData = await joinRes.json();
        
        if (joinData.success) {
            myUser = joinData.user;
            myUsernameSpan.textContent = myUser.name;
            updateConnectionStatus('Connected', '#10b981');
            
            updateUsersList(joinData.users, joinData.onlineCount);
            
            // Start services
            startPolling();
            startHeartbeat();
            
            addSystemMessage(`👋 Welcome ${myUser.name}!`);
        }
    } catch (error) {
        console.error('Init error:', error);
        updateConnectionStatus('Connection failed', '#ef4444');
        addSystemMessage('❌ Connection failed. Retrying...');
        setTimeout(init, 3000);
    }
}

// Polling for messages
function startPolling() {
    const poll = async () => {
        try {
            const res = await fetch(`${API_URL}?lastId=${lastMessageId}`, {
                method: 'GET',
                headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            
            const data = await res.json();
            
            if (data.success) {
                // Update messages
                if (data.messages?.length) {
                    data.messages.forEach(msg => {
                        const isOwn = msg.userName === myUser?.name;
                        const isSystem = msg.isSystem || msg.userName === '💬 System';
                        addMessage(msg.userName, msg.message, msg.time, isOwn, isSystem);
                        lastMessageId = Math.max(lastMessageId, msg.id);
                    });
                }
                
                // Update users
                if (data.users) {
                    updateUsersList(data.users, data.onlineCount);
                }
                
                updateConnectionStatus('Connected', '#10b981');
            }
        } catch (error) {
            console.error('Poll error:', error);
            updateConnectionStatus('Reconnecting...', '#f59e0b');
        }
        
        setTimeout(poll, 1000);
    };
    
    poll();
}

// Heartbeat
function startHeartbeat() {
    setInterval(async () => {
        if (myUser) {
            try {
                await fetch(API_URL, {
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
    
    messageInput.disabled = true;
    
    try {
        const res = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'send',
                userName: myUser.name,
                message: message
            })
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
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

// Typing indicator
messageInput.addEventListener('input', () => {
    if (!myUser) return;
    
    // Show local typing indicator
    typingIndicator.textContent = 'You are typing...';
    
    clearTimeout(typingTimeout);
    typingTimeout = setTimeout(() => {
        typingIndicator.textContent = '';
    }, 1000);
});

// Add message to UI
function addMessage(userName, message, time, isOwn = false, isSystem = false) {
    const messageDiv = document.createElement('div');
    
    if (isSystem) {
        messageDiv.className = 'message system';
        messageDiv.innerHTML = `
            <i class="fas fa-info-circle"></i>
            ${escapeHtml(message)}
        `;
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
    
    // Show scroll button if not at bottom
    checkScroll();
}

// Add system message
function addSystemMessage(text) {
    const systemDiv = document.createElement('div');
    systemDiv.className = 'message system';
    systemDiv.innerHTML = `<i class="fas fa-info-circle"></i> ${escapeHtml(text)}`;
    messagesArea.appendChild(systemDiv);
    scrollToBottom();
}

// Update users list
function updateUsersList(users, count) {
    onlineCountSpan.textContent = count || 0;
    
    if (!activeUsersDiv || !users) return;
    
    if (users.length === 0) {
        activeUsersDiv.innerHTML = '<div class="loading-users">No users online</div>';
        return;
    }
    
    let html = '';
    users.forEach(user => {
        const isMe = user.name === myUser?.name;
        html += `
            <div class="user-item">
                <i class="fas fa-circle" style="color: ${isMe ? '#10b981' : '#6366f1'};"></i>
                <span>${escapeHtml(user.name)}${isMe ? ' (You)' : ''}</span>
            </div>
        `;
    });
    
    activeUsersDiv.innerHTML = html;
}

// Update connection status
function updateConnectionStatus(text, color) {
    if (connectionStatus) {
        connectionStatus.innerHTML = `
            <i class="fas fa-circle" style="color: ${color}"></i>
            <span>${text}</span>
        `;
    }
    
    if (myStatus) {
        myStatus.innerHTML = `<i class="fas fa-circle" style="color: ${color}"></i> ${text}`;
    }
}

// Scroll functions
function scrollToBottom() {
    messagesArea.scrollTop = messagesArea.scrollHeight;
}

function checkScroll() {
    const isNearBottom = messagesArea.scrollHeight - messagesArea.scrollTop - messagesArea.clientHeight < 100;
    
    if (!isNearBottom) {
        scrollBottomBtn.classList.add('visible');
    } else {
        scrollBottomBtn.classList.remove('visible');
    }
}

messagesArea.addEventListener('scroll', checkScroll);

scrollBottomBtn.addEventListener('click', () => {
    messagesArea.scrollTo({
        top: messagesArea.scrollHeight,
        behavior: 'smooth'
    });
});

// Theme toggle
themeToggle.addEventListener('click', () => {
    isDarkMode = !isDarkMode;
    document.body.classList.toggle('dark-mode');
    themeToggle.innerHTML = isDarkMode ? 
        '<i class="fas fa-sun"></i>' : 
        '<i class="fas fa-moon"></i>';
});

// Sidebar toggle
sidebarToggle.addEventListener('click', () => {
    isSidebarCollapsed = !isSidebarCollapsed;
    sidebar.classList.toggle('collapsed');
    sidebarToggle.innerHTML = isSidebarCollapsed ?
        '<i class="fas fa-chevron-right"></i>' :
        '<i class="fas fa-chevron-left"></i>';
});

// Mobile menu
mobileMenuBtn.addEventListener('click', () => {
    isMobileMenuOpen = !isMobileMenuOpen;
    sidebar.classList.toggle('show');
});

// Close sidebar when clicking outside on mobile
document.addEventListener('click', (e) => {
    if (window.innerWidth <= 768 && 
        isMobileMenuOpen && 
        !sidebar.contains(e.target) && 
        !mobileMenuBtn.contains(e.target)) {
        sidebar.classList.remove('show');
        isMobileMenuOpen = false;
    }
});

// Emoji picker
emojiBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    emojiPicker.classList.toggle('show');
});

document.addEventListener('click', (e) => {
    if (!emojiPicker.contains(e.target) && !emojiBtn.contains(e.target)) {
        emojiPicker.classList.remove('show');
    }
});

// Emoji selection
document.querySelectorAll('.emoji-grid span').forEach(emoji => {
    emoji.addEventListener('click', () => {
        messageInput.value += emoji.textContent;
        messageInput.focus();
        emojiPicker.classList.remove('show');
    });
});

// Escape HTML
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
            await fetch(API_URL, {
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

// Start app
init();