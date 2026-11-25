// End-to-end integration check: drives the real HTTP API the same way the frontend does.
// Usage: start the server (npm run dev), then in another terminal:  npm run smoke
// Creates two throw-away accounts (a mentor and a student) with random emails, then walks the whole journey.
const BASE = process.env.BASE_URL || 'http://localhost:5000';

class Client {
  constructor(name) { this.name = name; this.cookie = ''; }
  async call(method, url, body) {
    const res = await fetch(BASE + '/api' + url, {
      method, headers: { 'Content-Type': 'application/json', Cookie: this.cookie }, body: body === undefined ? undefined : JSON.stringify(body)
    });
    const set = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
    const tok = set.map((c) => c.split(';')[0]).find((c) => c.startsWith('mentra_token='));
    if (tok) this.cookie = tok;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { const e = new Error(`${method} ${url} -> ${res.status} ${data.message || ''}`); e.status = res.status; throw e; }
    return data;
  }
}

let passed = 0; let failed = 0;
async function step(name, fn) {
  try { const out = await fn(); passed += 1; console.log(`  PASS  ${name}`); return out; }
  catch (e) { failed += 1; console.log(`  FAIL  ${name}\n        ${e.message}`); return null; }
}
const must = (cond, msg) => { if (!cond) throw new Error(msg); };

