(function () {
  class ApiError extends Error { constructor(message, status) { super(message); this.status = status; } }

  async function request(method, url, body) {
    let res;
    try {
      res = await fetch('/api' + url, {
        method, credentials: 'same-origin',
        headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
    } catch { throw new ApiError('Cannot reach the server. Check that it is running.', 0); }
    let data = null;
    try { data = await res.json(); } catch { /* empty body */ }
    if (!res.ok) {
      if (res.status === 401 && !document.body.hasAttribute('data-public')) location.replace('/pages/login.html');
      throw new ApiError((data && data.message) || 'Something went wrong', res.status);
    }
    return data;
  }

  window.ApiError = ApiError;
  window.Api = {
    get: (u) => request('GET', u),
    post: (u, b = {}) => request('POST', u, b),
    put: (u, b = {}) => request('PUT', u, b),
    patch: (u, b = {}) => request('PATCH', u, b),
    del: (u) => request('DELETE', u)
  };
  window.qs = (obj) => new URLSearchParams(Object.entries(obj).filter(([, v]) => v !== '' && v !== undefined && v !== null && v !== false)).toString();
})();
