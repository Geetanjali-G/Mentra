(async () => {
  const view = await Shell.init('alpha'); if (!view) return;
  view.innerHTML = UI.loading(3);
  let r;
  try { r = await Api.get('/alpha/report'); } catch (e) { view.innerHTML = UI.header('Alpha report') + UI.empty({ icon: 'lock', title: 'Not available', text: e.message }); return; }
  const pct = (v) => (v === null ? '-' : `${v}%`);
  const rows = (list) => list.length ? list.map((x) => `<div class="list-row py-2"><div class="flex-grow-1 small"><b>${esc(x.mentee || '?')}</b> ↔ <b>${esc(x.mentor || '?')}</b> <span class="chip m-0">${x.score}%</span> <span class="chip m-0">${esc(x.raterRole)} rated</span>
    <div class="text-muted-m">${esc(x.comment || 'No comment')}${x.reasons.length ? ` · shared: ${x.reasons.map(esc).join(', ')}` : ''}</div></div></div>`).join('') : '<p class="small text-muted-m mb-0">None yet.</p>';
  view.innerHTML = `${UI.header('Alpha test report', 'How accurate is matching, according to the people using it?', '<a class="btn btn-primary" href="/api/alpha/export.csv"><i class="bi bi-download me-1"></i>Export CSV</a>')}
    ${r.total ? '' : '<div class="alert alert-info">No ratings yet. Ask testers to use the thumbs up/down on mentor cards, mentor profiles and incoming requests.</div>'}
    <div class="row g-3 mb-4">
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'chat-square-text', label: 'Ratings collected', value: r.total, tone: 'primary' })}</div>
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'people', label: 'Testers who rated', value: r.raters, tone: 'teal' })}</div>
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'bullseye', label: 'Matches rated good', value: pct(r.precision), tone: 'amber', sub: 'precision' })}</div>
      <div class="col-6 col-xl-3">${UI.stat({ icon: 'graph-up', label: 'Avg score: good vs not', value: `${r.avgScoreRelevant ?? '-'} / ${r.avgScoreNotRelevant ?? '-'}`, tone: 'rose', sub: 'good should be higher' })}</div></div>
    <div class="row g-4"><div class="col-lg-6"><div class="card-soft mb-4"><h5 class="mb-1">Does a higher score mean a better match?</h5><p class="small text-muted-m">The share rated good should rise from low to high scores. If it does not, the weights need tuning.</p>
      ${r.buckets.map((b) => `<div class="mb-3"><div class="d-flex justify-content-between small"><span>${esc(b.label)} · ${b.n} rating${b.n === 1 ? '' : 's'}</span><b>${pct(b.relevantPct)} good</b></div><div class="progress"><div class="progress-bar" style="width:${b.relevantPct || 0}%"></div></div></div>`).join('')}</div>
      <div class="card-soft"><h5 class="mb-3">By who rated / engine</h5>${[...r.byRater, ...r.byEngine].map((g) => `<div class="d-flex justify-content-between small py-1 border-bottom"><span>${esc(g.name)} (${g.n})</span><b>${pct(g.precision)} good</b></div>`).join('') || '<p class="small text-muted-m mb-0">No data.</p>'}</div></div>
    <div class="col-lg-6"><div class="card-soft mb-4"><h5>High score, rated not relevant</h5><p class="small text-muted-m">False positives: the system was confident but wrong.</p>${rows(r.falsePositives)}</div>
      <div class="card-soft"><h5>Low score, rated relevant</h5><p class="small text-muted-m">False negatives: good matches the system missed.</p>${rows(r.falseNegatives)}</div></div></div>`;
})();
