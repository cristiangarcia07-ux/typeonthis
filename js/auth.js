async function signInWithGitHub() {
  const { error } = await _sb.auth.signInWithOAuth({
    provider: 'github',
    options: { redirectTo: window.location.origin }
  });

  if (error) {
    document.getElementById('auth-error').textContent = error.message;
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
