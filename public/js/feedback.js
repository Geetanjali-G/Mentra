(async () => {
  const view = await Shell.init('feedback'); if (!view) return;
  const isMentor = ME.role === 'mentor';

  if (isMentor) {
    view.innerHTML = UI.loading(2);
    try {
      const d = await Api.get('/feedback/received'); const s = d.summary;
      view.innerHTML = `${UI.header('Reviews', 'What your students say about mentoring with you.')}
        <div class="row g-4"><div class="col-lg-4"><div class="card-soft text-center"><div class="display-4 fw-bold">${s.count ? s.avg.toFixed(1) : '-'}</div>${UI.stars(s.avg)}<div class="text-muted-m small mt-1 mb-3">${s.count} review${s.count === 1 ? '' : 's'}</div>
          ${[5, 4, 3, 2, 1].map((n) => { const c = s.distribution.find((x) => x.stars === n).count; return `<div class="d-flex align-items-center gap-2 small mb-1"><span style="width:14px">${n}</span><i class="bi bi-star-fill stars"></i><div class="progress flex-grow-1" style="height:7px"><div class="progress-bar" style="width:${s.count ? (c / s.count) * 100 : 0}%"></div></div><span class="text-muted-m" style="width:22px">${c}</span></div>`; }).join('')}</div></div>
          <div class="col-lg-8">${d.items.length ? d.items.map((r) => `<div class="card-soft mb-3"><div class="d-flex justify-content-between">${UI.stars(r.rating)}<small class="text-muted-m">${esc(UI.ago(r.createdAt))}</small></div><p class="my-2">${esc(r.comment || 'No comment left.')}</p><small class="text-muted-m">${esc(r.from)}</small></div>`).join('') : UI.empty({ icon: 'star', title: 'No reviews yet', text: 'Students can rate you after a session. Reviews appear here.' })}</div></div>`;
    } catch (e) { view.innerHTML = UI.error(e.message); }
    return;
  }

  const params = new URLSearchParams(location.search);
  let d; let rating = 0;
  async function load() {
    try { d = await Api.get('/feedback/mine'); } catch (e) { view.innerHTML = UI.error(e.message); return; }
    if (!d.connections.length) { view.innerHTML = UI.header('Feedback', 'Rate your mentors after working with them.') + UI.empty({ icon: 'star', title: 'No mentors to rate yet', text: 'Once a mentor accepts your request, you can leave feedback here.', action: '<a class="btn btn-primary" href="/pages/discover.html">Discover mentors</a>' }); return; }
    const pre = params.get('connection') || d.connections[0].id;
    view.innerHTML = `${UI.header('Feedback', 'Your honest feedback helps mentors improve and guides other students.')}
      <div class="row g-4"><div class="col-lg-5"><div class="card-soft"><h5 class="mb-3">Rate a mentor</h5><form id="fbForm" novalidate>
        <div class="mb-3"><label class="form-label">Mentor</label><select class="form-select" name="connectionId">${d.connections.map((c) => `<option value="${c.id}" ${c.id === pre ? 'selected' : ''}>${esc(c.mentor?.name)}${c.status !== 'active' ? ' (ended)' : ''}</option>`).join('')}</select></div>
        <div class="mb-3"><label class="form-label">About</label><select class="form-select" name="sessionId"></select></div>
        <div class="mb-3"><label class="form-label d-block">Rating</label><div class="star-input">${[1, 2, 3, 4, 5].map((n) => `<button type="button" data-star="${n}" aria-label="${n} star${n > 1 ? 's' : ''}"><i class="bi bi-star-fill"></i></button>`).join('')}</div></div>
        <div class="mb-3"><label class="form-label">Comment</label><textarea class="form-control" name="comment" rows="4" maxlength="1000" placeholder="What went well? What could be better?"></textarea></div>
        <button class="btn btn-primary w-100" type="submit">Submit feedback</button></form></div></div>
        <div class="col-lg-7"><h5 class="mb-3">Feedback you've given</h5>${d.given.length ? d.given.map((g) => `<div class="card-soft mb-3"><div class="d-flex justify-content-between">${UI.stars(g.rating)}<small class="text-muted-m">${esc(UI.date(g.createdAt))}</small></div><div class="fw-semibold mt-1">${esc(g.mentor)}</div><div class="small text-muted-m">${esc(g.comment || 'No comment')}</div></div>`).join('') : UI.empty({ icon: 'chat-heart', title: 'Nothing yet', text: 'Your submitted feedback will appear here.' })}</div></div>`;

    const form = $('#fbForm'); rating = 0;
    const fillSessions = (selectedSession) => {
      const sess = d.sessions.filter((s) => s.connectionId === form.connectionId.value);
      form.sessionId.innerHTML = `<option value="">Overall experience</option>${sess.map((s) => `<option value="${s.id}" ${s.id === selectedSession ? 'selected' : ''}>${esc(s.title)} · ${esc(UI.date(s.scheduledAt))}</option>`).join('')}`;
    };
    fillSessions(params.get('session'));
    form.connectionId.addEventListener('change', () => fillSessions());
    $('.star-input').addEventListener('click', (e) => { const b = e.target.closest('[data-star]'); if (!b) return; rating = Number(b.dataset.star); $$('.star-input button').forEach((x) => x.classList.toggle('on', Number(x.dataset.star) <= rating)); });
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); UI.clearFormError(form);
      if (!rating) { UI.showFormError(form, 'Please choose a star rating'); return; }
      const btn = $('[type=submit]', form); UI.setBusy(btn, true);
      try { await Api.post('/feedback', { connectionId: form.connectionId.value, sessionId: form.sessionId.value, rating, comment: form.comment.value }); Toast.show('Thanks for your feedback!'); params.delete('session'); await load(); }
      catch (err) { UI.showFormError(form, err.message); UI.setBusy(btn, false); }
    });
  }
  load();
})();
