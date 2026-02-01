// Chat client script
const SOCKET_URL = location.origin; // same origin
let socket = null;
let currentUser = null;
let selectedGroupId = null;

function getUserColor(seed) {
  const str = String(seed || '');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0; // force int
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 70% 45%)`;
}

async function fetchMe() {
  try {
    const res = await fetch('/api/auth/me', { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  } catch (err) {
    console.error('Failed to fetch /api/auth/me', err);
    return null;
  }
}

async function fetchGroups() {
  try {
    const res = await fetch('/api/groups', { credentials: 'include' });
    if (!res.ok) return [];
    const data = await res.json();
    return data;
  } catch (err) {
    console.error('Failed to fetch groups', err);
    return [];
  }
}

function createGroupElement(g) {
  const div = document.createElement('div');
  div.className = 'group-item bg-[#36393f] p-2 rounded cursor-pointer hover:bg-[#40444b] hover:text-white text-gray-400 font-medium flex items-center gap-3';
  div.innerHTML = `<span class="text-xl">#</span><span>${g.name}</span>`;
  div.addEventListener('click', () => {
    socket.emit('join_group', g.id);
    document.getElementById('currentRoomName').textContent = g.name;
    selectedGroupId = g.id;

    // Visual active state
    document.querySelectorAll('#groupList .group-item').forEach(e => e.classList.remove('bg-[#4b5563]','text-white'));
    div.classList.add('bg-[#4b5563]','text-white');

    // Enable input
    document.getElementById('messageInput').disabled = false;
    document.getElementById('sendBtn').disabled = false;
    document.getElementById('messageInput').placeholder = `Message #${g.name}`;
  });
  return div;
}

function renderGroups(groups) {
  const container = document.getElementById('groupList');
  container.innerHTML = '';
  groups.forEach(g => {
    container.appendChild(createGroupElement(g));
  });
}

