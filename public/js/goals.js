(async () => {
  const view = await Shell.init('goals'); if (!view) return;
  const isMentor = ME.role === 'mentor';
  const CATS = ['Technical skills', 'Career', 'Academics', 'Research', 'Soft skills', 'Other'];
  let menteeId = null; const byId = new Map();

  if (isMentor) {
    const conns = (await Api.get('/connections').catch(() => ({ items: [] }))).items;
    if (!conns.length) { view.innerHTML = UI.header('Student goals', 'Follow your students\' learning goals.') + UI.empty({ icon: 'people', title: 'No students yet', text: 'Once you accept a request, you can follow that student\'s goals here.', action: '<a class="btn btn-primary" href="/pages/requests.html">View requests</a>' }); return; }
    const want = new URLSearchParams(location.search).get('mentee');
    menteeId = conns.some((c) => c.person.id === want) ? want : conns[0].person.id;
    view.innerHTML = `${UI.header('Student goals', 'Follow progress and leave encouragement.', `<select class="form-select" id="student">${conns.map((c) => `<option value="${esc(c.person.id)}" ${c.person.id === menteeId ? 'selected' : ''}>${esc(c.person.name)}</option>`).join('')}</select>`)}<div id="list"></div>`;
    $('#student').addEventListener('change', (e) => { menteeId = e.target.value; load(); });
  } else {
    view.innerHTML = `${UI.header('Learning goals', 'Set goals and track your progress. Your mentors can see them.', '<button class="btn btn-primary" id="newBtn"><i class="bi bi-plus-lg me-1"></i>New goal</button>')}<div id="list"></div>`;
    $('#newBtn').addEventListener('click', () => goalForm());
  }
  const list = $('#list');

  function goalForm(g) {
    Modal.form({ title: g ? 'Edit goal' : 'New goal', submitText: g ? 'Save' : 'Create goal',
      body: `<div class="mb-3"><label class="form-label">Title *</label><input class="form-control" name="title" maxlength="140" value="${esc(g?.title || '')}" placeholder="e.g. Build and deploy a full-stack project"></div>
        <div class="mb-3"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="3" maxlength="800">${esc(g?.description || '')}</textarea></div>
        <div class="row g-3"><div class="col-md-6"><label class="form-label">Category</label><select class="form-select" name="category">${CATS.map((c) => `<option ${g?.category === c ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
          <div class="col-md-6"><label class="form-label">Target date</label><input class="form-control" type="date" name="targetDate" value="${g?.targetDate ? g.targetDate.slice(0, 10) : ''}"></div></div>`,
      onSubmit: async (f, m) => {
        const body = { title: f.title.value, description: f.description.value, category: f.category.value, targetDate: f.targetDate.value ? new Date(f.targetDate.value).toISOString() : '' };
        if (g) await Api.put(`/goals/${g.id}`, body); else await Api.post('/goals', body);
        m.hide(); Toast.show(g ? 'Goal updated' : 'Goal created'); load();
      } });
  }

  function progressForm(g) {
    Modal.form({ title: 'Log progress', submitText: 'Save progress',
      body: `<h6>${esc(g.title)}</h6><label class="form-label mt-2">How far along are you? <b id="pv">${g.progress}%</b></label><input type="range" class="form-range" min="0" max="100" step="5" name="percent" value="${g.progress}">
        <label class="form-label mt-3">What did you do? (optional)</label><textarea class="form-control" name="note" rows="3" maxlength="500"></textarea>`,
      onShow: (el) => { const r = $('[name=percent]', el); r.addEventListener('input', () => { $('#pv', el).textContent = r.value + '%'; }); },
      onSubmit: async (f, m) => { await Api.post(`/goals/${g.id}/progress`, { percent: Number(f.percent.value), note: f.note.value }); m.hide(); Toast.show('Progress saved'); load(); } });
  }

  const card = (g) => {
    byId.set(g.id, g);
    const overdue = g.targetDate && g.status !== 'completed' && new Date(g.targetDate) < new Date();
    return `<div class="card-soft mb-3" data-card="${g._id}"><div class="d-flex flex-wrap gap-2 align-items-center mb-2"><h6 class="mb-0">${esc(g.title)}</h6>${UI.status(g.status)}<span class="chip m-0">${esc(g.category)}</span>
      ${g.targetDate ? `<small class="ms-auto ${overdue ? 'text-danger fw-bold' : 'text-muted-m'}"><i class="bi bi-flag me-1"></i>${overdue ? 'Overdue · ' : 'Due '}${esc(UI.date(g.targetDate))}</small>` : ''}</div>
      ${g.description ? `<p class="small text-muted-m mb-2">${esc(g.description)}</p>` : ''}
      <div class="d-flex align-items-center gap-3"><div class="progress flex-grow-1"><div class="progress-bar" style="width:${g.progress}%"></div></div><b>${g.progress}%</b></div>
      <div class="d-flex flex-wrap gap-2 mt-3">
        ${isMentor ? `<button class="btn btn-soft btn-sm" data-a="note" data-id="${g._id}"><i class="bi bi-chat-text me-1"></i>Add note</button>`
          : `<button class="btn btn-primary btn-sm" data-a="progress" data-id="${g._id}"><i class="bi bi-graph-up-arrow me-1"></i>Log progress</button><button class="btn btn-light btn-sm" data-a="edit" data-id="${g._id}">Edit</button>`}
        <button class="btn btn-light btn-sm" data-a="history" data-id="${g._id}"><i class="bi bi-clock-history me-1"></i>History</button>
        ${isMentor ? '' : `<button class="btn btn-light btn-sm text-danger ms-auto" data-a="delete" data-id="${g._id}"><i class="bi bi-trash"></i></button>`}</div>
      <div class="mt-3 d-none" data-hist="${g._id}"></div></div>`;
  };

  async function load() {
    list.innerHTML = UI.loading(2);
    try {
      const d = await Api.get('/goals' + (isMentor ? `?${qs({ menteeId })}` : ''));
      d.items.forEach((g) => { g.id = g._id; });
      list.innerHTML = d.items.length ? d.items.map(card).join('') : UI.empty({ icon: 'bullseye', title: isMentor ? 'No goals yet' : 'No goals yet', text: isMentor ? 'This student has not set any goals.' : 'Break what you want to achieve into clear goals and track them here.', action: isMentor ? '' : '<button class="btn btn-primary" id="emptyNew">Create your first goal</button>' });
      $('#emptyNew')?.addEventListener('click', () => goalForm());
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }

  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const g = byId.get(b.dataset.id);
    try {
      if (b.dataset.a === 'edit') goalForm(g);
      else if (b.dataset.a === 'progress') progressForm(g);
      else if (b.dataset.a === 'note') Modal.form({ title: 'Note for your student', submitText: 'Send note', body: `<h6>${esc(g.title)}</h6><textarea class="form-control mt-2" name="note" rows="4" maxlength="500" placeholder="Encouragement, feedback or a next step…"></textarea>`, onSubmit: async (f, m) => { await Api.post(`/goals/${g.id}/progress`, { note: f.note.value }); m.hide(); Toast.show('Note sent'); } });
      else if (b.dataset.a === 'delete') { if (await Modal.confirm({ title: 'Delete this goal?', message: 'Its progress history will be removed too.', confirmText: 'Delete', danger: true })) { await Api.del(`/goals/${g.id}`); Toast.show('Goal deleted'); load(); } }
      else if (b.dataset.a === 'history') {
        const box = $(`[data-hist="${g.id}"]`);
        if (!box.classList.contains('d-none')) { box.classList.add('d-none'); return; }
        box.classList.remove('d-none'); box.innerHTML = '<div class="skeleton" style="height:60px"></div>';
        const h = await Api.get(`/goals/${g.id}/progress`);
        box.innerHTML = h.items.length ? h.items.map((x) => `<div class="list-row py-2"><span class="chip ${x.byRole === 'mentor' ? 'chip-teal' : ''} m-0">${x.byRole === 'mentor' ? 'Mentor' : 'Student'}</span><div class="flex-grow-1 small">${x.byRole === 'mentee' ? `<b>${x.percent}%</b> ` : ''}${esc(x.note || (x.byRole === 'mentee' ? 'Progress updated' : ''))}</div><small class="text-muted-m">${esc(UI.ago(x.createdAt))}</small></div>`).join('') : '<p class="small text-muted-m mb-0">No updates yet.</p>';
      }
    } catch (err) { Toast.show(err.message, 'error'); }
  });
  load();
})();
