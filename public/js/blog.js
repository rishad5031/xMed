// =============================================================
// xMED Doctors Clinical Blog & Insights Controller
// =============================================================

let allBlogs = [];

document.addEventListener('DOMContentLoaded', () => {
  loadDoctorBlogs();
});

async function loadDoctorBlogs() {
  const container = document.getElementById('doctor-blogs-grid');
  if (!container) return;

  try {
    const res = await fetch('/api/blogs');
    const data = await res.json();

    if (data.success && data.blogs) {
      allBlogs = data.blogs;
      renderBlogCards(allBlogs);
      setupCategoryFilters();
    }
  } catch (err) {
    console.error('Failed to load clinical articles:', err);
    if (container) {
      container.innerHTML = `<div class="col-span-full text-center text-xs text-slate-400 p-4">Unable to load clinical articles right now.</div>`;
    }
  }
}

function renderBlogCards(blogs) {
  const container = document.getElementById('doctor-blogs-grid');
  if (!container) return;

  if (blogs.length === 0) {
    container.innerHTML = `<div class="col-span-full text-center text-xs text-slate-400 p-6">No articles found in this specialty.</div>`;
    return;
  }

  container.innerHTML = '';

  blogs.forEach((b, index) => {
    const dateFormatted = new Date(b.published_at).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric'
    });

    const card = document.createElement('article');
    card.className = 'glass-card spotlight-wrapper p-6 rounded-3xl border border-slate-700/50 hover:border-sky-500/50 transition-all flex flex-col justify-between group';
    card.innerHTML = `
      <div class="space-y-3">
        <div class="flex items-center justify-between text-xs">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${getCategoryClass(b.category)}">
            ${b.category}
          </span>
          <span class="text-slate-400 font-mono text-[11px]">${b.read_time}</span>
        </div>

        <h3 class="text-lg font-bold text-slate-100 group-hover:text-sky-400 transition-colors leading-snug">
          ${b.title}
        </h3>

        <p class="text-xs text-slate-300 line-clamp-3 leading-relaxed">
          ${b.summary}
        </p>
      </div>

      <div class="pt-5 mt-5 border-t border-slate-700/40 flex items-center justify-between">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-teal-400 p-0.5">
            <div class="w-full h-full bg-slate-900 rounded-full flex items-center justify-center text-xs font-bold text-sky-300">
              ${b.author_name.replace('Dr. ', '').charAt(0)}
            </div>
          </div>
          <div>
            <div class="text-xs font-bold text-slate-200 flex items-center gap-1">
              ${b.author_name}
              <svg class="w-3.5 h-3.5 text-teal-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>
            </div>
            <div class="text-[10px] text-slate-400 font-mono">${b.author_license}</div>
          </div>
        </div>

        <button type="button" class="btn-read-article text-xs font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 group-hover:translate-x-1 transition-transform" data-id="${b.blog_id}">
          Read &rarr;
        </button>
      </div>
    `;

    card.querySelector('.btn-read-article').addEventListener('click', () => {
      openBlogModal(b.blog_id);
    });

    container.appendChild(card);
  });
}

function getCategoryClass(cat) {
  switch (cat) {
    case 'Cardiology': return 'bg-rose-500/15 text-rose-400 border border-rose-500/30';
    case 'Internal Medicine': return 'bg-teal-500/15 text-teal-300 border border-teal-500/30';
    case 'Health Informatics': return 'bg-sky-500/15 text-sky-300 border border-sky-500/30';
    case 'Pediatrics': return 'bg-amber-500/15 text-amber-300 border border-amber-500/30';
    default: return 'bg-purple-500/15 text-purple-300 border border-purple-500/30';
  }
}

function setupCategoryFilters() {
  const filterBtns = document.querySelectorAll('.blog-filter-btn');
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => {
        b.classList.remove('bg-sky-500', 'text-white');
        b.classList.add('glass-card', 'text-slate-300');
      });
      btn.classList.add('bg-sky-500', 'text-white');
      btn.classList.remove('glass-card', 'text-slate-300');

      const category = btn.dataset.category;
      if (category === 'All') {
        renderBlogCards(allBlogs);
      } else {
        const filtered = allBlogs.filter(b => b.category === category);
        renderBlogCards(filtered);
      }
    });
  });
}

// Full Article Modal Reader
async function openBlogModal(id) {
  let modal = document.getElementById('blog-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'blog-modal';
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in hidden';
    document.body.appendChild(modal);
  }

  modal.innerHTML = `
    <div class="glass-card max-w-2xl w-full max-h-[85vh] overflow-y-auto rounded-3xl p-6 sm:p-8 border border-slate-700/60 shadow-2xl relative space-y-4">
      <div class="flex items-center justify-between border-b border-slate-700/40 pb-4">
        <span class="text-xs font-mono font-bold uppercase tracking-widest text-sky-400">Clinical Research & Practice Guideline</span>
        <button type="button" id="btn-close-blog-modal" class="p-2 rounded-xl glass-card text-slate-400 hover:text-white">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        </button>
      </div>

      <div id="blog-modal-content" class="space-y-4">
        <div class="h-6 skeleton rounded w-3/4"></div>
        <div class="h-4 skeleton rounded w-1/2"></div>
        <div class="h-32 skeleton rounded-xl w-full"></div>
      </div>
    </div>
  `;

  modal.classList.remove('hidden');
  document.getElementById('btn-close-blog-modal').addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  try {
    const res = await fetch(`/api/blogs/${id}`);
    const data = await res.json();
    if (data.success && data.blog) {
      const b = data.blog;
      const contentContainer = document.getElementById('blog-modal-content');
      contentContainer.innerHTML = `
        <div>
          <span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${getCategoryClass(b.category)}">${b.category}</span>
          <h2 class="text-2xl font-black text-slate-100 mt-2">${b.title}</h2>
          <div class="text-xs text-slate-400 mt-1 flex items-center gap-2">
            <span>By <strong class="text-slate-200">${b.author_name}</strong></span>
            <span>&bull;</span>
            <span class="font-mono text-teal-400">${b.author_license}</span>
            <span>&bull;</span>
            <span>${b.read_time}</span>
          </div>
          <div class="text-xs text-slate-500 mt-0.5">${b.author_specialization}</div>
        </div>

        <div class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-xs text-sky-200 leading-relaxed italic">
          ${b.summary}
        </div>

        <div class="text-sm text-slate-200 leading-relaxed whitespace-pre-line pt-2">
          ${b.content}
        </div>
      `;
    }
  } catch (err) {
    console.error('Modal error:', err);
  }
}
