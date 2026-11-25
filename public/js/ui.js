/* MENTRA shared UI: escaping, formatting, toasts, modals, tag input, app shell. */
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  window.esc = esc;
  window.$ = (s, r = document) => r.querySelector(s);
  window.$$ = (s, r = document) => [...r.querySelectorAll(s)];

  const UI = {
    date: (d) => (d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : ''),
    dateTime: (d) => new Date(d).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }),
    ago(d) {
      const s = Math.floor((Date.now() - new Date(d)) / 1000);
      if (s < 60) return 'just now';
      if (s < 3600) return `${Math.floor(s / 60)} min ago`;
      if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
      if (s < 86400 * 30) return `${Math.floor(s / 86400)} day${Math.floor(s / 86400) > 1 ? 's' : ''} ago`;
      return UI.date(d);
    },
    toLocalInput(d) { const x = new Date(d); x.setMinutes(x.getMinutes() - x.getTimezoneOffset()); return x.toISOString().slice(0, 16); },
    avatar(name = '?', size = 'md') {
      const ini = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
      let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
      return `<span class="avatar avatar-${size}" style="--h:${h}">${esc(ini)}</span>`;
    },
    chips(arr = [], max = 5, cls = '') {
      const shown = arr.slice(0, max).map((x) => `<span class="chip ${cls}">${esc(x)}</span>`).join('');
      return shown + (arr.length > max ? `<span class="chip">+${arr.length - max}</span>` : '');
    },
    stars(v = 0, count) {
      const full = Math.round(v);
      const s = [1, 2, 3, 4, 5].map((i) => `<i class="bi bi-star-fill ${i <= full ? '' : 'off'}"></i>`).join('');
      return `<span class="stars">${s}</span>` + (count !== undefined ? ` <small class="text-muted-m">${count ? `${Number(v).toFixed(1)} (${count})` : 'No ratings yet'}</small>` : '');
    },
    matchBadge(m) {
      if (!m) return '';
      const tone = m.score >= 65 ? '' : m.score >= 35 ? 'mid' : 'low';
      const tip = m.reasons && m.reasons.length ? `Shared topics: ${m.reasons.join(', ')}` : 'Based on overlap between your profile and this mentor';
      return `<span class="match-badge ${tone}" title="${esc(tip)} (engine: ${esc(m.engine)})"><i class="bi bi-bullseye"></i>${m.score}% match</span>`;
    },
    status: (s) => `<span class="status status-${esc(s)}">${esc(String(s).replace('-', ' '))}</span>`,
    loading(n = 3) { return `<div class="row g-3">${Array.from({ length: n }, () => '<div class="col-md-6 col-xl-4"><div class="skeleton"></div></div>').join('')}</div>`; },
    empty({ icon = 'inbox', title, text = '', action = '' }) {
      return `<div class="empty-state"><i class="bi bi-${icon}"></i><h5>${esc(title)}</h5><p>${esc(text)}</p>${action}</div>`;
    },
    error(msg) {
      return `<div class="empty-state"><i class="bi bi-exclamation-triangle" style="color:#e11d48;background:rgba(244,63,94,.1)"></i><h5>Couldn't load this page</h5><p>${esc(msg)}</p><button class="btn btn-primary" data-reload>Try again</button></div>`;
    },
    header(title, sub = '', actions = '') {
      return `<div class="page-head"><div><h1>${esc(title)}</h1>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="d-flex gap-2 flex-wrap">${actions}</div></div>`;
    },
    stat({ icon, label, value, href, tone = 'primary', sub = '' }) {
      const tag = href ? 'a' : 'div';
      return `<${tag} ${href ? `href="${href}"` : ''} class="card-soft hover stat-card"><span class="stat-icon tone-${tone}"><i class="bi bi-${icon}"></i></span><div><div class="stat-value">${value}</div><div class="stat-label">${esc(label)}</div>${sub ? `<small class="text-muted-m">${sub}</small>` : ''}</div></${tag}>`;
    },
    setBusy(btn, busy) {
      if (!btn) return;
      if (busy) { btn.dataset.html = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Please wait'; }
      else { btn.disabled = false; if (btn.dataset.html) btn.innerHTML = btn.dataset.html; }
    },
    debounce(fn, ms = 350) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; },
    showFormError(form, msg) {
      let el = form.querySelector('.form-error');
      if (!el) { el = document.createElement('div'); el.className = 'alert alert-danger py-2 form-error'; form.prepend(el); }
      el.textContent = msg; el.classList.remove('d-none');
    },
    clearFormError(form) { const el = form.querySelector('.form-error'); if (el) el.classList.add('d-none'); },
    dayName: (d) => ({ Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday', Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday' }[d] || d),
    availability(slots = []) {
      if (!slots.length) return '<p class="text-muted-m mb-0">No availability published yet.</p>';
      return `<div class="avail-grid">${slots.map((s) => `<div class="avail-slot"><b>${esc(UI.dayName(s.day))}</b>${esc(s.start)} – ${esc(s.end)}</div>`).join('')}</div>`;
    }
  };
  window.UI = UI;
  document.addEventListener('click', (e) => { if (e.target.closest('[data-reload]')) location.reload(); });

  /* ---- Toasts ---- */
  window.Toast = {
    show(message, type = 'success') {
      let wrap = $('.toast-wrap');
      if (!wrap) { wrap = document.createElement('div'); wrap.className = 'toast-wrap'; document.body.appendChild(wrap); }
      const icon = { success: 'check-circle-fill', error: 'x-circle-fill', info: 'info-circle-fill' }[type];
      const el = document.createElement('div');
      el.className = `toast-m ${type}`; el.innerHTML = `<i class="bi bi-${icon}"></i><span>${esc(message)}</span>`;
      wrap.appendChild(el);
      setTimeout(() => { el.style.opacity = 0; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3800);
    }
  };

  /* ---- Modals ---- */
  const Modal = {
    open({ title, body, size = '', onShow }) {
      const el = document.createElement('div');
      el.className = 'modal fade'; el.tabIndex = -1;
      el.innerHTML = `<div class="modal-dialog modal-dialog-centered modal-dialog-scrollable ${size}"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">${esc(title)}</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body">${body}</div></div></div>`;
      document.body.appendChild(el);
      const m = new bootstrap.Modal(el);
      el.addEventListener('hidden.bs.modal', () => { m.dispose(); el.remove(); });
      m.show();
      if (onShow) onShow(el, m);
      return { el, m };
    },
    form({ title, body, submitText = 'Save', size, onShow, onSubmit }) {
      const html = `<form novalidate>${body}<div class="d-flex justify-content-end gap-2 mt-4"><button type="button" class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">${esc(submitText)}</button></div></form>`;
      const { el, m } = Modal.open({ title, body: html, size, onShow });
      const form = $('form', el);
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); UI.clearFormError(form);
        const btn = $('[type=submit]', form); UI.setBusy(btn, true);
        try { await onSubmit(form, m); } catch (err) { UI.showFormError(form, err.message); } finally { UI.setBusy(btn, false); }
      });
      return { el, m, form };
    },
    confirm({ title, message, confirmText = 'Confirm', danger = false }) {
      return new Promise((resolve) => {
        let answer = false;
        const { el, m } = Modal.open({ title, body: `<p class="text-muted-m">${esc(message)}</p><div class="d-flex justify-content-end gap-2 mt-3"><button class="btn btn-light" data-bs-dismiss="modal">Cancel</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(confirmText)}</button></div>` });
        $('[data-ok]', el).addEventListener('click', () => { answer = true; m.hide(); });
        el.addEventListener('hidden.bs.modal', () => resolve(answer));
      });
    }
  };
  window.Modal = Modal;

  /* ---- Tag input ---- */
  window.TagInput = {
    create(container, { values = [], placeholder = 'Type and press Enter', max = 20 } = {}) {
      let tags = [...values];
      container.classList.add('tag-input');
      const render = () => {
        container.innerHTML = tags.map((t, i) => `<span class="chip">${esc(t)}<button type="button" data-i="${i}" aria-label="Remove ${esc(t)}">&times;</button></span>`).join('') + `<input type="text" placeholder="${tags.length ? '' : esc(placeholder)}" maxlength="40">`;
        const input = $('input', container);
        const add = () => {
          const v = input.value.replace(/,/g, '').trim();
          if (v && tags.length < max && !tags.some((t) => t.toLowerCase() === v.toLowerCase())) { tags.push(v); render(); $('input', container).focus(); } else input.value = '';
        };
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
          else if (e.key === 'Backspace' && !input.value && tags.length) { tags.pop(); render(); $('input', container).focus(); }
        });
        input.addEventListener('blur', add);
      };
      container.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-i]');
        if (b) { tags.splice(Number(b.dataset.i), 1); render(); }
        else $('input', container)?.focus();
      });
      render();
      return { get: () => { const i = $('input', container); if (i && i.value.trim()) { tags.push(i.value.trim()); } return [...new Set(tags)]; } };
    }
  };

  /* ---- Request modal (used by discover + mentor profile) ---- */
  UI.requestModal = (mentorId, mentorName, onDone) => Modal.form({
    title: `Request mentorship from ${mentorName}`, submitText: 'Send request',
    body: `<p class="text-muted-m small">Introduce yourself and say what you hope to learn. A short, specific message gets the best response.</p>
      <label class="form-label">Message</label><textarea class="form-control" name="message" rows="5" maxlength="800" placeholder="Hi, I'm working on… and I'd love guidance on…"></textarea>`,
    onSubmit: async (form, m) => {
      await Api.post('/requests', { mentorId, message: form.message.value });
      m.hide(); Toast.show('Request sent. You will be notified when they respond.'); if (onDone) onDone();
    }
  });

  /* ---- Matching feedback (alpha test): thumbs up/down on a match ---- */
  UI.mfButtons = (otherId, current) => `<div class="small text-muted-m d-flex align-items-center gap-2" data-mf="${esc(otherId)}"><span>${ME.role === 'mentor' ? 'Good fit?' : 'Good match?'}</span>
    <button type="button" class="btn btn-sm ${current === true ? 'btn-success' : 'btn-light'}" data-mf-vote="yes" aria-label="Good match"><i class="bi bi-hand-thumbs-up"></i></button>
    <button type="button" class="btn btn-sm ${current === false ? 'btn-danger' : 'btn-light'}" data-mf-vote="no" aria-label="Not a good match"><i class="bi bi-hand-thumbs-down"></i></button></div>`;
  UI.bindMatchFeedback = (root) => root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-mf-vote]'); if (!b) return;
    const otherId = b.closest('[data-mf]').dataset.mf; const relevant = b.dataset.mfVote === 'yes';
    const paint = () => $$(`[data-mf="${otherId}"]`, root).forEach((x) => {
      const [y, n] = $$('[data-mf-vote]', x);
      y.className = `btn btn-sm ${relevant ? 'btn-success' : 'btn-light'}`; n.className = `btn btn-sm ${relevant ? 'btn-light' : 'btn-danger'}`;
    });
    const send = async (comment) => { await Api.post('/match-feedback', { otherId, relevant, comment: comment || '' }); paint(); Toast.show('Thanks! Your feedback helps improve matching.'); };
    if (relevant) { try { await send(); } catch (err) { Toast.show(err.message, 'error'); } return; }
    Modal.form({ title: 'What was off about this match?', submitText: 'Send feedback',
      body: '<textarea class="form-control" name="comment" rows="3" maxlength="500" placeholder="Optional, e.g. wrong field, too junior, interests do not overlap"></textarea>',
      onSubmit: async (f, m) => { await send(f.comment.value); m.hide(); } });
  });

  /* ---- App shell ---- */
  const NAV = {
    mentee: [
      ['dashboard', 'speedometer2', 'Dashboard'], ['discover', 'compass', 'Discover Mentors'], ['requests', 'send', 'My Requests'],
      ['connections', 'people', 'My Mentors'], ['sessions', 'calendar-event', 'Sessions'], ['goals', 'bullseye', 'Learning Goals'],
      ['knowledge', 'lightbulb', 'Knowledge Base'], ['resources', 'journal-bookmark', 'Resources'], ['feedback', 'star', 'Feedback'], ['notifications', 'bell', 'Notifications'], ['profile', 'person-circle', 'My Profile']
    ],
    mentor: [
      ['dashboard', 'speedometer2', 'Dashboard'], ['requests', 'inbox', 'Requests'], ['connections', 'people', 'My Students'],
      ['sessions', 'calendar-event', 'Sessions'], ['goals', 'graph-up-arrow', 'Student Goals'], ['knowledge', 'lightbulb', 'Knowledge Base'], ['resources', 'journal-bookmark', 'Resources'],
      ['feedback', 'star', 'Reviews'], ['notifications', 'bell', 'Notifications'], ['profile', 'person-circle', 'My Profile']
    ]
  };
  const LOGO = '<svg viewBox="0 0 64 64"><path d="M16 46V19l16 17 16-17v27" fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  window.BRAND = (href = '/') => `<a class="brand" href="${href}"><span class="brand-mark">${LOGO}</span>mentra</a>`;

  async function refreshBadge() {
    try {
      const { unread } = await Api.get('/notifications/unread-count');
      $$('[data-unread]').forEach((el) => { el.textContent = unread > 99 ? '99+' : unread; el.classList.toggle('d-none', !unread); });
    } catch { /* ignore */ }
  }

  window.Shell = {
    async init(active) {
      let data;
      try { data = await Api.get('/auth/me'); } catch { return null; }
      const user = data.user; window.ME = user;
      if (!data.profileComplete && active !== 'profile') { location.replace('/pages/profile.html?welcome=1'); return null; }
      const items = [...NAV[user.role]];
      if (data.alphaAdmin) items.push(['alpha', 'clipboard-data', 'Alpha Report']);
      const title = (items.find((i) => i[0] === active) || [])[2] || '';
      $('#shell').innerHTML = `
      <div class="app-layout">
        <aside class="offcanvas-lg offcanvas-start sidebar" tabindex="-1" id="sidebar" aria-label="Main navigation">
          <div class="sidebar-inner">
            ${BRAND('/pages/dashboard.html')}
            <nav>${items.map(([k, ic, label]) => `<a class="nav-link-m ${k === active ? 'active' : ''}" href="/pages/${k}.html"><i class="bi bi-${ic}"></i>${esc(label)}${k === 'notifications' ? '<span class="nav-badge d-none" data-unread></span>' : ''}</a>`).join('')}<a class="nav-link-m" href="#" id="logoutNav"><i class="bi bi-box-arrow-right"></i>Log out</a></nav>
            <div class="sidebar-user">${UI.avatar(user.name, 'sm')}<div class="overflow-hidden"><div class="name text-truncate">${esc(user.name)}</div><div class="role">${esc(user.role)}</div></div>
              <button class="btn btn-sm ms-auto text-white-50" id="logoutBtn" title="Log out" aria-label="Log out"><i class="bi bi-box-arrow-right fs-5"></i></button></div>
          </div>
        </aside>
        <div class="app-main-wrap">
          <header class="topbar">
            <button class="icon-btn d-lg-none" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-label="Open menu"><i class="bi bi-list fs-4"></i></button>
            <span class="page-crumb">${esc(title)}</span>
            <div class="ms-auto d-flex align-items-center gap-2">
              <a class="icon-btn" href="/pages/notifications.html" aria-label="Notifications"><i class="bi bi-bell"></i><span class="dot d-none" data-unread></span></a>
              <a class="icon-btn" href="/pages/profile.html" aria-label="Profile">${UI.avatar(user.name, 'sm')}</a>
            </div>
          </header>
          <main id="view" class="app-main"></main>
        </div>
      </div>`;
      const doLogout = async (e) => { e.preventDefault(); try { await Api.post('/auth/logout'); } finally { location.href = '/pages/login.html'; } };
      $('#logoutBtn').addEventListener('click', doLogout);
      $('#logoutNav').addEventListener('click', doLogout);
      document.title = `${title} · MENTRA`;
      refreshBadge(); setInterval(refreshBadge, 45000);
      window.refreshBadge = refreshBadge;
      return $('#view');
    }
  };
})();
