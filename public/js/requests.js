(async () => {
  const view = await Shell.init('requests'); if (!view) return;
  const isMentor = ME.role === 'mentor';
  let status = isMentor ? 'pending' : '';
  const TABS = isMentor ? [['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['', 'All']] : [['', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined'], ['cancelled', 'Cancelled']];
  view.innerHTML = `${UI.header(isMentor ? 'Mentorship requests' : 'My requests', isMentor ? 'Students who would like you to mentor them.' : 'Track the requests you have sent to mentors.')}
    <div class="tabs-m mb-4" id="tabs">${TABS.map(([v, l]) => `<button data-s="${v}" class="${v === status ? 'active' : ''}">${l}</button>`).join('')}</div><div id="list"></div>`;
  const list = $('#list');
  UI.bindMatchFeedback(list);

  function card(r) {
    const p = r.person || {};
    const detail = isMentor ? `
      <div class="small text-muted-m mb-2">${[p.college, p.department, p.year ? `Year ${p.year}` : ''].filter(Boolean).map(esc).join(' · ')}</div>
      ${r.message ? `<div class="p-3 rounded-3 mb-3" style="background:#f6f7fd;white-space:pre-line">${esc(r.message)}</div>` : ''}
      ${p.learningGoals ? `<div class="mb-2"><b class="small">Learning goals</b><div class="small text-muted-m" style="white-space:pre-line">${esc(p.learningGoals)}</div></div>` : ''}
      <div>${UI.chips(p.interests || [], 8, 'chip-teal')}${UI.chips(p.skills || [], 8)}</div>`
      : `<div class="small text-muted-m mb-2">${esc(p.headline || '')}</div>${r.message ? `<div class="p-3 rounded-3" style="background:#f6f7fd;white-space:pre-line">${esc(r.message)}</div>` : ''}`;
    let actions = '';
    if (r.status === 'pending') actions = isMentor
      ? `<button class="btn btn-primary btn-sm" data-act="accept" data-id="${r.id}" data-name="${esc(p.name)}"><i class="bi bi-check-lg me-1"></i>Accept</button><button class="btn btn-light btn-sm" data-act="decline" data-id="${r.id}" data-name="${esc(p.name)}">Decline</button>`
      : `<button class="btn btn-light btn-sm" data-act="cancel" data-id="${r.id}">Cancel request</button>`;
    if (r.status === 'accepted') actions = `<a class="btn btn-soft btn-sm" href="/pages/connections.html">${isMentor ? 'View students' : 'Go to my mentors'}</a>`;
    return `<div class="card-soft mb-3"><div class="d-flex gap-3 align-items-start">${UI.avatar(p.name, 'md')}<div class="flex-grow-1">
      <div class="d-flex flex-wrap gap-2 align-items-center mb-1"><h6 class="mb-0">${isMentor ? esc(p.name) : `<a class="text-decoration-none text-reset" href="/pages/mentor.html?id=${esc(p.id)}">${esc(p.name)}</a>`}</h6>${UI.status(r.status)}${r.matchScore !== null ? UI.matchBadge({ score: r.matchScore, engine: 'calculated when the request was sent' }) : ''}<small class="text-muted-m ms-auto">${esc(UI.ago(r.createdAt))}</small></div>
      ${detail}${isMentor && r.matchScore !== null ? `<div class="mt-3">${UI.mfButtons(p.id, r.myMatchFeedback)}</div>` : ''}${actions ? `<div class="d-flex gap-2 mt-3">${actions}</div>` : ''}</div></div></div>`;
  }

  async function load() {
    list.innerHTML = UI.loading(2);
    try {
      const d = await Api.get('/requests?' + qs({ status }));
      list.innerHTML = d.items.length ? d.items.map(card).join('') : UI.empty({ icon: 'inbox', title: isMentor ? 'No requests here' : 'No requests yet', text: isMentor ? 'When a student requests mentorship, it will appear here.' : 'Find a mentor and send your first request.', action: isMentor ? '' : '<a class="btn btn-primary" href="/pages/discover.html">Discover mentors</a>' });
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.s; $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b)); load(); });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]'); if (!b) return;
    const { act, id, name } = b.dataset;
    const text = { accept: [`Accept ${name}?`, 'They will become your student and can schedule sessions with you.', 'Accept'], decline: [`Decline ${name}?`, 'They will be notified that you cannot take them on right now.', 'Decline'], cancel: ['Cancel this request?', 'The mentor will no longer see it.', 'Cancel request'] }[act];
    if (!(await Modal.confirm({ title: text[0], message: text[1], confirmText: text[2], danger: act !== 'accept' }))) return;
    try {
      if (act === 'cancel') await Api.patch(`/requests/${id}/cancel`); else await Api.patch(`/requests/${id}/respond`, { action: act });
      Toast.show(act === 'accept' ? 'Student accepted' : act === 'decline' ? 'Request declined' : 'Request cancelled'); load();
    } catch (err) { Toast.show(err.message, 'error'); }
  });
  load();
})();
