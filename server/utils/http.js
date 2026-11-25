exports.wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
exports.fail = (status, message) => Object.assign(new Error(message), { status });
exports.escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
exports.str = (v) => (typeof v === 'string' ? v.trim() : '');
