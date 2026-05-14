async function register() {
  const username = document.getElementById('reg-username').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const errorEl = document.getElementById('auth-error');

  if (!username || !email || !password) {
    errorEl.textContent = 'All fields are required';
    return;
  }
  if (password.length < 6) {
    errorEl.textContent = 'Password must be at least 6 characters';
    return;
  }

  const { error } = await _sb.auth.signUp({
    email,
    password,
    options: { data: { username } }
  });

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  errorEl.textContent = 'Check your email to confirm registration!';
  errorEl.style.color = '#22c55e';
}

async function login() {
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorEl = document.getElementById('auth-error');

  if (!email || !password) {
    errorEl.textContent = 'All fields are required';
    return;
  }

  const { error } = await _sb.auth.signInWithPassword({ email, password });

  if (error) {
    errorEl.textContent = error.message;
    return;
  }
}

function logout() {
  _sb.auth.signOut();
}

async function fetchProfile(userId) {
  const { data, error } = await _sb
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;
  return data;
}

async function getSessionUser() {
  const { data: { session } } = await _sb.auth.getSession();
  if (!session) return null;

  const profile = await fetchProfile(session.user.id);
  if (!profile) return null;

  return { id: session.user.id, email: session.user.email, ...profile };
}
