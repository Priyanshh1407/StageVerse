// Signing in from the browser (the login page, its demo buttons, and straight after sign-up).

/** Sign in; returns the signed-in user, or throws an Error with a message a person can act on. */
export async function signIn(email, password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 || res.status === 404) throw new Error("That email and password don't match an account. Check them and try again.");
    if (res.status === 429) throw new Error('Too many tries. Please wait a minute and try again.');
    throw new Error(data.message || 'Something went wrong. Please try again.');
  }
  try { localStorage.setItem('user', JSON.stringify(data.user)); } catch { /* private mode: the cookie still signs them in */ }
  return data.user;
}

