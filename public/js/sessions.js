(async () => {
  const view = await Shell.init('sessions'); if (!view) return;
  const isMentor = ME.role === 'mentor';
  let when = 'upcoming'; let connections = []; const byId = new Map();
  const params = new URLSearchParams(location.search);
  view.innerHTML = `${UI.header('Sessions', 'Schedule, reschedule and review your mentoring sessions.', '<button class="btn btn-primary" id="newBtn"><i class="bi bi-plus-lg me-1"></i>Schedule session</button>')}
    <div class="tabs-m mb-4" id="tabs"><button data-w="upcoming" class="active">Upcoming</button><button data-w="past">Past</button><button data-w="cancelled">Cancelled</button></div><div id="list"></div>`;
  const list = $('#list');
  try { connections = (await Api.get('/connections')).items; } catch { /* handled on use */ }

  function openForm(s) {
    if (!s && !connections.length) { Toast.show('You need an active mentorship before scheduling a session.', 'info'); return; }
    const pre = params.get('connection');
    const connSelect = s ? '' : `<div class="mb-3"><label class="form-label">With</label><select class="form-select" name="connectionId">${connections.map((c) => `<option value="${c.id}" ${c.id === pre ? 'selected' : ''}>${esc(c.person?.name)}</option>`).join('')}</select></div><div id="hint" class="mb-3"></div>`;
    const { form } = Modal.form({
      title: s ? 'Edit session' : 'Schedule a session', submitText: s ? 'Save changes' : 'Schedule',
      body: `${connSelect}
        <div class="mb-3"><label class="form-label">Title *</label><input class="form-control" name="title" maxlength="120" value="${esc(s?.title || '')}" placeholder="e.g. Resume review"></div>
        <div class="row g-3 mb-3"><div class="col-md-7"><label class="form-label">Date & time *</label><input class="form-control" type="datetime-local" name="when" min="${UI.toLocalInput(new Date())}" value="${s ? UI.toLocalInput(s.scheduledAt) : ''}"></div>
          <div class="col-md-5"><label class="form-label">Duration</label><select class="form-select" name="durationMin">${[30, 45, 60, 90].map((n) => `<option value="${n}" ${(s?.durationMin || 30) === n ? 'selected' : ''}>${n} min</option>`).join('')}</select></div></div>
        <div class="row g-3 mb-3"><div class="col-md-4"><label class="form-label">Mode</label><select class="form-select" name="mode"><option value="online" ${s?.mode === 'online' ? 'selected' : ''}>Online</option><option value="in-person" ${s?.mode === 'in-person' ? 'selected' : ''}>In person</option></select></div>
          <div class="col-md-8"><label class="form-label">Meeting link</label><input class="form-control" name="meetingLink" placeholder="https://meet.google.com/…" value="${esc(s?.meetingLink || '')}"></div></div>
        <div><label class="form-label">Agenda</label><textarea class="form-control" name="agenda" rows="2" maxlength="500">${esc(s?.agenda || '')}</textarea></div>`,
      onShow: (el) => {
        const sel = $('[name=connectionId]', el); const hint = $('#hint', el);
        const upd = () => { const c = connections.find((x) => x.id === sel.value); hint.innerHTML = c && c.person?.role === 'mentor' ? `<div class="p-3 rounded-3" style="background:#f6f7fd"><b class="small">${esc(c.person.name)}'s availability</b><div class="mt-2">${UI.availability(c.person.availability)}</div></div>` : ''; };
        if (sel) { sel.addEventListener('change', upd); upd(); }
      },
      onSubmit: async (f, m) => {
        if (!f.when.value) throw new Error('Pick a date and time');
        const body = { title: f.title.value, scheduledAt: new Date(f.when.value).toISOString(), durationMin: Number(f.durationMin.value), mode: f.mode.value, meetingLink: f.meetingLink.value, agenda: f.agenda.value };
        if (s) await Api.patch(`/sessions/${s.id}`, body); else await Api.post('/sessions', { ...body, connectionId: f.connectionId.value });
        m.hide(); Toast.show(s ? 'Session updated' : 'Session scheduled'); load();
      }
    });
    return form;
  }

  function card(s) {
    byId.set(s.id, s);
    const d = new Date(s.scheduledAt); const open = s.status === 'scheduled'; const past = d < new Date();
    const acts = [];
    if (open) { acts.push(`<button class="btn btn-soft btn-sm" data-a="edit" data-id="${s.id}">Reschedule</button>`);
      if (isMentor) acts.push(`<button class="btn btn-primary btn-sm" data-a="complete" data-id="${s.id}">Mark completed</button>`);
      acts.push(`<button class="btn btn-light btn-sm text-danger" data-a="cancel" data-id="${s.id}">Cancel</button>`); }
    acts.push(`<button class="btn btn-light btn-sm" data-a="notes" data-id="${s.id}"><i class="bi bi-journal-text me-1"></i>Notes</button>`);
    if (!isMentor && s.status === 'completed' && !s.rated) acts.push(`<a class="btn btn-primary btn-sm" href="/pages/feedback.html?connection=${s.connectionId}&session=${s.id}"><i class="bi bi-star me-1"></i>Rate</a>`);
    return `<div class="card-soft mb-3"><div class="d-flex gap-3 flex-wrap"><div class="date-block"><div class="d">${d.getDate()}</div><div class="m">${d.toLocaleString(undefined, { month: 'short' })}</div></div>
      <div class="flex-grow-1"><div class="d-flex gap-2 flex-wrap align-items-center"><h6 class="mb-0">${esc(s.title)}</h6>${UI.status(s.status)}${open && past ? '<span class="chip">Awaiting completion</span>' : ''}</div>
        <div class="small text-muted-m mt-1"><i class="bi bi-clock me-1"></i>${esc(UI.dateTime(s.scheduledAt))} · ${s.durationMin} min · with <b>${esc(s.person?.name || '')}</b> · ${esc(s.mode)}</div>
        ${s.agenda ? `<div class="small mt-2">${esc(s.agenda)}</div>` : ''}
        ${s.meetingLink && open ? `<a class="btn btn-sm btn-soft mt-2" href="${esc(s.meetingLink)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-camera-video me-1"></i>Join meeting</a>` : ''}
        <div class="d-flex gap-2 flex-wrap mt-3">${acts.join('')}</div></div></div></div>`;
  }

  async function load() {
    list.innerHTML = UI.loading(2);
    try {
      const d = await Api.get('/sessions?' + qs({ when }));
      list.innerHTML = d.items.length ? d.items.map(card).join('') : UI.empty({ icon: 'calendar-event', title: `No ${when} sessions`, text: connections.length ? 'Schedule a session to get started.' : 'Sessions need an active mentorship first.', action: connections.length ? '' : (isMentor ? '<a class="btn btn-primary" href="/pages/requests.html">View requests</a>' : '<a class="btn btn-primary" href="/pages/discover.html">Find a mentor</a>') });
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; when = b.dataset.w; $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b)); load(); });
  $('#newBtn').addEventListener('click', () => openForm());
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const s = byId.get(b.dataset.id);
    try {
      if (b.dataset.a === 'edit') openForm(s);
      else if (b.dataset.a === 'complete') { if (await Modal.confirm({ title: 'Mark as completed?', message: 'The student will be asked for feedback.', confirmText: 'Mark completed' })) { await Api.patch(`/sessions/${s.id}`, { status: 'completed' }); Toast.show('Session completed'); load(); } }
      else if (b.dataset.a === 'cancel') { if (await Modal.confirm({ title: 'Cancel this session?', message: 'The other person will be notified.', confirmText: 'Cancel session', danger: true })) { await Api.patch(`/sessions/${s.id}`, { status: 'cancelled' }); Toast.show('Session cancelled'); load(); } }
      else if (b.dataset.a === 'notes') Modal.form({ title: 'Session notes', submitText: 'Save notes', body: `<p class="small text-muted-m">Notes are visible to both of you.</p><textarea class="form-control" name="notes" rows="7" maxlength="2000">${esc(s.notes)}</textarea>`, onSubmit: async (f, m) => { await Api.patch(`/sessions/${s.id}`, { notes: f.notes.value }); m.hide(); Toast.show('Notes saved'); load(); } });
    } catch (err) { Toast.show(err.message, 'error'); }
  });
  await load();
  if (params.get('connection') && connections.some((c) => c.id === params.get('connection'))) openForm();
})();
