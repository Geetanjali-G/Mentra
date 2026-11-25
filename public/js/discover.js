(async () => {
  const view = await Shell.init('discover'); if (!view) return;
  if (ME.role !== 'mentee') { location.replace('/pages/dashboard.html'); return; }
  const facets = await Api.get('/mentors/facets').catch(() => ({ expertise: [], departments: [] }));
  const opts = (arr, label) => `<option value="">${label}</option>${arr.map((x) => `<option>${esc(x)}</option>`).join('')}`;
  view.innerHTML = `${UI.header('Discover mentors', 'Search real mentors and see how well they fit your goals.')}
    <div class="card-soft mb-4"><div class="row g-2 align-items-end">
      <div class="col-lg-4"><label class="form-label">Search</label><div class="position-relative"><i class="bi bi-search position-absolute text-muted-m" style="left:14px;top:13px"></i><input id="q" class="form-control ps-5" placeholder="Name, skill, headline…"></div></div>
      <div class="col-6 col-lg-2"><label class="form-label">Expertise</label><select id="expertise" class="form-select">${opts(facets.expertise, 'Any')}</select></div>
      <div class="col-6 col-lg-2"><label class="form-label">Department</label><select id="department" class="form-select">${opts(facets.departments, 'Any')}</select></div>
      <div class="col-6 col-lg-2"><label class="form-label">Skills</label><input id="skills" class="form-control" placeholder="React, Python"></div>
      <div class="col-6 col-lg-2"><label class="form-label">Sort by</label><select id="sort" class="form-select"><option value="match">Best match</option><option value="rating">Top rated</option><option value="experience">Most experienced</option><option value="newest">Newest</option></select></div>
      <div class="col-12 d-flex flex-wrap gap-3 align-items-center mt-2">
        <select id="minRating" class="form-select w-auto"><option value="">Any rating</option><option value="3">3+ stars</option><option value="4">4+ stars</option></select>
        <div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="available"><label class="form-check-label" for="available">Accepting mentees only</label></div>
        <button class="btn btn-light btn-sm ms-auto" id="reset"><i class="bi bi-x-circle me-1"></i>Reset</button></div>
    </div></div><div id="results"></div><div id="pager" class="d-flex justify-content-center gap-2 mt-4"></div>`;

  const state = { q: '', expertise: '', department: '', skills: '', minRating: '', available: false, sort: 'match', page: 1 };
  const results = $('#results');
  UI.bindMatchFeedback(results);

  async function load() {
    results.innerHTML = UI.loading(6);
    try {
      const d = await Api.get('/mentors?' + qs(state));
      if (!d.items.length) { results.innerHTML = UI.empty({ icon: 'search', title: 'No mentors found', text: Object.values(state).some((v) => v && v !== 'match' && v !== 1) ? 'Try removing a filter or searching with different words.' : 'No mentors have completed their profile yet. Please check back soon.', action: '<button class="btn btn-soft btn-sm" id="clear2">Clear filters</button>' }); $('#clear2')?.addEventListener('click', reset); $('#pager').innerHTML = ''; return; }
      results.innerHTML = `<p class="text-muted-m small mb-3">${d.total} mentor${d.total === 1 ? '' : 's'} found${d.matchingAvailable ? '' : ' · add interests or goals to your profile to see match scores'}</p><div class="row g-3">${d.items.map(card).join('')}</div>`;
      $('#pager').innerHTML = d.pages > 1 ? `<button class="btn btn-light" ${d.page <= 1 ? 'disabled' : ''} data-page="${d.page - 1}"><i class="bi bi-chevron-left"></i></button><span class="align-self-center text-muted-m">Page ${d.page} of ${d.pages}</span><button class="btn btn-light" ${d.page >= d.pages ? 'disabled' : ''} data-page="${d.page + 1}"><i class="bi bi-chevron-right"></i></button>` : '';
    } catch (e) { results.innerHTML = UI.error(e.message); }
  }

  function card(m) {
    const action = m.relation === 'connected' ? '<a class="btn btn-soft btn-sm flex-fill" href="/pages/connections.html"><i class="bi bi-check2-circle me-1"></i>Connected</a>'
      : m.relation === 'pending' ? '<button class="btn btn-light btn-sm flex-fill" disabled>Request pending</button>'
      : m.isAcceptingMentees ? `<button class="btn btn-primary btn-sm flex-fill" data-request="${esc(m.id)}" data-name="${esc(m.name)}">Send request</button>`
      : '<button class="btn btn-light btn-sm flex-fill" disabled>Not accepting</button>';
    return `<div class="col-md-6 col-xl-4"><div class="mentor-card">
      <div class="d-flex gap-3 align-items-start">${UI.avatar(m.name, 'md')}<div class="flex-grow-1 overflow-hidden"><h6 class="mb-0 text-truncate">${esc(m.name)}</h6><p class="headline text-truncate">${esc(m.headline)}</p><div class="mt-1">${UI.stars(m.ratingAvg, m.ratingCount)}</div></div>${UI.matchBadge(m.match)}</div>
      <p class="bio">${esc(m.bio)}</p>
      <div>${UI.chips(m.skills, 4)}</div>
      <div class="small text-muted-m mt-1">${m.organization ? `<i class="bi bi-building me-1"></i>${esc(m.organization)} · ` : ''}${m.yearsExperience} yr${m.yearsExperience === 1 ? '' : 's'} experience</div>
      ${m.match ? `<div class="mt-3">${UI.mfButtons(m.id, m.myMatchFeedback)}</div>` : ''}
      <div class="foot"><a class="btn btn-light btn-sm" href="/pages/mentor.html?id=${esc(m.id)}">View profile</a>${action}</div></div></div>`;
  }

  function reset() {
    Object.assign(state, { q: '', expertise: '', department: '', skills: '', minRating: '', available: false, sort: 'match', page: 1 });
    ['q', 'expertise', 'department', 'skills', 'minRating', 'sort'].forEach((k) => { $('#' + k).value = state[k]; }); $('#available').checked = false; load();
  }
  const bind = (id, key, ev = 'change') => $('#' + id).addEventListener(ev, (e) => { state[key] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; state.page = 1; load(); });
  $('#q').addEventListener('input', UI.debounce((e) => { state.q = e.target.value; state.page = 1; load(); }));
  $('#skills').addEventListener('input', UI.debounce((e) => { state.skills = e.target.value; state.page = 1; load(); }));
  bind('expertise', 'expertise'); bind('department', 'department'); bind('sort', 'sort'); bind('minRating', 'minRating'); bind('available', 'available');
  $('#reset').addEventListener('click', reset);
  $('#pager').addEventListener('click', (e) => { const b = e.target.closest('[data-page]'); if (b) { state.page = Number(b.dataset.page); load(); window.scrollTo({ top: 0, behavior: 'smooth' }); } });
  results.addEventListener('click', (e) => { const b = e.target.closest('[data-request]'); if (b) UI.requestModal(b.dataset.request, b.dataset.name, load); });
  load();
})();
