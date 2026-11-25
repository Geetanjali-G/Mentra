(async () => {
  const view = await Shell.init('dashboard'); if (!view) return;
  view.innerHTML = UI.loading(3);
  let d;
  try { d = await Api.get('/dashboard'); } catch (e) { view.innerHTML = UI.error(e.message); return; }
  const first = esc(ME.name.split(' ')[0]);
  const sessionRows = (list) => list.length ? list.map((s) => { const dt = new Date(s.scheduledAt);
    return `<div class="list-row"><div class="date-block"><div class="d">${dt.getDate()}</div><div class="m">${dt.toLocaleString(undefined, { month: 'short' })}</div></div>
      <div class="flex-grow-1"><div class="fw-bold">${esc(s.title)}</div><small class="text-muted-m">${dt.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} · ${s.durationMin} min · with ${esc(s.person?.name || 'participant')}</small></div><span class="chip">${esc(s.mode)}</span></div>`; }).join('')
    : UI.empty({ icon: 'calendar-event', title: 'No upcoming sessions', text: 'Scheduled sessions will show up here.', action: '<a class="btn btn-soft btn-sm" href="/pages/sessions.html">Open sessions</a>' });
  const notifRows = d.notifications.length ? d.notifications.map((n) => `<a href="${esc(n.link || '/pages/notifications.html')}" class="list-row text-decoration-none text-reset"><div class="flex-grow-1"><div class="fw-semibold ${n.read ? '' : 'text-primary'}">${esc(n.title)}</div><small class="text-muted-m">${esc(UI.ago(n.createdAt))}</small></div></a>`).join('')
    : '<p class="text-muted-m mb-0">You are all caught up.</p>';

  if (d.role === 'mentor') {
    const s = d.stats;
    view.innerHTML = `
      <div class="hero-banner"><h1>Hello, ${first}</h1><p>${s.pendingRequests ? `You have ${s.pendingRequests} student request${s.pendingRequests > 1 ? 's' : ''} waiting for you.` : 'Here is how your mentoring is going.'}</p></div>
      <div class="row g-3 mb-4">
        <div class="col-6 col-xl-3">${UI.stat({ icon: 'inbox', label: 'Pending requests', value: s.pendingRequests, href: '/pages/requests.html', tone: 'amber' })}</div>
        <div class="col-6 col-xl-3">${UI.stat({ icon: 'people', label: 'Active students', value: `${s.activeMentees}<small class="fs-6 text-muted-m">/${s.maxMentees}</small>`, href: '/pages/connections.html', tone: 'primary' })}</div>
        <div class="col-6 col-xl-3">${UI.stat({ icon: 'calendar-event', label: 'Upcoming sessions', value: s.upcomingSessions, href: '/pages/sessions.html', tone: 'teal' })}</div>
        <div class="col-6 col-xl-3">${UI.stat({ icon: 'star', label: 'Average rating', value: s.ratingCount ? s.ratingAvg.toFixed(1) : '-', href: '/pages/feedback.html', tone: 'rose', sub: `${s.ratingCount} review${s.ratingCount === 1 ? '' : 's'}` })}</div>
      </div>
      ${s.accepting ? '' : '<div class="alert alert-warning">You are not accepting new mentees. Students cannot send you requests. <a href="/pages/profile.html">Change this in your profile</a>.</div>'}
      <div class="row g-4"><div class="col-lg-7">
        <div class="card-soft mb-4"><div class="section-title"><h5>Incoming requests</h5><a href="/pages/requests.html" class="small fw-bold text-decoration-none">View all</a></div>
          ${d.pendingRequests.length ? d.pendingRequests.map((r) => `<div class="list-row">${UI.avatar(r.person?.name, 'md')}<div class="flex-grow-1"><div class="fw-bold">${esc(r.person?.name)}</div><small class="text-muted-m">${esc(r.message ? r.message.slice(0, 90) : 'No message')}</small></div>${r.matchScore !== null ? UI.matchBadge({ score: r.matchScore, engine: 'at request time' }) : ''}<a class="btn btn-soft btn-sm" href="/pages/requests.html">Review</a></div>`).join('') : UI.empty({ icon: 'inbox', title: 'No pending requests', text: 'New student requests will appear here.' })}</div>
        <div class="card-soft"><div class="section-title"><h5>Upcoming sessions</h5></div>${sessionRows(d.nextSessions)}</div>
      </div><div class="col-lg-5">
        <div class="card-soft mb-4"><div class="section-title"><h5>Recent reviews</h5></div>
          ${d.reviews.length ? d.reviews.map((r) => `<div class="list-row"><div>${UI.stars(r.rating)}<div class="small">${esc(r.comment || 'No comment')}</div><small class="text-muted-m">${esc(r.from)} · ${esc(UI.ago(r.createdAt))}</small></div></div>`).join('') : '<p class="text-muted-m mb-0">Reviews from students will appear here.</p>'}</div>
        <div class="card-soft"><div class="section-title"><h5>Notifications</h5><a href="/pages/notifications.html" class="small fw-bold text-decoration-none">All</a></div>${notifRows}</div>
      </div></div>`;
    return;
  }

  const s = d.stats;
  view.innerHTML = `
    <div class="hero-banner"><h1>Welcome back, ${first}</h1><p>Keep the momentum going. Your next step is just a click away.</p></div>
    <div class="row g-3 mb-4">
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'people', label: 'Active mentors', value: s.activeMentors, href: '/pages/connections.html', tone: 'primary' })}</div>
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'send', label: 'Pending requests', value: s.pendingRequests, href: '/pages/requests.html', tone: 'amber' })}</div>
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'calendar-event', label: 'Upcoming sessions', value: s.upcomingSessions, href: '/pages/sessions.html', tone: 'teal' })}</div>
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'bullseye', label: 'Average goal progress', value: `${s.avgProgress}%`, href: '/pages/goals.html', tone: 'rose', sub: `${s.goalsCompleted} of ${s.goalsTotal} goals done` })}</div>
    </div>
    <div class="row g-4"><div class="col-lg-8">
      <div class="card-soft mb-4"><div class="section-title"><h5>Recommended mentors</h5><a href="/pages/discover.html" class="small fw-bold text-decoration-none">Browse all</a></div>
        ${d.recommended.length ? d.recommended.map((m) => `<div class="list-row">${UI.avatar(m.name, 'md')}<div class="flex-grow-1"><div class="fw-bold">${esc(m.name)}</div><small class="text-muted-m">${esc(m.headline)}</small><div class="mt-1">${UI.chips(m.skills, 4)}</div></div><div class="text-end">${UI.matchBadge(m.match)}<div class="mt-2"><a class="btn btn-soft btn-sm" href="/pages/mentor.html?id=${esc(m.id)}">View</a></div></div></div>`).join('')
          : UI.empty({ icon: 'compass', title: 'No recommendations yet', text: 'Recommendations are based on your interests and goals compared with mentor profiles. Browse all mentors to get started.', action: '<a class="btn btn-primary btn-sm" href="/pages/discover.html">Discover mentors</a>' })}</div>
      <div class="card-soft"><div class="section-title"><h5>Upcoming sessions</h5></div>${sessionRows(d.nextSessions)}</div>
    </div><div class="col-lg-4">
      <div class="card-soft mb-4"><div class="section-title"><h5>My goals</h5><a href="/pages/goals.html" class="small fw-bold text-decoration-none">Manage</a></div>
        ${d.goals.length ? d.goals.map((g) => `<div class="mb-3"><div class="d-flex justify-content-between"><span class="fw-semibold">${esc(g.title)}</span><small class="text-muted-m">${g.progress}%</small></div><div class="progress mt-1"><div class="progress-bar" style="width:${g.progress}%"></div></div></div>`).join('')
          : UI.empty({ icon: 'bullseye', title: 'Set your first goal', text: 'Goals keep you and your mentor focused.', action: '<a class="btn btn-soft btn-sm" href="/pages/goals.html">Add a goal</a>' })}</div>
      <div class="card-soft"><div class="section-title"><h5>Notifications</h5><a href="/pages/notifications.html" class="small fw-bold text-decoration-none">All</a></div>${notifRows}</div>
    </div></div>`;
})();
