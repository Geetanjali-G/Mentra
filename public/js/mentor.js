(async () => {
  const view = await Shell.init('discover'); if (!view) return;
  const id = new URLSearchParams(location.search).get('id');
  if (!id) { view.innerHTML = UI.empty({ icon: 'person-x', title: 'No mentor selected', action: '<a class="btn btn-primary" href="/pages/discover.html">Discover mentors</a>' }); return; }
  UI.bindMatchFeedback(view);
  async function load() {
    view.innerHTML = UI.loading(2);
    let d;
    try { d = await Api.get('/mentors/' + encodeURIComponent(id)); } catch (e) { view.innerHTML = e.status === 404 ? UI.empty({ icon: 'person-x', title: 'Mentor not found', action: '<a class="btn btn-primary" href="/pages/discover.html">Back to discovery</a>' }) : UI.error(e.message); return; }
    const m = d.mentor; const isMentee = ME.role === 'mentee';
    let cta = '';
    if (isMentee) {
      cta = m.relation === 'connected' ? `<a class="btn btn-grad w-100 mb-2" href="/pages/sessions.html?connection=${esc(d.connectionId)}"><i class="bi bi-calendar-plus me-1"></i>Schedule a session</a><a class="btn btn-light w-100" href="/pages/feedback.html?connection=${esc(d.connectionId)}">Leave feedback</a>`
        : m.relation === 'pending' ? '<button class="btn btn-light w-100" disabled>Request pending</button>'
        : m.isAcceptingMentees && m.spotsLeft > 0 ? '<button class="btn btn-grad w-100" id="reqBtn"><i class="bi bi-send me-1"></i>Send mentorship request</button>'
        : '<button class="btn btn-light w-100" disabled>Not accepting new mentees</button>';
    }
    view.innerHTML = `<a href="/pages/discover.html" class="text-decoration-none small fw-bold"><i class="bi bi-arrow-left"></i> Back to mentors</a>
      <div class="row g-4 mt-1"><div class="col-lg-8">
        <div class="card-soft mb-4"><div class="d-flex gap-3 flex-wrap align-items-center">${UI.avatar(m.name, 'lg')}<div class="flex-grow-1"><h2 class="mb-1 h3">${esc(m.name)}</h2><div class="text-muted-m">${esc(m.headline)}</div>
          <div class="mt-2 small text-muted-m">${m.organization ? `<i class="bi bi-building me-1"></i>${esc(m.organization)}` : ''} ${m.department ? `<i class="bi bi-mortarboard ms-2 me-1"></i>${esc(m.department)}` : ''} <i class="bi bi-briefcase ms-2 me-1"></i>${m.yearsExperience} yr${m.yearsExperience === 1 ? '' : 's'}</div></div>${UI.matchBadge(m.match)}</div>
          <hr><h6>About</h6><p style="white-space:pre-line" class="mb-0">${esc(m.bio)}</p></div>
        <div class="card-soft mb-4"><h6>Expertise & skills</h6>${m.expertise.length ? `<div class="mb-2">${UI.chips(m.expertise, 20, 'chip-teal')}</div>` : ''}<div>${UI.chips(m.skills, 30)}</div>${m.interests.length ? `<h6 class="mt-3">Interests</h6><div>${UI.chips(m.interests, 20)}</div>` : ''}
          ${m.match && m.match.reasons.length ? `<div class="alert alert-success mt-3 mb-0 py-2 small"><i class="bi bi-bullseye me-1"></i>Shared with your interests: <b>${m.match.reasons.map(esc).join(', ')}</b></div>` : ''}</div>
        <div class="card-soft mb-4"><h6 class="mb-3">Weekly availability</h6>${UI.availability(m.availability)}</div>
        <div class="card-soft"><h6 class="mb-3">Reviews</h6>${d.reviews.length ? d.reviews.map((r) => `<div class="list-row"><div>${UI.stars(r.rating)}<div>${esc(r.comment || 'No comment left.')}</div><small class="text-muted-m">${esc(r.from)} · ${esc(UI.ago(r.createdAt))}</small></div></div>`).join('') : '<p class="text-muted-m mb-0">No reviews yet.</p>'}</div>
      </div><div class="col-lg-4"><div class="card-soft" style="position:sticky;top:90px">
        <div class="mb-3">${UI.stars(m.ratingAvg, m.ratingCount)}</div>
        <div class="d-flex justify-content-between small mb-1"><span class="text-muted-m">Mentees</span><b>${m.activeMentees} / ${m.maxMentees}</b></div>
        <div class="d-flex justify-content-between small mb-3"><span class="text-muted-m">Status</span><b>${m.isAcceptingMentees ? '<span class="text-success">Accepting</span>' : 'Full / paused'}</b></div>${isMentee && m.match ? `<div class="mb-3">${UI.mfButtons(m.id, d.myMatchFeedback)}</div>` : ''}${cta}</div></div></div>`;
    $('#reqBtn')?.addEventListener('click', () => UI.requestModal(m.id, m.name, load));
  }
  load();
})();
