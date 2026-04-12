const form = document.getElementById('form');
const statusEl = document.getElementById('status');
const output = document.getElementById('output');
const jsonEl = document.getElementById('json');
const submitBtn = document.getElementById('submit');

/** Empty in dev (uses Vite proxy). Set in production, e.g. https://api.example.com */
const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '');

function apiUrl(path) {
  return `${API_BASE}${path}`;
}

function setStatus(kind, message) {
  statusEl.hidden = false;
  statusEl.className = `status is-${kind}`;
  statusEl.textContent = message;
}

function clearStatus() {
  statusEl.hidden = true;
  statusEl.textContent = '';
  statusEl.className = 'status';
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearStatus();
  output.hidden = true;

  const deployment = document.getElementById('deployment').value.trim();
  const region = document.getElementById('region').value.trim();
  const username = document.getElementById('username').value.trim();
  const password = document.getElementById('password').value;

  const body = {
    deployment,
    username,
    password
  };
  if (region) {
    body.region = region;
  }

  submitBtn.disabled = true;
  setStatus('loading', 'Calling API…');

  try {
    const res = await fetch(apiUrl('/api/alta/firewall-ips'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const msg = data.message || data.error || res.statusText || 'Request failed';
      setStatus('error', msg);
      jsonEl.textContent = typeof data === 'object' ? JSON.stringify(data, null, 2) : text;
      output.hidden = false;
      return;
    }

    clearStatus();
    jsonEl.textContent = JSON.stringify(data, null, 2);
    output.hidden = false;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    setStatus('error', `Network error: ${message}`);
  } finally {
    submitBtn.disabled = false;
  }
});
