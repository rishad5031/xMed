// =============================================================
// xMED MR.MED AI Floating Assistant Widget
// 100% Server-Side Automated Proxy & Holographic Cyber Aesthetic
// =============================================================

(function initMrMedWidget() {
  document.addEventListener('DOMContentLoaded', () => {
    // Avoid double rendering if already on fullscreen /ai-assistant
    if (window.location.pathname === '/ai-assistant') return;

    createFloatingButton();
    createChatModal();
  });

  function createFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'mrmed-floating-btn';
    btn.className = 'mrmed-floating-pill fixed bottom-6 right-6 z-50 p-2 sm:p-2.5 rounded-full hover:scale-105 transition-all flex items-center gap-2.5 group';
    btn.setAttribute('aria-label', 'Open MR.MED AI Health Assistant');
    btn.innerHTML = `
      <div class="mrmed-avatar-box w-8 h-8 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
        <img src="/images/mr-med-robot.png" alt="MR.MED AI" class="w-full h-full object-cover object-left scale-125">
      </div>
      <span class="mrmed-text text-xs font-black pr-1 tracking-wide hidden sm:inline transition-colors">MR.MED AI</span>
      <span class="mrmed-pulse-dot w-2.5 h-2.5 rounded-full animate-pulse"></span>
    `;

    btn.addEventListener('click', toggleChatModal);
    document.body.appendChild(btn);
  }

  function createChatModal() {
    const modal = document.createElement('div');
    modal.id = 'mrmed-chat-modal';
    modal.className = 'fixed bottom-24 right-6 z-50 w-full max-w-sm sm:max-w-md hidden animate-fade-in';
    modal.innerHTML = `
      <div class="ai-cyber-card rounded-3xl p-4 sm:p-5 shadow-2xl border border-cyan-500/40 flex flex-col h-[540px] justify-between relative overflow-hidden backdrop-blur-2xl">
        
        <!-- Modal Top Bar with Hologram Avatar & Controls -->
        <div class="flex items-center justify-between border-b border-cyan-500/20 pb-3 mb-2">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-black border-2 border-cyan-400 p-0.5 shadow-[0_0_12px_rgba(6,182,212,0.5)] overflow-hidden flex items-center justify-center flex-shrink-0">
              <img src="/images/mr-med-robot.png" alt="MR.MED" class="w-full h-full object-cover object-left scale-125">
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-sm font-black text-white">MR.MED</span>
                <span class="text-[9px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-bold font-mono border border-cyan-500/30">AI PROXIED</span>
              </div>
              <p class="text-[10px] text-slate-400 font-medium">xMED Clinical Companion</p>
            </div>
          </div>

          <div class="flex items-center gap-1.5">
            <a href="/ai-assistant" target="_blank" class="p-1.5 rounded-lg glass-card text-slate-400 hover:text-cyan-300 transition-colors" title="Open Fullscreen Studio">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"></path></svg>
            </a>
            <button type="button" id="btn-close-mrmed" class="p-1.5 rounded-lg glass-card text-slate-400 hover:text-rose-400 transition-colors" title="Close">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
        </div>

        <!-- Quick Inquiries Strip -->
        <div class="py-1 flex gap-1.5 overflow-x-auto pb-1 text-[10px]">
          <button type="button" class="mrmed-chip flex-shrink-0 neon-chip px-2.5 py-1 rounded-lg">
            🩸 Read CBC Report
          </button>
          <button type="button" class="mrmed-chip flex-shrink-0 neon-chip px-2.5 py-1 rounded-lg">
            🩺 Blood Pressure Tips
          </button>
          <button type="button" class="mrmed-chip flex-shrink-0 neon-chip px-2.5 py-1 rounded-lg">
            🍬 Glucose Ranges
          </button>
          <button type="button" class="mrmed-chip flex-shrink-0 neon-chip px-2.5 py-1 rounded-lg">
            🤕 Headache relief
          </button>
          <button type="button" class="mrmed-chip flex-shrink-0 neon-chip px-2.5 py-1 rounded-lg">
            🚨 Helplines (999 / 16263)
          </button>
        </div>

        <!-- Chat Stream Area -->
        <div id="mrmed-stream" class="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl bg-slate-950/70 border border-cyan-500/20 text-xs my-2 shadow-inner">
          <div class="flex items-start gap-2.5">
            <div class="w-7 h-7 rounded-lg bg-black border border-cyan-400 p-0.5 shadow-md flex-shrink-0 overflow-hidden mt-0.5">
              <img src="/images/mr-med-robot.png" alt="MR.MED" class="w-full h-full object-cover object-left scale-125">
            </div>
            <div class="p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-slate-200 leading-relaxed text-xs max-w-[85%] shadow">
              <strong class="text-cyan-300 font-bold">Hi! I am MR.MED.</strong> How can I assist you today? Ask me about laboratory terminology, vital signs, or navigating your health records.
            </div>
          </div>
        </div>

        <!-- Typing Indicator -->
        <div id="mrmed-typing" class="hidden flex items-center gap-2 px-2 py-1 text-[11px] text-cyan-300 font-mono">
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style="animation-delay: 0.15s"></span>
          <span class="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" style="animation-delay: 0.3s"></span>
          <span>MR.MED is thinking...</span>
        </div>

        <!-- Input Bar -->
        <form id="mrmed-input-form" class="pt-2 flex gap-1.5 border-t border-cyan-500/20">
          <input type="text" id="mrmed-input" required autocomplete="off" class="flex-1 px-3.5 py-2.5 text-xs rounded-xl bg-slate-900/90 text-white placeholder-slate-400 border border-cyan-500/40 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20 outline-none" placeholder="Ask MR.MED a question...">
          <button type="submit" class="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-black text-xs hover:opacity-95 shadow-md shadow-cyan-500/25 transition-all">
            Send
          </button>
        </form>

      </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('btn-close-mrmed').addEventListener('click', toggleChatModal);

    // Setup input submit
    const form = document.getElementById('mrmed-input-form');
    const input = document.getElementById('mrmed-input');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const txt = input.value.trim();
      if (!txt) return;
      input.value = '';
      sendWidgetMessage(txt);
    });

    // Chips
    modal.querySelectorAll('.mrmed-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const query = chip.textContent.replace(/^[^a-zA-Z0-9]+/, '').trim();
        sendWidgetMessage(query);
      });
    });
  }

  function toggleChatModal() {
    const modal = document.getElementById('mrmed-chat-modal');
    if (!modal) return;
    if (modal.classList.contains('hidden')) {
      modal.classList.remove('hidden');
      document.getElementById('mrmed-input').focus();
    } else {
      modal.classList.add('hidden');
    }
  }

  // 100% Automated Server-Side Chat Dispatch
  async function sendWidgetMessage(text) {
    const stream = document.getElementById('mrmed-stream');
    const typing = document.getElementById('mrmed-typing');

    // Append User Bubble
    const userBubble = document.createElement('div');
    userBubble.className = 'flex justify-end';
    userBubble.innerHTML = `
      <div class="mrmed-user-bubble p-2.5 rounded-xl rounded-tr-sm bg-gradient-to-r from-cyan-500 via-sky-500 to-blue-600 text-slate-950 font-bold text-xs max-w-[85%] shadow leading-relaxed">
        ${escapeWidgetHtml(text)}
      </div>
    `;
    stream.appendChild(userBubble);
    stream.scrollTop = stream.scrollHeight;

    typing.classList.remove('hidden');

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const data = await res.json();

      typing.classList.add('hidden');

      const aiBubble = document.createElement('div');
      aiBubble.className = 'flex items-start gap-2.5 animate-fade-in';
      aiBubble.innerHTML = `
        <div class="w-7 h-7 rounded-lg bg-black border border-cyan-400 p-0.5 shadow-md flex-shrink-0 overflow-hidden mt-0.5">
          <img src="/images/mr-med-robot.png" alt="MR.MED" class="w-full h-full object-cover object-left scale-125">
        </div>
        <div class="mrmed-bot-bubble p-3 rounded-xl bg-slate-900/90 border border-cyan-500/30 text-slate-200 leading-relaxed text-xs max-w-[88%] space-y-1.5 shadow">
          ${parseWidgetMarkdown(data.reply || 'No response from assistant.')}
        </div>
      `;
      stream.appendChild(aiBubble);
      stream.scrollTop = stream.scrollHeight;

    } catch (err) {
      console.error('Widget chat error:', err);
      typing.classList.add('hidden');
      const errBubble = document.createElement('div');
      errBubble.className = 'text-xs text-rose-400 p-2';
      errBubble.textContent = 'Connection error. Please try again.';
      stream.appendChild(errBubble);
    }
  }

  function escapeWidgetHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
  }

  function parseWidgetMarkdown(md) {
    let html = md || '';
    html = html.replace(/^### (.*$)/gim, '<div class="font-bold text-cyan-300 text-xs mt-1">$1</div>');
    html = html.replace(/^## (.*$)/gim, '<div class="font-bold text-cyan-300 text-xs mt-1">$1</div>');
    html = html.replace(/\*\*(.*?)\*\*/gim, '<strong class="text-white font-bold">$1</strong>');
    html = html.replace(/\*(.*?)\*/gim, '<em class="text-cyan-200">$1</em>');
    html = html.replace(/^\> (.*$)/gim, '<div class="p-2 rounded bg-cyan-950/40 border-l-2 border-cyan-400 text-cyan-200 text-[11px] my-1">$1</div>');
    html = html.replace(/^\* (.*$)/gim, '<div class="ml-2 text-slate-300 text-[11px]">&bull; $1</div>');
    html = html.replace(/`(.*?)`/gim, '<code class="px-1 py-0.5 rounded bg-slate-950 font-mono text-[10px] text-cyan-300 border border-slate-700">$1</code>');
    html = html.replace(/\n\n/g, '<br>');
    return html;
  }
})();
