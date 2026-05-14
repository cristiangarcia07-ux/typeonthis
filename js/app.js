let currentUser = null;

function showAuth() {
  document.getElementById('auth-page').classList.add('active');
  document.getElementById('app-shell').style.display = 'none';
}

function showApp() {
  document.getElementById('auth-page').classList.remove('active');
  document.getElementById('app-shell').style.display = 'block';
}

function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));

  const el = document.getElementById('page-' + page);
  if (el) el.classList.add('active');

  const link = document.querySelector(`nav a[data-page="${page}"]`);
  if (link) link.classList.add('active');

  if (page === 'dashboard') loadDashboard();
  if (page === 'leaderboard') loadLeaderboard();
  if (page === 'practice') loadPractice();
}

function toggleAuthMode() {
  const mode = document.getElementById('auth-mode');
  const login = document.getElementById('auth-login');
  const reg = document.getElementById('auth-register');
  const title = document.getElementById('auth-title');
  const err = document.getElementById('auth-error');
  err.textContent = '';
  err.style.color = '#f87171';

  if (mode.textContent === 'Register') {
    mode.textContent = 'Login';
    login.style.display = 'none';
    reg.style.display = 'block';
    title.textContent = 'Create Account';
  } else {
    mode.textContent = 'Register';
    login.style.display = 'block';
    reg.style.display = 'none';
    title.textContent = 'Welcome Back';
  }
}

// Auth state listener
_sb.auth.onAuthStateChange(async (event, session) => {
  if (event === 'SIGNED_IN' && session) {
    currentUser = await fetchProfile(session.user.id);
    if (currentUser) {
      document.getElementById('nav-user').textContent = currentUser.username;
      showApp();
      navigate('practice');
    }
  } else if (event === 'SIGNED_OUT') {
    currentUser = null;
    showAuth();
  }
});

// Init
(async () => {
  const user = await getSessionUser();
  if (user) {
    currentUser = user;
    document.getElementById('nav-user').textContent = user.username;
    showApp();
    navigate('practice');
  } else {
    showAuth();
  }
})();
