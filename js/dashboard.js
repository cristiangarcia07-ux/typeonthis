async function loadDashboard() {
  if (!currentUser) return;

  document.getElementById('dash-username').textContent = currentUser.username;

  const { data: stats } = await _sb
    .from('user_stats')
    .select('*')
    .eq('user_id', currentUser.id)
    .single();

  if (stats) {
    document.getElementById('dash-avg-wpm').textContent = stats.average_wpm || 0;
    document.getElementById('dash-top-wpm').textContent = stats.top_wpm || 0;
    document.getElementById('dash-matches').textContent = stats.matches_played || 0;
  }

  document.getElementById('dash-xp').textContent = currentUser.total_xp || 0;
  document.getElementById('dash-level').textContent = Math.floor((currentUser.total_xp || 0) / 500) + 1;

  const today = new Date().toISOString().split('T')[0];
  const { data: todayStats } = await _sb
    .from('daily_leaderboard')
    .select('*')
    .eq('user_id', currentUser.id)
    .eq('date', today)
    .single();

  if (todayStats) {
    document.getElementById('dash-today-wpm').textContent = todayStats.wpm || 0;
    document.getElementById('dash-today-races').textContent = todayStats.races_played || 0;
    document.getElementById('dash-today-acc').textContent = Math.round(todayStats.accuracy || 0) + '%';
  } else {
    document.getElementById('dash-today-wpm').textContent = '0';
    document.getElementById('dash-today-races').textContent = '0';
    document.getElementById('dash-today-acc').textContent = '0%';
  }
}

async function loadLeaderboard() {
  const activeTab = document.querySelector('.tabs .tab.active');
  const period = activeTab ? activeTab.dataset.period : 'daily';

  document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="5" class="loading">Loading...</td></tr>';

  let data;
  if (period === 'daily') {
    const today = new Date().toISOString().split('T')[0];
    const res = await _sb
      .from('daily_leaderboard')
      .select('user_id, wpm, accuracy, races_played, users(username)')
      .eq('date', today)
      .order('wpm', { ascending: false })
      .limit(20);
    data = res.data;
  } else {
    const res = await _sb
      .from('user_stats')
      .select('user_id, average_wpm, top_wpm, matches_played, users(username)')
      .order('average_wpm', { ascending: false })
      .limit(20);
    data = res.data;
  }

  if (!data || data.length === 0) {
    document.getElementById('leaderboard-body').innerHTML = '<tr><td colspan="5" class="loading">No data yet</td></tr>';
    return;
  }

  const html = data.map((row, i) => {
    const rank = i + 1;
    const rankClass = rank <= 3 ? `rank rank-${rank}` : 'rank';
    const name = row.users?.username || 'Unknown';
    const isMe = currentUser && row.user_id === currentUser.id;
    return `<tr${isMe ? ' style="background:#1e293b;font-weight:600"' : ''}>
      <td><span class="${rankClass}">#${rank}</span></td>
      <td>${name}</td>
      <td>${period === 'daily' ? row.wpm : row.average_wpm}</td>
      <td>${row.accuracy || row.top_wpm || 0}</td>
      <td>${period === 'daily' ? row.races_played : row.matches_played}</td>
    </tr>`;
  }).join('');

  document.getElementById('leaderboard-body').innerHTML = html;
}

function switchLeaderboard(el, period) {
  document.querySelectorAll('.tabs .tab').forEach(t => t.classList.remove('active'));
  el.classList.add('active');
  loadLeaderboard();
}
