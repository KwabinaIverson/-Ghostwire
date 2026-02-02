// chat.js
import { fetchMe, fetchGroups, searchUsers, fetchGroupMessages } from './chat-api.js';
import { renderUserHeader, renderGroups, appendMessage, showAlert } from './chat-ui.js';
import { setupSocket } from './chat-socket.js';

/* ---------------- GLOBAL STATE ---------------- */
window.selectedGroupId = null;
window.selectedMembers = [];
window.isHistoryLoading = false;
window.socket = null;
window.currentUser = null;

document.addEventListener('DOMContentLoaded', init);

/* ---------------- INIT ---------------- */
async function init() {
    window.currentUser = await fetchMe();
    if (!window.currentUser) {
        window.location.href = '/login.html';
        return;
    }

    renderUserHeader(window.currentUser);

    // Initialize Socket
    window.socket = setupSocket(location.origin, window.currentUser, showAlert);

    const groups = await fetchGroups();
    renderGroups(groups, window.currentUser, groupClick);

    // Setup UI Component Logic
    setupCreateGroupModal();
    setupAddMembersModal();
    setupMessaging();
    setupMobileSidebar();
    setupPullToRefresh();
}

/* ---------------- PULL TO REFRESH (GROUPS) ---------------- */
function setupPullToRefresh() {
    const groupList = document.getElementById('groupList');
    let startY = 0;

    groupList.addEventListener('touchstart', (e) => {
        if (groupList.scrollTop === 0) {
            startY = e.touches[0].pageY;
        }
    }, { passive: true });

    groupList.addEventListener('touchend', async (e) => {
        const endY = e.changedTouches[0].pageY;
        const distance = endY - startY;

        if (distance > 150 && groupList.scrollTop === 0) {
            showAlert('Refreshing groups...', 'info');
            const groups = await fetchGroups();
            renderGroups(groups, window.currentUser, groupClick);
        }
    }, { passive: true });
}

/* ---------------- SIDEBAR TOGGLE (MOBILE) ---------------- */
function setupMobileSidebar() {
    const sidebar = document.getElementById('sidebar');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');
    const overlay = document.getElementById('overlay');

    let touchStartX = 0;
    let touchEndX = 0;

    const toggleSidebar = () => {
        sidebar.classList.toggle('-translate-x-full');
        overlay.classList.toggle('hidden');
    };

    const openSidebar = () => {
        sidebar.classList.remove('-translate-x-full');
        overlay.classList.remove('hidden');
    };

    const closeSidebar = () => {
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    };

    if (openSidebarBtn && closeSidebarBtn && overlay) {
        openSidebarBtn.onclick = toggleSidebar;
        closeSidebarBtn.onclick = toggleSidebar;
        overlay.onclick = toggleSidebar;
    }

    document.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    document.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    }, { passive: true });

    function handleSwipe() {
        const swipeDistance = touchEndX - touchStartX;
        const threshold = 100;
        if (swipeDistance > threshold && touchStartX < 50) {
            openSidebar();
        }
        if (swipeDistance < -threshold) {
            closeSidebar();
        }
    }
}

/* ---------------- GROUP CLICK ---------------- */
async function groupClick(group, div) {
    if (!window.socket) return;

    window.selectedGroupId = group.id;
    window.isHistoryLoading = true; 

    const messagesContainer = document.getElementById('messagesContainer');
    const messageInput = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');
    const currentName = document.getElementById('currentRoomName');

    currentName.textContent = group.name;
    
    document.querySelectorAll('#groupList .group-item').forEach(el => el.classList.remove('bg-[#4b5563]', 'text-white'));
    div.classList.add('bg-[#4b5563]', 'text-white');

    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.placeholder = `Message #${group.name}`;
    messageInput.focus();

    messagesContainer.innerHTML = '<div id="loading-spinner" class="text-center text-gray-400 mt-10 animate-pulse">Loading messages...</div>';
    messagesContainer.classList.remove('justify-center', 'items-center');

    if (window.innerWidth < 768) {
        const sidebar = document.getElementById('sidebar');
        const overlay = document.getElementById('overlay');
        sidebar.classList.add('-translate-x-full');
        overlay.classList.add('hidden');
    }

    window.socket.emit('join_group', group.id);

    try {
        const data = await fetchGroupMessages(group.id);
        if (window.selectedGroupId !== group.id) return;

        const spinner = document.getElementById('loading-spinner');
        if (spinner) spinner.remove();

        const messages = Array.isArray(data) ? data : (data.messages || []);

        if (messages.length === 0) {
            if (messagesContainer.children.length === 0) {
                messagesContainer.innerHTML = '<div id="empty-notice" class="text-center text-gray-500 mt-10">No messages yet. Say hello!</div>';
            }
        } else {
            const emptyNotice = document.getElementById('empty-notice');
            if (emptyNotice) emptyNotice.remove();

            messages.forEach(m => {
                const msgId = m.id || m._id;
                if (!document.getElementById(`msg-${msgId}`)) {
                    appendMessage(m, window.currentUser);
                }
            });
        }
    } catch (err) {
        console.error("History fetch failed:", err);
    } finally {
        window.isHistoryLoading = false;
    }

    const addBtn = document.getElementById('addMemberBtn');
    addBtn.classList.toggle('hidden', String(group.admin_id) !== String(window.currentUser.id));
}

