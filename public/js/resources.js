(async () => {
  const view = await Shell.init('resources'); if (!view) return;
  const isMentor = ME.role === 'mentor';
  const ICON = { article: 'file-text', video: 'play-btn', course: 'mortarboard', book: 'book', tool: 'wrench', other: 'link-45deg' };
  const TYPES = ['article', 'video', 'course', 'book', 'tool', 'other'];
  const state = { q: '', type: '', scope: '' };
  view.innerHTML = `${UI.header('Resources', isMentor ? 'Share articles, courses and tools with students.' : 'Learning material shared by mentors.', isMentor ? '<button class="btn btn-primary" id="shareBtn"><i class="bi bi-plus-lg me-1"></i>Share resource</button>' : '')}
    <div class="d-flex flex-wrap gap-2 mb-4 align-items-center">
      <div class="tabs-m" id="tabs"><button data-s="" class="active">All</button><button data-s="shared">${isMentor ? 'Private shares' : 'Shared with me'}</button>${isMentor ? '<button data-s="mine">Mine</button>' : ''}</div>
      <input id="q" class="form-control w-auto flex-grow-1" style="max-width:320px" placeholder="Search resources…">
      <select id="type" class="form-select w-auto"><option value="">All types</option>${TYPES.map((t) => `<option value="${t}">${t[0].toUpperCase() + t.slice(1)}</option>`).join('')}</select></div><div id="list"></div>`;
  const list = $('#list');

  const card = (r) => `<div class="col-md-6 col-xl-4"><div class="card-soft hover h-100 d-flex flex-column">
    <div class="d-flex gap-3 align-items-start mb-2"><span class="stat-icon tone-primary"><i class="bi bi-${ICON[r.type] || ICON.other}"></i></span><div class="overflow-hidden"><h6 class="mb-0">${esc(r.title)}</h6><small class="text-muted-m">${esc(r.type)} · ${esc(UI.date(r.createdAt))}</small></div></div>
    ${r.sharedWith ? `<div class="mb-2"><span class="chip chip-teal m-0"><i class="bi bi-lock me-1"></i>${isMentor ? `Private to ${esc(r.sharedWith.name || 'student')}` : 'Shared with you'}</span></div>` : ''}
    ${r.description ? `<p class="small text-muted-m">${esc(r.description)}</p>` : ''}<div>${UI.chips(r.tags, 5)}</div>
    <div class="mt-auto pt-3 d-flex gap-2 align-items-center"><a class="btn btn-soft btn-sm" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">Open <i class="bi bi-box-arrow-up-right ms-1"></i></a><small class="text-muted-m text-truncate">by ${esc(r.author?.name || 'Mentor')}</small>
      ${r.mine ? `<button class="btn btn-sm text-danger ms-auto" data-del="${r.id}" aria-label="Delete resource"><i class="bi bi-trash"></i></button>` : ''}</div></div></div>`;

  async function load() {
    list.innerHTML = UI.loading(3);
    try {
      const d = await Api.get('/resources?' + qs(state));
      list.innerHTML = d.items.length ? `<div class="row g-3">${d.items.map(card).join('')}</div>` : UI.empty({ icon: 'journal-bookmark', title: 'No resources found', text: isMentor ? 'Share something useful with your students.' : 'When your mentors share material, it will show up here.' });
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; state.scope = b.dataset.s; $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b)); load(); });
  $('#q').addEventListener('input', UI.debounce((e) => { state.q = e.target.value; load(); }));
  $('#type').addEventListener('change', (e) => { state.type = e.target.value; load(); });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-del]'); if (!b) return;
    if (await Modal.confirm({ title: 'Remove this resource?', message: 'It will disappear for everyone it was shared with.', confirmText: 'Remove', danger: true })) {
      try { await Api.del(`/resources/${b.dataset.del}`); Toast.show('Resource removed'); load(); } catch (err) { Toast.show(err.message, 'error'); }
    }
  });

  if (isMentor) $('#shareBtn').addEventListener('click', async () => {
    const conns = (await Api.get('/connections').catch(() => ({ items: [] }))).items;
    Modal.form({ title: 'Share a resource', submitText: 'Share',
      body: `<div class="mb-3"><label class="form-label">Title *</label><input class="form-control" name="title" maxlength="140"></div>
        <div class="mb-3"><label class="form-label">Link *</label><input class="form-control" name="url" placeholder="https://…"></div>
        <div class="mb-3"><label class="form-label">Description</label><textarea class="form-control" name="description" rows="2" maxlength="600"></textarea></div>
        <div class="row g-3"><div class="col-md-5"><label class="form-label">Type</label><select class="form-select" name="type">${TYPES.map((t) => `<option>${t}</option>`).join('')}</select></div>
          <div class="col-md-7"><label class="form-label">Share with</label><select class="form-select" name="sharedWith"><option value="">Everyone (public library)</option>${conns.map((c) => `<option value="${esc(c.person.id)}">${esc(c.person.name)} only</option>`).join('')}</select></div></div>
        <div class="mt-3"><label class="form-label">Tags</label><div id="tags"></div></div>`,
      onShow: (el) => { el._tags = TagInput.create($('#tags', el), { placeholder: 'e.g. react, career', max: 8 }); },
      onSubmit: async (f, m) => {
        await Api.post('/resources', { title: f.title.value, url: f.url.value, description: f.description.value, type: f.type.value, sharedWith: f.sharedWith.value, tags: f.closest('.modal')._tags.get() });
        m.hide(); Toast.show('Resource shared'); load();
      } });
  });
  load();
})();
