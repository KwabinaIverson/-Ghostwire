import {
  fetchMe,
  fetchGroups,
  searchUsers,
  fetchGroupMessages
} from './chat-api.js';

import {
  renderUserHeader,
  renderGroups,
  appendMessage,
  showAlert
} from './chat-ui.js';

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

//   renderUserHeader(currentUser);

  // 🔥 make socket global
  window.socket = setupSocket(location.origin, window.currentUser, showAlert);

  const groups = await fetchGroups();
  renderGroups(groups, window.currentUser, groupClick);

  setupCreateGroupModal();
  setupAddMembersModal();
  setupMessaging();
}

/* ---------------- GROUP CLICK ---------------- */

async function groupClick(group, div) {
  if (!window.socket) return;

  window.selectedGroupId = group.id;
  window.isHistoryLoading = true;

  const messagesContainer = document.getElementById('messagesContainer');
  const messageInput = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  document.getElementById('currentRoomName').textContent = group.name;

  messagesContainer.innerHTML =
    '<div class="text-center text-gray-400 mt-10">Loading...</div>';

  messageInput.disabled = false;
  sendBtn.disabled = false;
  messageInput.placeholder = `Message #${group.name}`;

  window.socket.emit('join_group', group.id);

  try {
    const data = await fetchGroupMessages(group.id);
    if (window.selectedGroupId !== group.id) return;

    // messagesContainer.innerHTML = '';
    const messages = Array.isArray(data) ? data : data.messages || [];

    // if (!messages.length) {
    //   messagesContainer.innerHTML =
    //     '<div class="text-center text-gray-500 mt-10">No messages yet</div>';
    // } else {
    //   messages.forEach(m => appendMessage(m, window.currentUser));
    // }
  } finally {
    window.isHistoryLoading = false;
  }

  const addBtn = document.getElementById('addMemberBtn');
  addBtn.classList.toggle(
    'hidden',
    String(group.admin_id) !== String(window.currentUser.id)
  );
}

/* ---------------- MESSAGING ---------------- */

function setupMessaging() {
  const input = document.getElementById('messageInput');
  const sendBtn = document.getElementById('sendBtn');

  if (!input || !sendBtn) return;

  const send = () => {
    if (!input.value.trim() || !window.selectedGroupId) return;
    window.socket.emit('send_message', {
      targetId: window.selectedGroupId,
      type: 'group',
      content: input.value.trim()
    });
    input.value = '';
  };

  sendBtn.onclick = send;
  input.onkeypress = e => e.key === 'Enter' && send();
}

/* ---------------- CREATE GROUP ---------------- */

function setupCreateGroupModal() {
  const openBtn = document.getElementById('newGroupBtn');
  const modal = document.getElementById('createGroupModal');
  // FIX: Match the ID in your HTML
  const closeBtn = document.getElementById('closeCreateGroupModal'); 
  const confirmBtn = document.getElementById('confirmCreateGroupBtn');

  if (!openBtn || !modal) return;

  openBtn.onclick = () => {
    modal.classList.remove('hidden');
    modal.classList.add('flex'); // Ensure it centers
  };
  
  closeBtn.onclick = () => modal.classList.add('hidden');
  
  // Close on background click
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

    if (!res.ok) return showAlert('Failed to create group', 'error');

    modal.classList.add('hidden');
    document.getElementById('groupNameInput').value = ''; // Reset input
    showAlert('Group created!', 'success');

    // Refresh Sidebar
    const groups = await fetchGroups();
    renderGroups(groups, window.currentUser, groupClick);
  };
}

/* ---------------- ADD MEMBERS ---------------- */

/* ---------------- ADD MEMBERS ---------------- */

function setupAddMembersModal() {
  const modal = document.getElementById('addMembersModal');
  const openBtn = document.getElementById('addMemberBtn');
  const closeBtn = document.getElementById('closeAddMembersModal');
  const input = document.getElementById('groupMembersInput');
  
  // Targets the specific lists inside the groupMembersSelected container
  const selectedList = document.getElementById('selectedUsersList');
  const searchResultsList = document.getElementById('searchResultsList');
  
  const confirmBtn = document.getElementById('confirmAddMembersBtn');

  if (!modal || !openBtn || !closeBtn) return;

  // Open Modal
  openBtn.onclick = () => {
    if (!window.selectedGroupId) return;
    modal.classList.remove('hidden');
    modal.classList.add('flex');
  };

  // Reset Modal State
  const closeAction = () => {
    modal.classList.add('hidden');
    window.selectedMembers = [];
    selectedList.innerHTML = '';
    searchResultsList.innerHTML = '';
    searchResultsList.classList.add('hidden');
    input.value = '';
  };

  closeBtn.onclick = closeAction;

  // Search Logic
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

      if (users.length === 0) {
        searchResultsList.innerHTML = '<div class="p-2 text-gray-500 text-sm">No users found</div>';
        return;
      }

      users.forEach(u => {
        // Don't show users already selected
        if (window.selectedMembers.some(m => m.id === u.id)) return;

        const div = document.createElement('div');
        div.className = 'flex justify-between items-center p-2 bg-[#40444b] hover:bg-[#4f545c] rounded cursor-pointer transition-colors';
        div.innerHTML = `
            <span class="text-sm text-white">${u.username}</span>
            <ion-icon name="add-outline" class="text-blue-400"></ion-icon>
        `;

        div.onclick = () => {
          window.selectedMembers.push(u);
          renderSelectedChips(selectedList); // Move name "above"
          searchResultsList.innerHTML = ''; // Clear results
          searchResultsList.classList.add('hidden');
          input.value = ''; // Reset input
        };

        searchResultsList.appendChild(div);
      });
    }, 300);
  };

  // Confirm Logic
  confirmBtn.onclick = async () => {
    if (!window.selectedMembers.length) return showAlert('Select users first', 'info');

    const res = await fetch(`/api/groups/${window.selectedGroupId}/add-members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        members: window.selectedMembers.map(u => u.id)
      })
    });

    if (res.ok) {
        showAlert('Members added', 'success');
        closeAction();
    } else {
        showAlert('Failed to add members', 'error');
    }
  };
}

/**
 * Renders the picked users as "Chips" in the top section
 */
function renderSelectedChips(container) {
  container.innerHTML = '';
  window.selectedMembers.forEach(u => {
    const chip = document.createElement('div');
    // Using blue chips to distinguish selected users from search results
    chip.className = 'flex items-center gap-2 bg-blue-600 text-white px-3 py-1 rounded-full text-xs animate-fade-in shadow-sm';
    chip.innerHTML = `
        <span>${u.username}</span>
        <button class="hover:text-red-300 flex items-center transition-colors">
            <ion-icon name="close-circle"></ion-icon>
        </button>
    `;

    // Remove logic
    chip.querySelector('button').onclick = () => {
      window.selectedMembers = window.selectedMembers.filter(m => m.id !== u.id);
      renderSelectedChips(container);
    };

    container.appendChild(chip);
  });
}

function renderSelected(container) {
  container.innerHTML = '';
  window.selectedMembers.forEach(u => {
    const div = document.createElement('div');
    div.className = 'flex justify-between p-2 bg-[#2f3136] rounded';
    div.innerHTML = `<span>${u.username}</span><span class="cursor-pointer">×</span>`;
    div.querySelector('span:last-child').onclick = () => {
      window.selectedMembers = window.selectedMembers.filter(m => m.id !== u.id);
      renderSelected(container);
    };
    container.appendChild(div);
  });
}
