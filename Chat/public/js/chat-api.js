// chat-api.js
export async function fetchMe() {
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

export async function fetchGroups() {
    try {
        const res = await fetch('/api/groups', { credentials: 'include' });
        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.error('Failed to fetch groups', err);
        return [];
    }
}

export async function searchUsers(query) {
    if (!query || query.length < 2) return [];
    try {
        const res = await fetch(`/api/auth/users?q=${encodeURIComponent(query)}`, { credentials: 'include' });
        if (!res.ok) return [];
        return await res.json();
    } catch (err) {
        console.error('User search error', err);
        return [];
    }
}

// --- new function to fetch messages for a group ---
export async function fetchGroupMessages(groupId) {
    if (!groupId) return [];
    try {
        const res = await fetch(`/api/groups/${groupId}/messages`, { credentials: 'include' });
        if (!res.ok) return [];
        const data = await res.json();
        // assuming the API returns { messages: [...] }
        console.log("RAW MESSAGES FROM API:", data);
        return data.messages || [];
    } catch (err) {
        console.error('Failed to fetch messages for group', err);
        return [];
    }
}
