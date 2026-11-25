(async () => {
  const view = await Shell.init('knowledge'); if (!view) return;
  const CATS = [['technical', 'Technical'], ['career', 'Career'], ['academics', 'Academics'], ['research', 'Research'], ['soft-skills', 'Soft skills'], ['other', 'Other']];
  const catName = (c) => (CATS.find((x) => x[0] === c) || [c, c])[1];
  const state = { q: '', category: '', tag: '', sort: 'recent', mine: false, page: 1 };

  view.innerHTML = `${UI.header('Knowledge Base', 'Problems that were solved before, ready to be found again.', '<button class="btn btn-primary" id="addBtn"><i class="bi bi-plus-lg me-1"></i>Share a solution</button>')}
    <div class="card-soft mb-3"><div class="row g-2 align-items-end">
      <div class="col-lg-5"><label class="form-label">Search</label><input id="q" class="form-control" placeholder="Search problems, solutions and tags…"></div>
      <div class="col-6 col-lg-3"><label class="form-label">Category</label><select id="category" class="form-select"><option value="">All</option>${CATS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select></div>
      <div class="col-6 col-lg-2"><label class="form-label">Sort by</label><select id="sort" class="form-select"><option value="recent">Newest</option><option value="helpful">Most helpful</option><option value="views">Most viewed</option></select></div>
      <div class="col-lg-2"><div class="form-check form-switch"><input class="form-check-input" type="checkbox" id="mine"><label class="form-check-label" for="mine">My entries</label></div></div></div>
      <div id="tagRow" class="mt-3"></div></div>
    <div id="list"></div><div id="pager" class="d-flex justify-content-center gap-2 mt-4"></div>`;
  const list = $('#list');

  async function loadTags() {
    try {
      const d = await Api.get('/knowledge/tags');
      $('#tagRow').innerHTML = d.items.length ? `<span class="small text-muted-m me-2">Popular tags:</span>${d.items.map((t) => `<button class="chip border-0 ${state.tag === t.tag ? 'chip-teal' : ''}" data-tag="${esc(t.tag)}">${esc(t.tag)} · ${t.count}</button>`).join('')}` : '';
    } catch { /* tags are optional */ }
  }

  const card = (e) => `<div class="col-md-6 col-xl-4"><div class="card-soft hover h-100 d-flex flex-column" role="button" tabindex="0" data-open="${e.id}">
    <div class="d-flex gap-2 align-items-center mb-2"><span class="chip chip-teal m-0">${esc(catName(e.category))}</span>${e.sessionTitle ? '<span class="chip m-0"><i class="bi bi-calendar-check me-1"></i>From a session</span>' : ''}</div>
    <h6>${esc(e.title)}</h6><p class="small text-muted-m flex-grow-1">${esc(e.excerpt)}</p><div>${UI.chips(e.tags, 4)}</div>
    <div class="d-flex gap-3 small text-muted-m mt-2 align-items-center"><span class="text-truncate">${esc(e.author.name)}</span><span class="ms-auto"><i class="bi bi-hand-thumbs-up me-1"></i>${e.helpful}</span><span><i class="bi bi-eye me-1"></i>${e.views}</span></div></div></div>`;

  async function load() {
    list.innerHTML = UI.loading(6);
    try {
      const d = await Api.get('/knowledge?' + qs(state));
      list.innerHTML = d.items.length ? `<p class="text-muted-m small mb-3">${d.total} solution${d.total === 1 ? '' : 's'}</p><div class="row g-3">${d.items.map(card).join('')}</div>`
        : UI.empty({ icon: 'lightbulb', title: state.q || state.tag || state.category || state.mine ? 'No matching solutions' : 'The knowledge base is empty', text: state.q || state.tag || state.category || state.mine ? 'Try different words or clear the filters.' : 'After a session, record the problem and how it was solved so the next student does not start from zero.', action: '<button class="btn btn-primary" id="emptyAdd">Share the first solution</button>' });
      $('#emptyAdd')?.addEventListener('click', () => entryForm());
      $('#pager').innerHTML = d.pages > 1 ? `<button class="btn btn-light" ${d.page <= 1 ? 'disabled' : ''} data-page="${d.page - 1}"><i class="bi bi-chevron-left"></i></button><span class="align-self-center text-muted-m">Page ${d.page} of ${d.pages}</span><button class="btn btn-light" ${d.page >= d.pages ? 'disabled' : ''} data-page="${d.page + 1}"><i class="bi bi-chevron-right"></i></button>` : '';
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }

  async function openEntry(id) {
    let e;
    try { e = (await Api.get('/knowledge/' + id)).entry; } catch (err) { Toast.show(err.message, 'error'); return; }
    const { el, m } = Modal.open({ title: e.title, size: 'modal-lg', body: `
      <div class="mb-3"><span class="chip chip-teal">${esc(catName(e.category))}</span>${e.sessionTitle ? `<span class="chip"><i class="bi bi-calendar-check me-1"></i>${esc(e.sessionTitle)}</span>` : ''}${UI.chips(e.tags, 8)}</div>
      <h6>Problem</h6><p style="white-space:pre-line">${esc(e.problem)}</p><h6>Solution</h6><div class="p-3 rounded-3 mb-3" style="background:#f6f7fd;color:#1b1f3b;white-space:pre-line">${esc(e.solution)}</div>
      <div class="d-flex flex-wrap align-items-center gap-2"><small class="text-muted-m">By ${esc(e.author.name)} (${esc(e.author.role || 'member')}) · ${esc(UI.date(e.createdAt))} · ${e.views} views</small>
        <div class="ms-auto d-flex gap-2">${e.mine ? '<button class="btn btn-light btn-sm" data-edit>Edit</button><button class="btn btn-light btn-sm text-danger" data-del>Delete</button>'
          : `<button class="btn btn-sm ${e.helpedByMe ? 'btn-success' : 'btn-soft'}" data-helpful><i class="bi bi-hand-thumbs-up me-1"></i><span>${e.helpful}</span> Helpful</button>`}</div></div>` });
    $('[data-helpful]', el)?.addEventListener('click', async (ev) => {
      try { const r = await Api.post(`/knowledge/${id}/helpful`); const b = ev.currentTarget; $('span', b).textContent = r.helpful; b.className = `btn btn-sm ${r.helpedByMe ? 'btn-success' : 'btn-soft'}`; load(); } catch (err) { Toast.show(err.message, 'error'); }
    });
    $('[data-edit]', el)?.addEventListener('click', () => { m.hide(); entryForm(e); });
    $('[data-del]', el)?.addEventListener('click', async () => {
      m.hide();
      if (await Modal.confirm({ title: 'Delete this solution?', message: 'It will be removed from the knowledge base for everyone.', confirmText: 'Delete', danger: true })) {
        try { await Api.del('/knowledge/' + id); Toast.show('Solution deleted'); load(); loadTags(); } catch (err) { Toast.show(err.message, 'error'); }
      }
    });
  }

  async function entryForm(e) {
    let sessions = [];
    if (!e) { try { sessions = (await Api.get('/sessions?when=past')).items.filter((s) => s.status === 'completed'); } catch { /* optional */ } }
    Modal.form({ title: e ? 'Edit solution' : 'Share a solution', submitText: e ? 'Save changes' : 'Publish', size: 'modal-lg',
      body: `<div class="mb-3"><label class="form-label">Title *</label><input class="form-control" name="title" maxlength="140" value="${esc(e?.title || '')}" placeholder="e.g. Fixing CORS errors between React and Express"></div>
        <div class="row g-3 mb-3"><div class="col-md-5"><label class="form-label">Category</label><select class="form-select" name="category">${CATS.map(([v, l]) => `<option value="${v}" ${e?.category === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
          ${e ? '' : `<div class="col-md-7"><label class="form-label">From a completed session (optional)</label><select class="form-select" name="sessionId"><option value="">Not linked</option>${sessions.map((s) => `<option value="${s.id}">${esc(s.title)} · ${esc(UI.date(s.scheduledAt))}</option>`).join('')}</select></div>`}</div>
        <div class="mb-3"><label class="form-label">Problem *</label><textarea class="form-control" name="problem" rows="4" maxlength="2000" placeholder="What was the situation or question?">${esc(e?.problem || '')}</textarea></div>
        <div class="mb-3"><label class="form-label">Solution *</label><textarea class="form-control" name="solution" rows="6" maxlength="5000" placeholder="What worked, step by step?">${esc(e?.solution || '')}</textarea></div>
        <div><label class="form-label">Tags</label><div id="kTags"></div></div>`,
      onShow: (el) => { el._tags = TagInput.create($('#kTags', el), { values: e?.tags || [], placeholder: 'e.g. react, cors, debugging', max: 8 }); },
      onSubmit: async (f, m) => {
        const body = { title: f.title.value, category: f.category.value, problem: f.problem.value, solution: f.solution.value, tags: f.closest('.modal')._tags.get() };
        if (e) await Api.put('/knowledge/' + e.id, body); else await Api.post('/knowledge', { ...body, sessionId: f.sessionId.value });
        m.hide(); Toast.show(e ? 'Solution updated' : 'Solution published'); load(); loadTags();
      } });
  }

  $('#addBtn').addEventListener('click', () => entryForm());
  $('#q').addEventListener('input', UI.debounce((ev) => { state.q = ev.target.value; state.page = 1; load(); }));
  $('#category').addEventListener('change', (ev) => { state.category = ev.target.value; state.page = 1; load(); });
  $('#sort').addEventListener('change', (ev) => { state.sort = ev.target.value; state.page = 1; load(); });
  $('#mine').addEventListener('change', (ev) => { state.mine = ev.target.checked; state.page = 1; load(); });
  $('#tagRow').addEventListener('click', (ev) => { const b = ev.target.closest('[data-tag]'); if (!b) return; state.tag = state.tag === b.dataset.tag ? '' : b.dataset.tag; state.page = 1; loadTags(); load(); });
  $('#pager').addEventListener('click', (ev) => { const b = ev.target.closest('[data-page]'); if (b) { state.page = Number(b.dataset.page); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  list.addEventListener('click', (ev) => { const c = ev.target.closest('[data-open]'); if (c) openEntry(c.dataset.open); });
  list.addEventListener('keydown', (ev) => { const c = ev.target.closest('[data-open]'); if (c && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openEntry(c.dataset.open); } });
  loadTags(); load();
})();
