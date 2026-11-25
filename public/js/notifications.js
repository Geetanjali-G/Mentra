(async () => {
  const view = await Shell.init('notifications'); if (!view) return;
  const ICON = { request: ['inbox', 'primary'], 'request-accepted': ['check-circle', 'teal'], 'request-declined': ['x-circle', 'rose'], session: ['calendar-event', 'amber'], feedback: ['star', 'amber'], goal: ['bullseye', 'primary'], system: ['bell', 'primary'] };
  view.innerHTML = `${UI.header('Notifications', 'Stay on top of requests, sessions and progress.', '<button class="btn btn-light" id="readAll"><i class="bi bi-check2-all me-1"></i>Mark all as read</button>')}<div class="card-soft p-2" id="list"></div>`;
  const list = $('#list');
  async function load() {
    list.innerHTML = '<div class="skeleton m-2" style="height:90px"></div>';
    try {
      const d = await Api.get('/notifications');
      list.innerHTML = d.items.length ? d.items.map((n) => { const [ic, tone] = ICON[n.type] || ICON.system;
        return `<a class="notif ${n.read ? '' : 'unread'}" href="${esc(n.link || '#')}" data-id="${n._id}"><span class="notif-ic tone-${tone}"><i class="bi bi-${ic}"></i></span><div class="flex-grow-1"><div class="fw-bold">${esc(n.title)}</div><div class="small text-muted-m">${esc(n.message)}</div><small class="text-muted-m">${esc(UI.ago(n.createdAt))}</small></div>${n.read ? '' : '<span class="align-self-center" style="width:9px;height:9px;border-radius:50%;background:var(--m-primary)"></span>'}</a>`; }).join('')
        : UI.empty({ icon: 'bell', title: 'No notifications yet', text: 'Updates about requests, sessions and goals will appear here.' });
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }
  list.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-id]'); if (!a) return; e.preventDefault();
    try { await Api.patch(`/notifications/${a.dataset.id}/read`); } catch { /* still navigate */ }
    const href = a.getAttribute('href'); if (href && href !== '#') location.href = href; else load();
  });
  $('#readAll').addEventListener('click', async () => { try { await Api.patch('/notifications/read-all'); Toast.show('All caught up'); load(); refreshBadge(); } catch (err) { Toast.show(err.message, 'error'); } });
  load();
})();