(async () => {
  const id = Date.now().toString(36);
  const mentor = new Client('mentor'); const student = new Client('student');
  console.log(`MENTRA smoke test against ${BASE}\n`);

  await step('server is up', async () => must((await mentor.call('GET', '/health')).status === 'ok', 'bad health'));
  await step('register mentor', () => mentor.call('POST', '/auth/register', { name: 'Smoke Mentor', email: `mentor.${id}@example.com`, password: 'password123', role: 'mentor' }));
  await step('register student', () => student.call('POST', '/auth/register', { name: 'Smoke Student', email: `student.${id}@example.com`, password: 'password123', role: 'mentee' }));
  await step('protected route rejects anonymous', async () => { try { await new Client('anon').call('GET', '/dashboard'); throw new Error('allowed'); } catch (e) { must(e.status === 401, e.message); } });
  await step('mentor cannot call student-only API', async () => { try { await mentor.call('GET', '/mentors'); throw new Error('allowed'); } catch (e) { must(e.status === 403, e.message); } });
  await step('mentor saves profile', () => mentor.call('PUT', '/profiles/me', { headline: 'Full stack engineer', bio: 'I build web apps with React and Node.js.', skills: ['React', 'Node.js', 'MongoDB'], expertise: ['Web Development'], interests: [], yearsExperience: 5, maxMentees: 5, isAcceptingMentees: true, availability: [{ day: 'Mon', start: '16:00', end: '17:00' }] }));
  await step('student saves profile', () => student.call('PUT', '/profiles/me', { skills: ['HTML'], interests: ['React', 'Node.js'], learningGoals: 'I want to build and deploy a web app with React and Node.js.' }));

  const mentorId = (await mentor.call('GET', '/auth/me')).user.id;
  const studentId = (await student.call('GET', '/auth/me')).user.id;

  await step('discovery lists the mentor with a real match score', async () => {
    const d = await student.call('GET', '/mentors?q=full');
    const m = d.items.find((x) => x.id === mentorId);
    must(m, 'mentor not listed'); must(m.match && m.match.score > 0, 'no match score'); must(m.match.reasons.length > 0, 'no shared topics');
  });
  await step('student rates the match (alpha feedback)', () => student.call('POST', '/match-feedback', { otherId: mentorId, relevant: true }));
  await step('student sends request', () => student.call('POST', '/requests', { mentorId, message: 'Hello, can you mentor me?' }));
  await step('duplicate pending request is rejected', async () => { try { await student.call('POST', '/requests', { mentorId }); throw new Error('allowed'); } catch (e) { must(e.status === 409, e.message); } });
  const reqId = (await step('mentor sees the request', async () => { const d = await mentor.call('GET', '/requests?status=pending'); must(d.items.length === 1, 'expected 1 request'); return d.items[0].id; }));
  await step('mentor rates the student match', () => mentor.call('POST', '/match-feedback', { otherId: studentId, relevant: true, comment: 'good fit' }));
  await step('mentor accepts', () => mentor.call('PATCH', `/requests/${reqId}/respond`, { action: 'accept' }));
  const connId = await step('connection exists for the student', async () => { const d = await student.call('GET', '/connections'); must(d.items.length === 1, 'no connection'); return d.items[0].id; });

  const when = new Date(Date.now() + 2 * 86400000).toISOString();
  const sessionId = await step('student schedules a session', async () => (await student.call('POST', '/sessions', { connectionId: connId, title: 'First chat', scheduledAt: when, durationMin: 30 })).session._id);
  await step('overlapping session is rejected', async () => { try { await mentor.call('POST', '/sessions', { connectionId: connId, title: 'Clash', scheduledAt: when }); throw new Error('allowed'); } catch (e) { must(e.status === 409, e.message); } });
  await step('mentor completes the session', () => mentor.call('PATCH', `/sessions/${sessionId}`, { status: 'completed' }));
  await step('student rates the session', () => student.call('POST', '/feedback', { connectionId: connId, sessionId, rating: 5, comment: 'Great' }));
  await step('mentor rating updated', async () => { const d = await mentor.call('GET', '/feedback/received'); must(d.summary.count === 1 && d.summary.avg === 5, 'rating not stored'); });

  const goalId = await step('student creates a goal', async () => (await student.call('POST', '/goals', { title: 'Deploy my app' })).goal._id);
  await step('student logs progress', () => student.call('POST', `/goals/${goalId}/progress`, { percent: 40, note: 'API done' }));
  await step('mentor sees the goal and leaves a note', async () => {
    const g = await mentor.call('GET', `/goals?menteeId=${studentId}`); must(g.items[0].progress === 40, 'progress mismatch');
    await mentor.call('POST', `/goals/${goalId}/progress`, { note: 'Nice work' });
  });
  await step('mentor shares a resource', () => mentor.call('POST', '/resources', { title: 'Express docs', url: 'https://expressjs.com', type: 'article', tags: ['node'], sharedWith: studentId }));
  await step('student can read the resource', async () => must((await student.call('GET', '/resources')).items.length === 1, 'resource missing'));

  const kid = await step('mentor publishes a knowledge entry linked to the session', async () => (await mentor.call('POST', '/knowledge', { title: 'Fix CORS errors', problem: 'Browser blocks API calls.', solution: 'Serve the frontend from the same origin or configure cors().', category: 'technical', tags: ['cors', 'express'], sessionId })).id);
  await step('student finds it by searching the solution text', async () => { const d = await student.call('GET', '/knowledge?q=same%20origin'); must(d.items.some((x) => x.id === kid), 'not found'); });
  await step('student marks it helpful; author cannot', async () => {
    must((await student.call('POST', `/knowledge/${kid}/helpful`)).helpful === 1, 'count wrong');
    try { await mentor.call('POST', `/knowledge/${kid}/helpful`); throw new Error('allowed'); } catch (e) { must(e.status === 400, e.message); }
  });
  await step('notifications delivered', async () => must((await mentor.call('GET', '/notifications')).unread > 0, 'none'));
  await step('dashboards load for both roles', async () => { must((await student.call('GET', '/dashboard')).role === 'mentee', 'x'); must((await mentor.call('GET', '/dashboard')).role === 'mentor', 'y'); });
  await step('logout clears the session', async () => { await student.call('POST', '/auth/logout'); student.cookie = ''; try { await student.call('GET', '/dashboard'); throw new Error('allowed'); } catch (e) { must(e.status === 401, e.message); } });

  console.log(`\n${passed} passed, ${failed} failed`);
  console.log('Test accounts were created with random emails (mentor.<id>@example.com). Delete them from MongoDB if you want a clean database.');
  process.exit(failed ? 1 : 0);
})();
