// chat-socket.js
import { appendMessage, updateConn } from './chat-ui.js';

// Initialize the notification sound (ensure this path is correct in your project)
const notificationSound = new Audio('../assets/sounds/notify.mp3');

export function setupSocket(SOCKET_URL, currentUser, showAlert) {
    const socket = io(SOCKET_URL, { 
        withCredentials: true, 
        reconnectionAttempts: 5, 
        reconnectionDelay: 1000 
    });

    socket.on('connect', async () => {
        updateConn('connected');
        
        // AUTO-RELOAD LOGIC:
        // If the user has a group selected, fetch the latest messages automatically on reconnect
        if (window.selectedGroupId) {
            console.log("Reconnected. Syncing messages for group:", window.selectedGroupId);
            socket.emit('join_group', window.selectedGroupId); // Re-join the room
            
            try {
                const data = await fetchGroupMessages(window.selectedGroupId);
                const container = document.getElementById('messagesContainer');
                if (container) {
                    container.innerHTML = ''; // Clear and re-render to ensure no missed messages
                    const messages = Array.isArray(data) ? data : (data.messages || []);
                    messages.forEach(m => appendMessage(m, window.currentUser));
                }
            } catch (err) {
                console.error("Failed to sync after reconnect:", err);
            }
        }
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

    socket.on('history', (messages) => {
        const container = document.getElementById('messagesContainer');
        if (!container) return;

        const hasContent = container.querySelector('.animate-fade-in') || container.children.length > 1;
        
        if (hasContent && !container.querySelector('#loading-spinner')) {
            console.log("Blocking socket history to protect API-rendered messages");
            return;
        }

        container.innerHTML = ''; 
        const messageList = Array.isArray(messages) ? messages : (messages.messages || []);
        messageList.forEach(m => appendMessage(m, currentUser));
    });

    socket.on('new_message', (msg) => {
        const msgGroupId = msg.group_id || msg.groupId || msg.targetId;
        const senderId = msg.sender_id || msg.senderId || msg.user_id || msg.userId;

        // 1. Play sound (from previous update)
        if (window.currentUser && String(senderId) !== String(window.currentUser.id)) {
            notificationSound.currentTime = 0;
            notificationSound.play().catch(() => {});
        }

        // 2. Logic for the Blue Dot
        const isCurrentlyViewing = window.selectedGroupId && String(msgGroupId) === String(window.selectedGroupId);

        if (isCurrentlyViewing) {
            // Append message normally
            appendMessage(msg, window.currentUser);
        } else {
            // Show the blue dot for the inactive group
            const dot = document.getElementById(`dot-${msgGroupId}`);
            if (dot) {
                dot.classList.remove('hidden');
                // Optional: You can also move this group to the top of the sidebar list
                const groupItem = document.querySelector(`[data-group-id="${msgGroupId}"]`);
                if (groupItem) {
                    const list = document.getElementById('groupList');
                    list.prepend(groupItem);
                }
            }
        }
    });

    socket.on('error', (err) => console.error('Socket Error:', err));

    return socket;
}