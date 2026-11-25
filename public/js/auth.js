(async () => {
  try {
    const { user } = await Api.get('/auth/me');
    $('#authForm').outerHTML = `
      <div class="alert alert-info">You are logged in as <b>${esc(user.name)}</b> (${esc(user.role)}).</div>
      <a class="btn btn-primary w-100 mb-2" href="/pages/dashboard.html">Go to dashboard</a>
      <button class="btn btn-light w-100" id="switchBtn">Log out and use another account</button>`;
    $('#switchBtn').addEventListener('click', async () => { await Api.post('/auth/logout'); location.reload(); });
    return;
  } catch { /* not logged in, show the form */ }
  const form = $('#authForm');
  const register = form.dataset.mode === 'register';
  const preset = new URLSearchParams(location.search).get('role');
  if (register && ['mentee', 'mentor'].includes(preset)) $(`#r-${preset}`).checked = true;

  form.addEventListener('submit', async (e) => {
    e.preventDefault(); UI.clearFormError(form);
    const btn = $('[type=submit]', form);
    const body = { email: form.email.value, password: form.password.value };
    if (register) { body.name = form.name.value; body.role = form.role.value; }
    UI.setBusy(btn, true);
    try {
      const r = await Api.post(register ? '/auth/register' : '/auth/login', body);
      location.href = r.profileComplete ? '/pages/dashboard.html' : '/pages/profile.html?welcome=1';
    } catch (err) { UI.showFormError(form, err.message); UI.setBusy(btn, false); }
  });
})();
