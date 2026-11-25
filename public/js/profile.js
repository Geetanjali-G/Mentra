(async () => {
  const view = await Shell.init('profile'); if (!view) return;
  const welcome = new URLSearchParams(location.search).has('welcome');
  let data;
  try { data = await Api.get('/profiles/me'); } catch (e) { view.innerHTML = UI.error(e.message); return; }
  const { user, profile: p } = data; const isMentor = user.role === 'mentor';
  const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const mentorFields = `
    <div class="col-md-6"><label class="form-label">Headline *</label><input class="form-control" name="headline" maxlength="120" value="${esc(p.headline)}" placeholder="e.g. Software engineer, ML enthusiast"></div>
    <div class="col-md-6"><label class="form-label">Organization</label><input class="form-control" name="organization" maxlength="100" value="${esc(p.organization)}" placeholder="Company, lab or college"></div>
    <div class="col-md-6"><label class="form-label">Department / field</label><input class="form-control" name="department" maxlength="80" value="${esc(p.department)}" placeholder="e.g. Computer Science"></div>
    <div class="col-md-6"><label class="form-label">Years of experience</label><input class="form-control" type="number" min="0" max="60" name="yearsExperience" value="${esc(p.yearsExperience)}"></div>
    <div class="col-12"><label class="form-label">Bio *</label><textarea class="form-control" name="bio" rows="4" maxlength="1500" placeholder="What have you worked on, and how can you help students?">${esc(p.bio)}</textarea></div>
    <div class="col-12"><label class="form-label">Expertise areas</label><div id="expertise"></div><div class="form-text">Broad areas students filter by, e.g. Web Development, Data Science. Press Enter to add.</div></div>
    <div class="col-12"><label class="form-label">Skills *</label><div id="skills"></div></div>
    <div class="col-12"><label class="form-label">Interests</label><div id="interests"></div></div>
    <div class="col-md-6"><label class="form-label">Maximum mentees</label><input class="form-control" type="number" min="1" max="50" name="maxMentees" value="${esc(p.maxMentees)}"></div>
    <div class="col-md-6 d-flex align-items-end"><div class="form-check form-switch fs-6"><input class="form-check-input" type="checkbox" role="switch" id="accepting" ${p.isAcceptingMentees ? 'checked' : ''}><label class="form-check-label fw-semibold" for="accepting">Accepting new mentees</label></div></div>
    <div class="col-12"><hr><div class="d-flex justify-content-between align-items-center mb-2"><label class="form-label m-0">Weekly availability</label><button type="button" class="btn btn-soft btn-sm" id="addSlot"><i class="bi bi-plus-lg"></i> Add slot</button></div><div id="slots"></div></div>`;

  const menteeFields = `
    <div class="col-md-6"><label class="form-label">College / university</label><input class="form-control" name="college" maxlength="100" value="${esc(p.college)}"></div>
    <div class="col-md-4"><label class="form-label">Department</label><input class="form-control" name="department" maxlength="80" value="${esc(p.department)}"></div>
    <div class="col-md-2"><label class="form-label">Year</label><select class="form-select" name="year"><option value="">-</option>${[1, 2, 3, 4, 5, 6].map((y) => `<option ${p.year === y ? 'selected' : ''}>${y}</option>`).join('')}</select></div>
    <div class="col-12"><label class="form-label">About you</label><textarea class="form-control" name="bio" rows="3" maxlength="1000">${esc(p.bio)}</textarea></div>
    <div class="col-12"><label class="form-label">Your skills</label><div id="skills"></div><div class="form-text">What you already know. Press Enter to add each one.</div></div>
    <div class="col-12"><label class="form-label">Interests</label><div id="interests"></div><div class="form-text">Topics you want guidance on. These drive your mentor matches.</div></div>
    <div class="col-12"><label class="form-label">Learning goals *</label><textarea class="form-control" name="learningGoals" rows="4" maxlength="1500" placeholder="What do you want to achieve in the next few months?">${esc(p.learningGoals)}</textarea></div>`;

  view.innerHTML = `
    ${welcome ? `<div class="hero-banner"><h1>Welcome to MENTRA, ${esc(user.name.split(' ')[0])}!</h1><p>${isMentor ? 'Complete your mentor profile so students can find you.' : 'Complete your profile to get personalised mentor matches.'}</p></div>` : UI.header('My profile', 'Keep this up to date. It powers discovery and matching.')}
    <div class="card-soft"><form id="profileForm" novalidate><div class="row g-3">
      <div class="col-md-6"><label class="form-label">Full name</label><input class="form-control" name="name" maxlength="80" value="${esc(user.name)}"></div>
      <div class="col-md-6"><label class="form-label">Email</label><input class="form-control" value="${esc(user.email)}" disabled></div>
      ${isMentor ? mentorFields : menteeFields}
    </div><div class="d-flex justify-content-end mt-4"><button class="btn btn-primary px-4" type="submit">${welcome ? 'Save and continue' : 'Save changes'}</button></div></form></div>`;

  const tags = { skills: TagInput.create($('#skills'), { values: p.skills, placeholder: 'e.g. React, Python, Public speaking' }),
    interests: TagInput.create($('#interests'), { values: p.interests, placeholder: 'e.g. Machine learning, Startups' }) };
  if (isMentor) tags.expertise = TagInput.create($('#expertise'), { values: p.expertise, placeholder: 'e.g. Web Development', max: 10 });

  function slotRow(s = { day: 'Mon', start: '16:00', end: '17:00' }) {
    const row = document.createElement('div');
    row.className = 'row g-2 mb-2 slot-row align-items-center';
    row.innerHTML = `<div class="col-5 col-md-4"><select class="form-select">${DAYS.map((d) => `<option value="${d}" ${d === s.day ? 'selected' : ''}>${UI.dayName(d)}</option>`).join('')}</select></div>
      <div class="col-3 col-md-3"><input type="time" class="form-control" value="${esc(s.start)}"></div><div class="col-3 col-md-3"><input type="time" class="form-control" value="${esc(s.end)}"></div>
      <div class="col-1"><button type="button" class="btn btn-sm text-danger" data-rm aria-label="Remove slot"><i class="bi bi-trash"></i></button></div>`;
    return row;
  }
  if (isMentor) {
    (p.availability || []).forEach((s) => $('#slots').appendChild(slotRow(s)));
    $('#addSlot').addEventListener('click', () => $('#slots').appendChild(slotRow()));
    $('#slots').addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (b) b.closest('.slot-row').remove(); });
  }

  const form = $('#profileForm');
  form.addEventListener('submit', async (e) => {
    e.preventDefault(); UI.clearFormError(form);
    const body = { name: form.name.value, bio: form.bio.value, department: form.department.value, skills: tags.skills.get(), interests: tags.interests.get() };
    if (isMentor) {
      Object.assign(body, { headline: form.headline.value, organization: form.organization.value, yearsExperience: form.yearsExperience.value, expertise: tags.expertise.get(), maxMentees: form.maxMentees.value, isAcceptingMentees: $('#accepting').checked,
        availability: $$('.slot-row').map((r) => ({ day: $('select', r).value, start: $$('input', r)[0].value, end: $$('input', r)[1].value })) });
    } else Object.assign(body, { college: form.college.value, year: form.year.value, learningGoals: form.learningGoals.value });
    const btn = $('[type=submit]', form); UI.setBusy(btn, true);
    try {
      const r = await Api.put('/profiles/me', body);
      Toast.show('Profile saved');
      if (r.profileComplete && (welcome || !data.profileComplete)) setTimeout(() => { location.href = '/pages/dashboard.html'; }, 600);
      else UI.setBusy(btn, false);
    } catch (err) { UI.showFormError(form, err.message); Toast.show(err.message, 'error'); UI.setBusy(btn, false); form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
})();
