// Alpha-test report access is limited to the emails listed in ALPHA_ADMIN_EMAILS (comma separated).
exports.isAlphaAdmin = (email) =>
  (process.env.ALPHA_ADMIN_EMAILS || '').toLowerCase().split(',').map((s) => s.trim()).filter(Boolean).includes(String(email || '').toLowerCase());
