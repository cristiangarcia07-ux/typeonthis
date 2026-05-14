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
