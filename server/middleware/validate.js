const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const OID = /^[a-f\d]{24}$/i;
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function cleanList(v, r, name, errors) {
  if (!Array.isArray(v)) { errors.push(`${name} must be a list`); return v; }
  const seen = new Set(); const out = [];
  for (const item of v) {
    const s = String(item ?? '').trim().slice(0, r.itemMax || 40);
    if (s && !seen.has(s.toLowerCase())) { seen.add(s.toLowerCase()); out.push(s); }
  }
  const max = r.max || 20;
  if (out.length > max) errors.push(`${name} can have at most ${max} items`);
  if (r.required && !out.length) errors.push(`${name} is required`);
  return out;
}

function cleanSlots(v, name, errors) {
  if (!Array.isArray(v) || v.length > 28) { errors.push(`${name} is invalid`); return []; }
  const out = [];
  for (const s of v) {
    if (!s || !DAYS.includes(s.day) || !TIME.test(s.start || '') || !TIME.test(s.end || '') || s.start >= s.end) {
      errors.push(`${name}: every slot needs a day and a start time earlier than its end time`);
      return [];
    }
    out.push({ day: s.day, start: s.start, end: s.end });
  }
  return out;
}

// schema: { field: { type, required, min, max, values, label, integer, itemMax } }
exports.validate = (schema, source = 'body') => (req, res, next) => {
  const data = req[source] || {};
  const errors = [];
  for (const [field, r] of Object.entries(schema)) {
    let v = data[field];
    const name = r.label || field;
    if (v === undefined || v === null || v === '') { if (r.required) errors.push(`${name} is required`); continue; }
    switch (r.type) {
      case 'password':
        if (typeof v !== 'string') { errors.push(`${name} is invalid`); break; }
        if (v.length < (r.min || 8)) errors.push(`${name} must be at least ${r.min || 8} characters`);
        if (v.length > 128) errors.push(`${name} is too long`);
        break;
      case 'string': case 'email': case 'url': case 'enum':
        if (typeof v !== 'string') { errors.push(`${name} is invalid`); break; }
        v = v.trim();
        if (!v) { if (r.required) errors.push(`${name} is required`); break; }
        if (r.min && v.length < r.min) errors.push(`${name} must be at least ${r.min} characters`);
        if (r.max && v.length > r.max) errors.push(`${name} must be at most ${r.max} characters`);
        if (r.type === 'email') { if (!EMAIL.test(v)) errors.push('Enter a valid email address'); v = v.toLowerCase(); }
        if (r.type === 'url' && !/^https?:\/\/[^\s]+$/i.test(v)) errors.push(`${name} must start with http:// or https://`);
        if (r.type === 'enum' && !r.values.includes(v)) errors.push(`${name} is invalid`);
        break;
      case 'number': {
        v = Number(v);
        if (!Number.isFinite(v) || (r.integer && !Number.isInteger(v))) { errors.push(`${name} must be a number`); break; }
        if (r.min !== undefined && v < r.min) errors.push(`${name} must be at least ${r.min}`);
        if (r.max !== undefined && v > r.max) errors.push(`${name} must be at most ${r.max}`);
        break;
      }
      case 'boolean':
        if (v === 'true') v = true; else if (v === 'false') v = false;
        if (typeof v !== 'boolean') errors.push(`${name} must be true or false`);
        break;
      case 'date': {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) errors.push(`${name} is not a valid date`); else v = d;
        break;
      }
      case 'objectId':
        if (typeof v !== 'string' || !OID.test(v)) errors.push(`${name} is invalid`);
        break;
      case 'array': v = cleanList(v, r, name, errors); break;
      case 'slots': v = cleanSlots(v, name, errors); break;
      default: break;
    }
    data[field] = v;
  }
  if (errors.length) return res.status(400).json({ message: errors[0], errors });
  next();
};