/* ---------------- MESSAGING ---------------- */
function setupMessaging() {
    const input = document.getElementById('messageInput');
    const sendBtn = document.getElementById('sendBtn');

    if (!input || !sendBtn) return;

    const sendMessage = () => {
        const content = input.value.trim();
        if (!content || !window.selectedGroupId) return;

        window.socket.emit('send_message', {
            targetId: window.selectedGroupId,
            type: 'group',
            content: content
        });

        input.value = '';
        input.focus();
    };

    sendBtn.onclick = (e) => { e.preventDefault(); sendMessage(); };
    input.onkeypress = (e) => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } };
}

/* ---------------- CREATE GROUP ---------------- */
function setupCreateGroupModal() {
    const openBtn = document.getElementById('newGroupBtn');
    const modal = document.getElementById('createGroupModal');
    const closeBtn = document.getElementById('closeCreateGroupModal'); 
    const confirmBtn = document.getElementById('confirmCreateGroupBtn');

    if (!openBtn || !modal || !closeBtn) return;

    openBtn.onclick = () => { modal.classList.remove('hidden'); modal.classList.add('flex'); };
    closeBtn.onclick = () => modal.classList.add('hidden');
    modal.onclick = (e) => { if(e.target === modal) modal.classList.add('hidden'); };

    confirmBtn.onclick = async () => {
        const name = document.getElementById('groupNameInput')?.value.trim();
        const description = document.getElementById('groupDescInput')?.value.trim() || '';

        if (!name) return showAlert('Group name required', 'error');

        const res = await fetch('/api/groups', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ name, description })
        });

        if (res.ok) {
            modal.classList.add('hidden');
            document.getElementById('groupNameInput').value = '';
            showAlert('Group created!', 'success');
            const groups = await fetchGroups();
            renderGroups(groups, window.currentUser, groupClick);
        } else {
            showAlert('Failed to create group', 'error');
        }
    };
}

/* ---------------- ADD MEMBERS ---------------- */
function setupAddMembersModal() {
    const modal = document.getElementById('addMembersModal');
    const openBtn = document.getElementById('addMemberBtn');
    const closeBtn = document.getElementById('closeAddMembersModal');
    const input = document.getElementById('groupMembersInput');
    const selectedList = document.getElementById('selectedUsersList');
    const searchResultsList = document.getElementById('searchResultsList');
    const confirmBtn = document.getElementById('confirmAddMembersBtn');

    if (!modal || !openBtn || !closeBtn) return;

    openBtn.onclick = () => { if (!window.selectedGroupId) return; modal.classList.remove('hidden'); modal.classList.add('flex'); };

    const closeAction = () => {
        modal.classList.add('hidden');
        window.selectedMembers = [];
        selectedList.innerHTML = '';
        searchResultsList.innerHTML = '';
        searchResultsList.classList.add('hidden');
        input.value = '';
    };

    closeBtn.onclick = closeAction;

    let searchTimeout;
    input.oninput = async (e) => {
        const q = e.target.value.trim();
        if (searchTimeout) clearTimeout(searchTimeout);
        if (q.length < 2) {
            searchResultsList.innerHTML = '';
            searchResultsList.classList.add('hidden');
            return;
        }

        searchTimeout = setTimeout(async () => {
            const users = await searchUsers(q);
            searchResultsList.innerHTML = '';
            searchResultsList.classList.remove('hidden');

            users.forEach(u => {
                if (window.selectedMembers.some(m => m.id === u.id)) return;
                const div = document.createElement('div');
                div.className = 'flex justify-between items-center p-2 bg-[#40444b] hover:bg-[#4f545c] rounded cursor-pointer mt-1';
                div.innerHTML = `<span>${u.username}</span><ion-icon name="add-outline" class="text-blue-400"></ion-icon>`;
                div.onclick = () => {
                    window.selectedMembers.push(u);
                    renderSelectedChips(selectedList);
                    searchResultsList.innerHTML = '';
                    input.value = '';
                    input.focus();
                };
                searchResultsList.appendChild(div);
            });
        }, 300);
    };

    confirmBtn.onclick = async () => {
        if (!window.selectedMembers.length) return showAlert('Select users first', 'info');
        const res = await fetch(`/api/groups/${window.selectedGroupId}/add-members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ members: window.selectedMembers.map(u => u.id) })
        });
        if (res.ok) { showAlert('Members added', 'success'); closeAction(); }
    };
}

function renderSelectedChips(container) {
    container.innerHTML = '';
    window.selectedMembers.forEach(u => {
        const chip = document.createElement('div');
        chip.className = 'flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs shadow-sm animate-fade-in';
        chip.innerHTML = `<span>${u.username}</span><button class="hover:text-red-300 flex items-center"><ion-icon name="close-circle"></ion-icon></button>`;
        chip.querySelector('button').onclick = () => {
            window.selectedMembers = window.selectedMembers.filter(m => m.id !== u.id);
            renderSelectedChips(container);
        };
        container.appendChild(chip);
    });
}