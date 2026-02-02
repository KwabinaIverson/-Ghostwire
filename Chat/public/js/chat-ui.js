// chat-ui.js

/**
 * Generates a consistent HSL color based on a string seed (userId or username)
 */
function getUserColor(seed) {
    let hash = 0;
    const str = String(seed || 'unknown');
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash % 360);
    return `hsl(${hue}, 70%, 60%)`;
}

/**
 * Escapes HTML to prevent XSS attacks
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Renders the logged-in user's header (avatar + name)
 */
export function renderUserHeader(user) {
    const userNameEl = document.getElementById('userName');
    const avatarEl = document.getElementById('userAvatar');
    if (!user || !userNameEl || !avatarEl) return;

    userNameEl.textContent = user.username;
    if (user.avatarUrl) {
        avatarEl.innerHTML = `<img src="${user.avatarUrl}" class="w-full h-full object-cover rounded-full"/>`;
        avatarEl.style.background = '';
    } else {
        avatarEl.textContent = (user.username || '?').charAt(0).toUpperCase();
        avatarEl.style.background = user.color || getUserColor(user.id || user.username);
    }
}

/**
 * Creates a single group element for the sidebar
 */
export function createGroupElement(g, currentUser, onClick) {
    const div = document.createElement('div');
    div.setAttribute('data-group-id', g.id);
    div.className = 'group-item bg-[#36393f] p-2 rounded cursor-pointer hover:bg-[#40444b] hover:text-white text-gray-400 font-medium flex items-center gap-3 transition-colors relative';
    
    div.innerHTML = `
        <span class="text-xl">#</span>
        <span class="truncate flex-1">${g.name}</span>
        <span id="dot-${g.id}" class="unread-dot hidden w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
    `;

    div.addEventListener('click', () => {
        // Hide the dot when the group is clicked
        const dot = document.getElementById(`dot-${g.id}`);
        if (dot) dot.classList.add('hidden');
        
        onClick(g, div);
    });
    return div;
}

/**
 * Renders all groups in the sidebar list
 */
export function renderGroups(groups, currentUser, onClick) {
    const container = document.getElementById('groupList');
    if (!container) return;
    container.innerHTML = '';
    groups.forEach(g => container.appendChild(createGroupElement(g, currentUser, onClick)));
}

/**
 * Appends a message to the chat container with duplicate prevention
 */
export function appendMessage(msg, currentUser) {
    const messagesContainer = document.getElementById('messagesContainer');
    if (!messagesContainer) return;

    // 1. TARGETED CLEANUP
    const welcome = document.getElementById('welcomePlaceholder');
    if (welcome) welcome.remove();

    const spinner = document.getElementById('loading-spinner');
    if (spinner) spinner.remove();

    const placeholders = messagesContainer.querySelectorAll('.text-center, .text-gray-500, .text-gray-400');
    placeholders.forEach(el => {
        if (el.textContent.includes('Loading') || el.textContent.includes('No messages')) {
            el.remove();
        }
    });

    messagesContainer.classList.remove('justify-center', 'items-center');

    // 2. DATA NORMALIZATION
    const senderId = msg.sender_id || msg.senderId || msg.user_id || msg.userId || msg.sender?.id || null;
    const username = msg.sender_name || msg.username || msg.name || msg.sender?.username || 'Guest';
    const content = msg.content || msg.message || msg.body || msg.text || '';
    const timestamp = msg.created_at || msg.createdAt || msg.timestamp || new Date();

    if (!content) return;

    // 3. DUPLICATE PREVENTION
    const msgId = msg.id || msg._id || msg.tempId;
    if (msgId && document.getElementById(`msg-${msgId}`)) {
        return; // Already exists in DOM
    }

    // 4. LOGIC: Is this the current user?
    const isMe = currentUser && senderId && String(senderId) === String(currentUser.id);

    // 5. CONSTRUCTION
    const wrapper = document.createElement('div');
    
    // Set unique ID to the wrapper for future reference/duplicate checks
    if (msgId) wrapper.id = `msg-${msgId}`;

    wrapper.className = `flex w-full ${isMe ? 'justify-end' : 'justify-start'} mb-4 animate-fade-in`;

    wrapper.innerHTML = `
        <div class="flex items-end gap-3 max-w-[85%] ${isMe ? 'flex-row-reverse' : 'flex-row'}">
            <div class="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-xs shadow-sm" 
                 style="background: ${getUserColor(senderId || username)}">
                ${username.charAt(0).toUpperCase()}
            </div>

            <div class="flex flex-col ${isMe ? 'items-end' : 'items-start'}">
                <div class="flex items-center gap-2 mb-1 px-1">
                    <span class="text-xs font-bold ${isMe ? 'text-blue-400' : 'text-gray-300'}" 
                          style="color: ${isMe ? '' : getUserColor(senderId || username)}">
                        ${isMe ? 'You' : username}
                    </span>
                    <span class="text-[10px] text-gray-500">
                        ${new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>

                <div class="p-3 rounded-2xl text-sm shadow-sm break-words ${
                    isMe 
                    ? 'bg-[#5865F2] text-white rounded-tr-none' 
                    : 'bg-[#40444b] text-gray-100 rounded-tl-none'
                }">
                    ${escapeHtml(content)}
                </div>
            </div>
        </div>
    `;

    messagesContainer.appendChild(wrapper);

    // 6. AUTO-SCROLL
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

/**
 * Updates connection indicator
 */
export function updateConn(status) {
    const dot = document.getElementById('connDot');
    const text = document.getElementById('connStatusText');
    if (!dot || !text) return;

    dot.classList.remove('conn-connected', 'conn-disconnected', 'conn-reconnecting');
    if (status === 'connected') {
        dot.classList.add('conn-connected');
        text.textContent = 'Connected';
    } else if (status === 'disconnected') {
        dot.classList.add('conn-disconnected');
        text.textContent = 'Disconnected';
    } else if (status === 'reconnecting') {
        dot.classList.add('conn-reconnecting');
        text.textContent = 'Reconnecting...';
    }
}

/**
 * Shows a toast alert
 */
export function showAlert(message, type = 'info') {
    let container = document.getElementById('alertContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'alertContainer';
        container.className = 'fixed top-4 right-4 flex flex-col gap-2 z-50';
        document.body.appendChild(container);
    }

    const alertDiv = document.createElement('div');
    alertDiv.textContent = message;
    alertDiv.className = `px-4 py-2 rounded shadow text-white animate-slide-in ${
        type === 'success' ? 'bg-green-500' :
        type === 'error' ? 'bg-red-500' : 'bg-gray-500'
    }`;
    
    container.appendChild(alertDiv);

    setTimeout(() => {
        alertDiv.classList.add('opacity-0', 'transition', 'duration-500');
        setTimeout(() => alertDiv.remove(), 500);
    }, 3000);
}