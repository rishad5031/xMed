// =============================================================
// xMED - Universal Real-Time Messaging Client Script
// Cross-Role Comms: Citizen <-> Doctor <-> Citizen
// =============================================================

let activeChatTargetUid = null;
let activeChatTargetName = null;
let chatPollInterval = null;

async function loadConversations() {
  const container = document.getElementById('chat-conversations-list');
  if (!container) return;

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch('/api/messages/conversations', { headers });
    const result = await res.json();

    if (!result.success || !result.data || result.data.length === 0) {
      container.innerHTML = `
        <div class="p-6 text-center text-slate-400 text-xs">
          No conversations yet.<br/>
          Click <strong class="text-teal-400">"New Chat"</strong> to message a doctor or citizen.
        </div>
      `;
      return;
    }

    container.innerHTML = result.data.map(conv => {
      const isActive = activeChatTargetUid === conv.contact_uid;
      const roleColor = conv.contact_role === 'Doctor' ? 'text-sky-400' : 'text-emerald-400';
      const roleBadge = conv.contact_role === 'Doctor'
        ? `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-300">Dr</span>`
        : `<span class="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-300">Pt</span>`;

      return `
        <div 
          onclick="openChatThread('${conv.contact_uid}', '${conv.contact_name.replace(/'/g, "\\'")}')"
          class="chat-conversation-item p-3.5 border-b border-slate-800/60 flex items-center justify-between gap-3 ${isActive ? 'chat-conversation-active' : ''}">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center font-bold text-xs ${roleColor} flex-shrink-0">
              ${conv.contact_role === 'Doctor' ? '🩺' : '👤'}
            </div>
            <div class="min-w-0">
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-bold text-slate-100 truncate">${conv.contact_name}</span>
                ${roleBadge}
              </div>
              <p class="text-[11px] text-slate-400 truncate mt-0.5">${conv.last_message || 'Attachment / Image'}</p>
            </div>
          </div>

          <div class="text-right flex-shrink-0">
            ${conv.unread_count > 0 ? `
              <span class="px-1.5 py-0.5 rounded-full bg-emerald-500 text-slate-950 font-bold text-[10px]">
                ${conv.unread_count}
              </span>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

  } catch (err) {
    console.error('[Messaging] Error loading conversations:', err);
    container.innerHTML = `<div class="p-4 text-center text-xs text-rose-400">Failed to load conversations.</div>`;
  }
}

async function openChatThread(targetUid, targetName) {
  activeChatTargetUid = targetUid;
  activeChatTargetName = targetName;

  const headerName = document.getElementById('chat-active-name');
  const headerUid = document.getElementById('chat-active-uid');
  const emptyState = document.getElementById('chat-empty-state');
  const activeWindow = document.getElementById('chat-active-window');

  if (headerName) headerName.textContent = targetName;
  if (headerUid) headerUid.textContent = targetUid;
  if (emptyState) emptyState.classList.add('hidden');
  if (activeWindow) activeWindow.classList.remove('hidden');

  // Highlight active conversation item in sidebar
  document.querySelectorAll('.chat-conversation-item').forEach(item => {
    item.classList.remove('chat-conversation-active');
  });

  await fetchThreadMessages();

  // Reset polling
  if (chatPollInterval) clearInterval(chatPollInterval);
  chatPollInterval = setInterval(fetchThreadMessages, 4000);
}

async function fetchThreadMessages() {
  if (!activeChatTargetUid) return;

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`/api/messages/thread/${encodeURIComponent(activeChatTargetUid)}`, { headers });
    const result = await res.json();

    const messagesContainer = document.getElementById('chat-messages-container');
    if (!messagesContainer) return;

    if (!result.success || !result.data || result.data.length === 0) {
      messagesContainer.innerHTML = `
        <div class="p-8 text-center text-slate-400 text-xs">
          No previous messages with <strong>${activeChatTargetName}</strong>.<br/>
          Say hello below to begin this secure clinical consultation thread!
        </div>
      `;
      return;
    }

    const currentUid = localStorage.getItem('user_uid') || '';

    messagesContainer.innerHTML = result.data.map(msg => {
      const isMine = msg.sender_uid === currentUid;
      const timeStr = new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return `
        <div class="flex flex-col ${isMine ? 'items-end' : 'items-start'} my-2">
          <div class="max-w-md px-4 py-2.5 text-xs leading-relaxed ${isMine ? 'chat-bubble-sent' : 'chat-bubble-received'}">
            ${escapeHtml(msg.message_text)}
          </div>
          <span class="text-[10px] text-slate-500 font-mono mt-1 px-1">
            ${timeStr} ${isMine ? (msg.is_read ? '• Read' : '• Sent') : ''}
          </span>
        </div>
      `;
    }).join('');

    // Scroll to bottom smoothly
    messagesContainer.scrollTop = messagesContainer.scrollHeight;

  } catch (err) {
    console.warn('[Messaging] Error fetching thread:', err.message);
  }
}

async function handleSendMessage(e) {
  e.preventDefault();
  const input = document.getElementById('chat-input-text');
  if (!input || !input.value.trim() || !activeChatTargetUid) return;

  const messageText = input.value.trim();
  input.value = '';

  const token = localStorage.getItem('token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        receiver_uid: activeChatTargetUid,
        message_text: messageText
      })
    });

    const result = await res.json();
    if (result.success) {
      await fetchThreadMessages();
      loadConversations();
    }
  } catch (err) {
    console.error('[Messaging] Send error:', err);
  }
}

async function openNewChatModal() {
  const modal = document.getElementById('new-chat-modal');
  const list = document.getElementById('new-chat-contacts-list');
  if (!modal || !list) return;

  modal.classList.remove('hidden');
  list.innerHTML = `<div class="p-6 text-center text-xs text-slate-400">Loading contacts directory...</div>`;

  const token = localStorage.getItem('token');
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch('/api/messages/contacts', { headers });
    const result = await res.json();

    if (result.success && result.data) {
      list.innerHTML = result.data.map(c => `
        <div 
          onclick="selectNewChatContact('${c.contact_uid}', '${c.contact_name.replace(/'/g, "\\'")}')"
          class="p-3 rounded-xl border border-slate-800/80 hover:border-teal-500/40 hover:bg-slate-800/40 cursor-pointer flex items-center justify-between transition-all">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-xs">
              ${c.contact_role === 'Doctor' ? '🩺' : '👤'}
            </div>
            <div>
              <div class="text-xs font-bold text-slate-100">${c.contact_name}</div>
              <div class="text-[10px] text-slate-400">${c.contact_subtitle || ''}</div>
            </div>
          </div>
          <span class="text-xs text-teal-400 font-bold">Message &rarr;</span>
        </div>
      `).join('');
    }
  } catch (err) {
    list.innerHTML = `<div class="p-4 text-center text-xs text-rose-400">Failed to load contacts.</div>`;
  }
}

function selectNewChatContact(uid, name) {
  closeNewChatModal();
  openChatThread(uid, name);
}

function closeNewChatModal() {
  const modal = document.getElementById('new-chat-modal');
  if (modal) modal.classList.add('hidden');
}

function startDirectChat(uid, name) {
  // Switch to messages tab
  if (typeof switchDashboardTab === 'function') {
    switchDashboardTab('messages');
  }
  openChatThread(uid, name);
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };
  return text.replace(/[&<>"']/g, m => map[m]);
}

document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('chat-conversations-list')) {
    loadConversations();

    const form = document.getElementById('form-chat-send');
    if (form) form.addEventListener('submit', handleSendMessage);
  }
});
