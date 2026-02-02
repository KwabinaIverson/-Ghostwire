// chat-socket.js
import { appendMessage, updateConn } from './chat-ui.js';

export function setupSocket(SOCKET_URL, currentUser, showAlert) {
    const socket = io(SOCKET_URL, { 
        withCredentials: true, 
        reconnectionAttempts: 5, 
        reconnectionDelay: 1000 
    });

    socket.on('connect', () => {
        updateConn('connected');
        showAlert?.('Connected to server', 'success');
    });

    socket.on('disconnect', (reason) => {
        console.warn('Socket disconnected:', reason);
        updateConn('disconnected');
        showAlert?.('Disconnected from server', 'error');
    });

    socket.on('reconnect_attempt', () => updateConn('reconnecting'));
    
    socket.on('connect_error', (err) => {
        console.error('Socket connect error:', err?.message || err);
        updateConn('disconnected');
        showAlert?.('Connection failed: ' + (err?.message || 'Unknown'), 'error');
    });

    // Handle real-time history sent via socket
    // chat-socket.js

    socket.on('history', (messages) => {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        // PROTECTION: If there is a loading spinner, it means we ARE expecting data.
        // If there are already messages (divs with full width), don't let the socket wipe them.
        const hasContent = container.querySelector('.animate-fade-in') || container.children.length > 1;
        
        if (hasContent && !container.querySelector('#loading-spinner')) {
            console.log("Blocking socket history to protect API-rendered messages");
            return;
        }

        container.innerHTML = ''; 
        const messageList = Array.isArray(messages) ? messages : (messages.messages || []);
        messageList.forEach(m => appendMessage(m, currentUser));
    });

    // Handle incoming real-time messages
    socket.on('new_message', (msg) => {
    const msgGroupId = msg.group_id || msg.groupId || msg.targetId;

    if (
        window.selectedGroupId &&
        String(msgGroupId) === String(window.selectedGroupId)
    ) {
        appendMessage(msg, currentUser);
    }
});

    socket.on('error', (err) => console.error('Socket Error:', err));

    return socket;
}