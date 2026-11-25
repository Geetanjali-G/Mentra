// Mentor matching.
// Default engine: transparent keyword/topic overlap (no machine learning claimed).
// Optional engine: when AI_ENABLED=true, ai/matcher.py (Python TF-IDF cosine similarity) supplies the
// text-relevance part. If Python is unavailable the service silently falls back to the keyword engine.
// Every result reports which engine produced it.
const { spawn } = require('child_process');
const path = require('path');

const STOP = new Set(('a an and are as at be by for from has have i in is it its me my of on or our so that the their ' +
  'this to want wants was we will with you your about into more learn learning get help how what who why can like ' +
  'become better good very really also just not but if then than them they these those would should could').split(' '));

const tokens = (s = '') => (String(s).toLowerCase().match(/[a-z0-9+#.]{2,}/g) || [])
  .map((t) => t.replace(/^\.+|\.+$/g, '')).filter((t) => t.length > 1 && !STOP.has(t));
const lower = (arr = []) => arr.map((x) => String(x).trim().toLowerCase()).filter(Boolean);

const menteeText = (m) => [m.learningGoals, (m.interests || []).join(' '), (m.skills || []).join(' ')].join(' ');
const mentorText = (p) => [p.headline, p.bio, (p.skills || []).join(' '), (p.expertise || []).join(' '), (p.interests || []).join(' ')].join(' ');
const hasSignal = (m) => !!(m && (m.learningGoals || (m.interests || []).length || (m.skills || []).length));

function keywordRelevance(mentee, mentor) {
  const want = new Set(tokens(menteeText(mentee)));
  if (!want.size) return 0;
  const have = new Set(tokens(mentorText(mentor)));
  let hit = 0;
  want.forEach((t) => { if (have.has(t)) hit += 1; });
  return Math.min(1, hit / Math.min(want.size, 8));
}

function runPython(payload) {
  return new Promise((resolve) => {
    if (process.env.AI_ENABLED !== 'true') return resolve(null);
    const bin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    let out = ''; let done = false; let timer; let child;
    const finish = (v) => { if (!done) { done = true; clearTimeout(timer); resolve(v); } };
    try { child = spawn(bin, [path.join(__dirname, '..', '..', 'ai', 'matcher.py')]); } catch { return resolve(null); }
    timer = setTimeout(() => { try { child.kill(); } catch { /* ignore */ } finish(null); }, 5000);
    child.stdout.on('data', (d) => { out += d; });
    child.on('error', () => finish(null));
    child.on('close', () => { try { finish(JSON.parse(out)); } catch { finish(null); } });
    child.stdin.on('error', () => {});
    child.stdin.end(JSON.stringify(payload));
  });
}

// mentee: MenteeProfile (lean). mentors: MentorProfile[] (lean). Returns Map(mentorUserId -> {score, reasons, engine}) or null.
exports.scoreMany = async (mentee, mentors) => {
  if (!hasSignal(mentee) || !mentors.length) return null;
  const idOf = (m) => String((m.user && m.user._id) || m.user);
  const py = await runPython({ mentee: menteeText(mentee), mentors: mentors.map((m) => ({ id: idOf(m), text: mentorText(m) })) });
  const sims = py && Array.isArray(py.scores) ? new Map(py.scores.map((s) => [String(s.id), s.similarity])) : null;

  const wantTopics = [...new Set(lower((mentee.interests || []).length ? mentee.interests : mentee.skills))];
  const out = new Map();
  for (const m of mentors) {
    const id = idOf(m);
    const original = new Map();
    [...(m.skills || []), ...(m.expertise || []), ...(m.interests || [])].forEach((x) => original.set(String(x).trim().toLowerCase(), x));
    const matched = wantTopics.filter((t) => original.has(t));
    const topic = wantTopics.length ? Math.min(1, matched.length / Math.min(wantTopics.length, 5)) : 0;
    // TF-IDF cosine similarity of 0.5+ is treated as a full text match
    const relevance = sims && sims.has(id) ? Math.min(1, sims.get(id) / 0.5) : keywordRelevance(mentee, m);
    const exp = Math.min(m.yearsExperience || 0, 10) / 10;
    const rating = m.ratingCount > 0 ? m.ratingAvg / 5 : 0;
    const score = Math.round(100 * (0.45 * topic + 0.35 * relevance + 0.10 * exp + 0.10 * rating));
    out.set(id, { score, reasons: matched.map((t) => original.get(t)), engine: sims ? 'python-tfidf' : 'keyword-overlap' });
  }
  return out;
};

exports.scoreOne = async (mentee, mentor) => {
  const map = await exports.scoreMany(mentee, [mentor]);
  return map ? [...map.values()][0] : null;
};
exports.hasSignal = hasSignal;