function appendMessage(msg) {
  const messagesContainer = document.getElementById('messagesContainer');

  // Normalize fields from DB or live message
  const senderId = msg.sender_id || msg.senderId || msg.sender || null;
  const username = msg.sender_name || msg.username || msg.sender || 'Unknown';
  const content = msg.content || msg.message || '';
  const timestamp = msg.created_at || msg.createdAt || msg.timestamp || null;

  const isMe = currentUser && senderId === currentUser.id;

  const wrapper = document.createElement('div');
  wrapper.className = `flex ${isMe ? 'justify-end' : 'justify-start'}`;

  const container = document.createElement('div');
  container.className = 'flex items-end gap-3';

  // Avatar for other users (left), for me (right)
  if (!isMe) {
    const avatar = document.createElement('div');
    avatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold message-avatar overflow-hidden bg-gray-700';
    if (msg.avatarUrl) {
      const img = document.createElement('img');
      img.src = msg.avatarUrl;
      img.className = 'w-full h-full object-cover';
      avatar.appendChild(img);
    } else {
      avatar.style.background = getUserColor(senderId || username);
      avatar.textContent = (username || '?').charAt(0).toUpperCase();
    }
    container.appendChild(avatar);
  }

  const bubble = document.createElement('div');
  bubble.className = `message-bubble ${isMe ? 'message-out' : 'message-in'} p-3 rounded-lg max-w-[70%]`;

  const meta = document.createElement('div');
  meta.className = 'text-xs mb-1';
  const nameSpan = document.createElement('span');
  nameSpan.className = 'font-bold';
  nameSpan.textContent = username;
  if (!isMe) nameSpan.style.color = getUserColor(senderId || username);
  else nameSpan.style.color = '#ffffff';

  const timeSpan = document.createElement('span');
  timeSpan.className = 'text-gray-400 text-xs';
  timeSpan.textContent = ` • ${timestamp ? new Date(timestamp).toLocaleString() : ''}`;

  meta.appendChild(nameSpan);
  meta.appendChild(timeSpan);

  const text = document.createElement('div');
  text.className = 'text-sm';
  text.textContent = content;

  bubble.appendChild(meta);
  bubble.appendChild(text);

  if (isMe) {
    // my message: bubble then avatar
    const myAvatar = document.createElement('div');
    myAvatar.className = 'w-8 h-8 rounded-full flex items-center justify-center text-white font-bold message-avatar overflow-hidden bg-gray-700';
    if (currentUser?.avatarUrl) {
      const img = document.createElement('img');
      img.src = currentUser.avatarUrl;
      img.className = 'w-full h-full object-cover';
      myAvatar.appendChild(img);
    } else {
      myAvatar.style.background = getUserColor(currentUser.id || currentUser.username);
      myAvatar.textContent = (currentUser.username || '?').charAt(0).toUpperCase();
    }

    container.appendChild(bubble);
    container.appendChild(myAvatar);
  } else {
    container.appendChild(bubble);
  }

  wrapper.appendChild(container);
  messagesContainer.appendChild(wrapper);

  // Scroll to bottom
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function updateConn(status) {
  const dot = document.getElementById('connDot');
  const text = document.getElementById('connStatusText');
  if (!dot || !text) return;
  dot.classList.remove('conn-connected','conn-disconnected','conn-reconnecting');
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

// Update the small user header/avatar UI
function renderUserHeader() {
  const userNameEl = document.getElementById('userName');
  const avatarEl = document.getElementById('userAvatar');
  if (!currentUser) return;
  userNameEl.textContent = currentUser.username;
  if (currentUser.avatarUrl) {
    avatarEl.innerHTML = `<img src="${currentUser.avatarUrl}" class="w-full h-full object-cover"/>`;
    avatarEl.style.background = '';
  } else {
    avatarEl.textContent = (currentUser.username || '?').charAt(0).toUpperCase();
    avatarEl.style.background = currentUser.color || getUserColor(currentUser.id || currentUser.username);
  }
}

function setupSocket() {
  // Request automatic reconnection behavior from socket.io (default is on)
  socket = io(SOCKET_URL, { withCredentials: true, reconnectionAttempts: 5, reconnectionDelay: 1000 });

  socket.on('connect', () => {
    updateConn('connected');
    if (typeof showAlert === 'function') showAlert('Connected to server', 'success');
  });

  socket.on('disconnect', (reason) => {
    console.warn('Socket disconnected:', reason);
    updateConn('disconnected');
    if (typeof showAlert === 'function') showAlert('Disconnected from server', 'error');
  });

  socket.on('reconnect_attempt', (attempt) => {
    updateConn('reconnecting');
    if (attempt === 1 && typeof showAlert === 'function') showAlert('Trying to reconnect...', 'info');
  });

  socket.on('connect_error', (err) => {
    console.error('Socket connect error:', err?.message || err);
    updateConn('disconnected');
    if (typeof showAlert === 'function') showAlert('Connection failed: ' + (err?.message || 'Unknown'), 'error');
  });

  socket.on('history', (messages) => {
    const messagesContainer = document.getElementById('messagesContainer');
    messagesContainer.innerHTML = '';
    messages.forEach(m => appendMessage(m));
  });

  socket.on('new_message', (msg) => {
    appendMessage(msg);
  });

  socket.on('error', (err) => {
    console.error('Socket error', err);
  });
}

// Wire up UI and load data
(async function init() {
  const user = await fetchMe();
  if (!user) {
    // Not authenticated, redirect to login
    window.location.href = '/login.html';
    return;
  }

  // Set current user and show username in bottom-left (no DB id shown)
  currentUser = user;
  renderUserHeader();

  // Fetch groups and track locally
  let myGroups = await fetchGroups();
  renderGroups(myGroups);

  const groupLimitMsg = document.getElementById('groupLimitMsg');

  // Helper to check create permission
  function updateCreateLimitUI() {
    const createdCount = (myGroups || []).filter(g => String(g.admin_id || g.adminId || g.admin) === String(currentUser.id)).length;
    if (createdCount >= 5) {
      if (groupLimitMsg) groupLimitMsg.classList.remove('hidden');
      confirmCreate.disabled = true;
    } else {
      if (groupLimitMsg) groupLimitMsg.classList.add('hidden');
      confirmCreate.disabled = false;
    }
  }

  document.getElementById('groupFilterInput').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    const items = document.querySelectorAll('#groupList .group-item');
    items.forEach(item => {
        const name = item.querySelector('span:last-child').textContent.toLowerCase();
        item.classList.toggle('hidden', !name.includes(term));
    });
  });


  // New Group button handlers
  const newGroupBtn = document.getElementById('newGroupBtn');
  const createModal = document.getElementById('createGroupModal');
  const cancelCreate = document.getElementById('cancelCreateGroupBtn');
  const confirmCreate = document.getElementById('createGroupBtnConfirm');
  const groupNameInput = document.getElementById('groupNameInput');
  const groupDescriptionInput = document.getElementById('groupDescriptionInput');
  const groupMembersSearch = document.getElementById('groupMembersSearch');
  const groupMembersSuggestions = document.getElementById('groupMembersSuggestions');
  const groupMembersSelectedEl = document.getElementById('groupMembersSelected');

  updateCreateLimitUI();

  let selectedMembers = [];

  // Debounce helper
  function debounce(fn, wait = 250) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  async function searchUsers(query) {
    if (!query || query.length < 2) {
      groupMembersSuggestions.classList.add('hidden');
      groupMembersSuggestions.innerHTML = '';
      return;
    }
    try {
      const res = await fetch(`/api/auth/users?q=${encodeURIComponent(query)}`, { credentials: 'include' });
      if (!res.ok) return;
      const users = await res.json();
      groupMembersSuggestions.innerHTML = '';
      users.forEach(u => {
        // skip current user and already selected
        if (u.id === currentUser.id) return;
        if (selectedMembers.find(s => s.id === u.id)) return;
        const row = document.createElement('div');
        row.className = 'p-2 hover:bg-[#2b2b2b] cursor-pointer';
        row.textContent = `${u.username} · ${u.email}`;
        row.addEventListener('click', () => {
          selectedMembers.push(u);
          renderSelectedMembers();
          groupMembersSuggestions.classList.add('hidden');
          groupMembersSearch.value = '';
        });
        groupMembersSuggestions.appendChild(row);
      });
      groupMembersSuggestions.classList.toggle('hidden', groupMembersSuggestions.children.length === 0);
    } catch (err) {
      console.error('User search error', err);
    }
  }

  const debouncedSearch = debounce((e) => searchUsers(e.target.value), 250);
  groupMembersSearch.addEventListener('input', debouncedSearch);

  function renderSelectedMembers() {
    groupMembersSelectedEl.innerHTML = '';
    selectedMembers.forEach(u => {
      const chip = document.createElement('div');
      chip.className = 'px-2 py-1 bg-[#2f3136] rounded flex items-center gap-2';
      chip.innerHTML = `<span class="text-sm">${u.username}</span><button class="ml-2 text-xs text-gray-400">×</button>`;
      chip.querySelector('button').addEventListener('click', () => {
        selectedMembers = selectedMembers.filter(s => s.id !== u.id);
        renderSelectedMembers();
      });
      groupMembersSelectedEl.appendChild(chip);
    });
  }

  newGroupBtn.addEventListener('click', () => {
    // Refresh limit UI each time the modal opens
    updateCreateLimitUI();

    createModal.classList.remove('hidden');
    createModal.classList.add('flex');
    // Reset fields for a fresh create
    groupNameInput.value = '';
    groupDescriptionInput.value = '';
    groupMembersSearch.value = '';
    selectedMembers = [];
    renderSelectedMembers();
    groupMembersSuggestions.classList.add('hidden');
    // Focus the name input for quicker entry
    setTimeout(() => groupNameInput.focus(), 50);
  });
  cancelCreate.addEventListener('click', () => { createModal.classList.add('hidden'); selectedMembers = []; renderSelectedMembers(); groupMembersSearch.value = ''; groupMembersSuggestions.classList.add('hidden'); groupDescriptionInput.value = ''; updateCreateLimitUI(); });

  // Submit when pressing Enter in the name or description fields
  groupNameInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); confirmCreate.click(); } });
  groupDescriptionInput.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); confirmCreate.click(); } });

  confirmCreate.addEventListener('click', async () => {
    if (confirmCreate.disabled) { showAlert('Group creation limit reached (max 5 groups)', 'error'); return; }
    const name = groupNameInput.value.trim();
    const description = (groupDescriptionInput.value || '').trim();
    if (!name) return showAlert('Group name is required', 'error');
    if (description.length > 200) return showAlert('Description cannot exceed 200 characters', 'error');

    const memberIds = selectedMembers.map(m => m.id);

    confirmCreate.disabled = true;
    confirmCreate.textContent = 'Creating...';

    try {
      const res = await fetch('/api/groups', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, description, members: memberIds }), credentials: 'include' });
      if (res.status === 401) {
        showAlert('Please login to create a group', 'error');
        window.location.href = '/login.html';
        return;
      }
      if (!res.ok) throw new Error('Failed to create group');
      const data = await res.json();
      // Attempt to append the created group immediately, then refresh list as a fallback
      const created = data.group || data;
      if (created && created.id) {
        const container = document.getElementById('groupList');
        // Ensure we mark admin locally so limit UI updates correctly
        created.admin_id = created.admin_id || currentUser.id;
        // Add to top
        container.insertBefore(createGroupElement(created), container.firstChild);
        // update local cached groups and UI
        myGroups.unshift(created);
        updateCreateLimitUI();
        // auto-join the created group
        socket.emit('join_group', created.id);
        selectedGroupId = created.id;
        document.getElementById('currentRoomName').textContent = created.name;
        // enable input
        document.getElementById('messageInput').disabled = false;
        document.getElementById('sendBtn').disabled = false;
      } else {
        // Fallback: fetch and render
        const newGroups = await fetchGroups();
        myGroups = newGroups;
        renderGroups(newGroups);
        updateCreateLimitUI();
      }

      showAlert('Group created', 'success');
      createModal.classList.add('hidden');
      selectedMembers = [];
      renderSelectedMembers();
    } catch (err) {
      console.error(err);
      showAlert('Could not create group', 'error');
    } finally {
      confirmCreate.disabled = false;
      confirmCreate.textContent = 'Create';
    }
  });

  // Setup socket with credentials (cookie will be sent automatically)
  setupSocket();

  // Send message
  document.getElementById('sendBtn').addEventListener('click', () => {
    const input = document.getElementById('messageInput');
    const content = input.value.trim();
    if (!content || !selectedGroupId) return;
    socket.emit('send_message', {
      targetId: selectedGroupId,
      type: 'group',
      content
    });
    input.value = '';
  });

  // Sidebar toggles
  document.getElementById('openSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.remove('-translate-x-full');
    document.getElementById('overlay').classList.remove('hidden');
  });
  document.getElementById('closeSidebar').addEventListener('click', () => {
    document.getElementById('sidebar').classList.add('-translate-x-full');
    document.getElementById('overlay').classList.add('hidden');
  });

  // Logout button
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    window.location.href = '/login.html';
  });

  // profile editor
  const editBtn = document.getElementById('editProfileBtn');
  const editor = document.getElementById('profileEditor');
  const avatarInput = document.getElementById('avatarUrlInput');
  const avatarFileInput = document.getElementById('avatarFileInput');
  const avatarPreview = document.getElementById('avatarPreview');
  const colorInput = document.getElementById('colorInput');
  const cancelBtn = document.getElementById('cancelProfileBtn');
  const saveBtn = document.getElementById('saveProfileBtn');

  editBtn.addEventListener('click', () => {
    avatarInput.value = currentUser?.avatarUrl || '';
    colorInput.value = currentUser?.color || '#000000';
    // initialize preview
    if (currentUser?.avatarUrl) {
      avatarPreview.innerHTML = `<img src="${currentUser.avatarUrl}" class="w-full h-full object-cover"/>`;
    } else {
      avatarPreview.textContent = (currentUser?.username || '?').charAt(0).toUpperCase();
      avatarPreview.style.background = currentUser?.color || getUserColor(currentUser?.id || currentUser?.username);
    }
    editor.classList.toggle('hidden');
  });

  // Click outside to close editor
  document.addEventListener('click', (e) => {
    const target = e.target;
    if (!editor.classList.contains('hidden')) {
      if (!editor.contains(target) && !editBtn.contains(target)) {
        editor.classList.add('hidden');
      }
    }
    // Close create group modal if open and clicked outside
    const modal = document.getElementById('createGroupModal');
    if (modal && !modal.classList.contains('hidden')) {
      if (modal === target || !modal.querySelector('div').contains(target)) {
        modal.classList.add('hidden');
      }
    }

    // Hide members suggestions if clicking outside search or suggestions
    const suggestions = document.getElementById('groupMembersSuggestions');
    const searchInput = document.getElementById('groupMembersSearch');
    if (suggestions && !suggestions.classList.contains('hidden')) {
      if (target !== searchInput && !suggestions.contains(target)) {
        suggestions.classList.add('hidden');
      }
    }
  });

  cancelBtn.addEventListener('click', () => editor.classList.add('hidden'));

  // Avatar file preview
  avatarFileInput.addEventListener('change', () => {
    const f = avatarFileInput.files && avatarFileInput.files[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    avatarPreview.innerHTML = `<img src="${url}" class="w-full h-full object-cover"/>`;
  });

  saveBtn.addEventListener('click', async () => {
    try {
      // If a file is selected, upload it first
      if (avatarFileInput.files && avatarFileInput.files.length > 0) {
        const fd = new FormData();
        fd.append('avatar', avatarFileInput.files[0]);
        const res = await fetch('/api/auth/me/avatar', { method: 'POST', body: fd, credentials: 'include' });
        if (!res.ok) throw new Error('Failed to upload avatar');
        const data = await res.json();
        currentUser = data.user;
        renderUserHeader();
        if (typeof showAlert === 'function') showAlert('Avatar uploaded', 'success');
        editor.classList.add('hidden');
        return;
      }

      const payload = { avatarUrl: avatarInput.value.trim() || null, color: colorInput.value };
      const res = await fetch('/api/auth/me', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload), credentials: 'include' });
      if (!res.ok) throw new Error('Failed to update profile');
      const profile = await res.json();
      currentUser = profile.user;
      renderUserHeader();
      if (typeof showAlert === 'function') showAlert('Profile updated', 'success');
      editor.classList.add('hidden');
    } catch (err) {
      if (typeof showAlert === 'function') showAlert('Could not update profile', 'error');
      console.error(err);
    }
  });
})();