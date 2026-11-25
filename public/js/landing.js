(async () => {
  $('#yr').textContent = new Date().getFullYear();
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { threshold: 0.12 });
  $$('.reveal').forEach((el) => io.observe(el));

  try { await Api.get('/auth/me'); $('#navActions').innerHTML = '<a class="btn btn-primary" href="/pages/dashboard.html">Open dashboard</a>'; } catch { /* logged out */ }

  // real numbers only; hidden until there is something to show
  try {
    const s = await Api.get('/public/stats');
    if (s.mentors + s.mentees > 0) {
      $('#liveStats').classList.remove('d-none');
      $('#liveStats').innerHTML = [['Mentors', s.mentors], ['Students', s.mentees], ['Mentorships', s.connections]]
        .map(([l, v]) => `<div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div>`).join('');
    }
  } catch { /* stats are optional */ }
})();
