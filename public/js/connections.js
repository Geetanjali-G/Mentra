(async () => {
  const view = await Shell.init('connections'); if (!view) return;
  const isMentor = ME.role === 'mentor';
  let status = 'active';
  view.innerHTML = `${UI.header(isMentor ? 'My students' : 'My mentors', isMentor ? 'Students you are currently mentoring.' : 'Mentors who accepted your request.')}
    <div class="tabs-m mb-4" id="tabs"><button data-s="active" class="active">Active</button><button data-s="ended">Ended</button></div><div id="list"></div>`;
  const list = $('#list');

  const card = (c) => {
    const p = c.person || {};
    const buttons = c.status === 'active' ? `
      <a class="btn btn-primary btn-sm" href="/pages/sessions.html?connection=${c.id}"><i class="bi bi-calendar-plus me-1"></i>Schedule session</a>
      ${isMentor ? `<a class="btn btn-soft btn-sm" href="/pages/goals.html?mentee=${esc(p.id)}"><i class="bi bi-graph-up-arrow me-1"></i>Goals & progress</a>`
        : `<a class="btn btn-soft btn-sm" href="/pages/mentor.html?id=${esc(p.id)}">Profile</a><a class="btn btn-soft btn-sm" href="/pages/feedback.html?connection=${c.id}">Feedback</a>`}
      <button class="btn btn-light btn-sm text-danger ms-auto" data-end="${c.id}" data-name="${esc(p.name)}">End</button>`
      : (!isMentor ? `<a class="btn btn-soft btn-sm" href="/pages/feedback.html?connection=${c.id}">Leave feedback</a>` : '');
    return `<div class="col-md-6"><div class="card-soft h-100"><div class="d-flex gap-3">${UI.avatar(p.name, 'md')}<div class="flex-grow-1 overflow-hidden">
      <div class="d-flex gap-2 align-items-center flex-wrap"><h6 class="mb-0">${esc(p.name)}</h6>${UI.status(c.status)}</div>
      <div class="small text-muted-m">${isMentor ? [p.college, p.department].filter(Boolean).map(esc).join(' · ') : esc(p.headline || '')}</div></div></div>
      <div class="my-3">${isMentor ? UI.chips(p.interests || [], 5, 'chip-teal') : UI.chips(p.skills || [], 5)}</div>
      <div class="small text-muted-m mb-3"><i class="bi bi-clock-history me-1"></i>Since ${esc(UI.date(c.startedAt))}${c.nextSession ? ` · <b>Next:</b> ${esc(c.nextSession.title)}, ${esc(UI.dateTime(c.nextSession.scheduledAt))}` : ''}</div>
      <div class="d-flex flex-wrap gap-2">${buttons}</div></div></div>`;
  };

  async function load() {
    list.innerHTML = UI.loading(2);
    try {
      const d = await Api.get('/connections?' + qs({ status }));
      list.innerHTML = d.items.length ? `<div class="row g-3">${d.items.map(card).join('')}</div>`
        : UI.empty({ icon: 'people', title: status === 'active' ? (isMentor ? 'No students yet' : 'No mentors yet') : 'Nothing here', text: status === 'active' ? (isMentor ? 'Accept a request to start mentoring.' : 'Send a request to a mentor. Once they accept, they appear here.') : 'Ended mentorships show up here.', action: status === 'active' ? (isMentor ? '<a class="btn btn-primary" href="/pages/requests.html">View requests</a>' : '<a class="btn btn-primary" href="/pages/discover.html">Discover mentors</a>') : '' });
    } catch (e) { list.innerHTML = UI.error(e.message); }
  }
  $('#tabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; status = b.dataset.s; $$('#tabs button').forEach((x) => x.classList.toggle('active', x === b)); load(); });
  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-end]'); if (!b) return;
    if (!(await Modal.confirm({ title: `End mentorship with ${b.dataset.name}?`, message: 'Upcoming sessions will be cancelled and the other person will be notified.', confirmText: 'End mentorship', danger: true }))) return;
    try { await Api.patch(`/connections/${b.dataset.end}/end`); Toast.show('Mentorship ended'); load(); } catch (err) { Toast.show(err.message, 'error'); }
  });
  load();
})();
