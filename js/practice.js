let currentQuote = null;
let quoteChars = [];
let currentIndex = 0;
let errors = 0;
let startTime = null;
let timerInterval = null;
let isFinished = false;
let elapsedSeconds = 0;

async function loadPractice() {
  if (!currentUser) return;
  const { data, error } = await _sb.rpc('get_random_quote');

  if (error || !data || data.length === 0) {
    document.getElementById('quote-display').innerHTML = 'No quotes available.';
    return;
  }

  currentQuote = data[0];
  quoteChars = currentQuote.content.split('');
  currentIndex = 0;
  errors = 0;
  isFinished = false;
  startTime = null;
  clearInterval(timerInterval);
  elapsedSeconds = 0;

  document.getElementById('practice-wpm').textContent = '0';
  document.getElementById('practice-accuracy').textContent = '100%';
  document.getElementById('practice-timer').textContent = '0s';
  document.getElementById('results-overlay').classList.remove('show');

  renderQuote();
  document.getElementById('practice-input').value = '';
  document.getElementById('practice-input').disabled = false;
  document.getElementById('practice-input').focus();
}

function renderQuote() {
  const container = document.getElementById('quote-display');
  container.innerHTML = quoteChars.map((char, i) => {
    let cls = 'char';
    if (i === currentIndex) cls += ' current';
    return `<span class="${cls}" data-index="${i}">${escapeHtml(char)}</span>`;
  }).join('');
}

function escapeHtml(c) {
  if (c === '<') return '&lt;';
  if (c === '>') return '&gt;';
  if (c === '&') return '&amp;';
  if (c === '"') return '&quot;';
  return c;
}

function handlePracticeInput(e) {
  if (isFinished || !currentUser) return;
  const input = e.target.value;
  const len = input.length;

  if (!startTime && len === 1) {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 200);
  }

  if (len > 0 && len === currentIndex + 1) {
    const typedChar = input[len - 1];
    const expectedChar = quoteChars[currentIndex];
    const span = document.querySelector(`.char[data-index="${currentIndex}"]`);

    if (typedChar === expectedChar) {
      span.classList.add('correct');
    } else {
      span.classList.add('incorrect');
      errors++;
    }

    span.classList.remove('current');
    currentIndex++;

    if (currentIndex < quoteChars.length) {
      const next = document.querySelector(`.char[data-index="${currentIndex}"]`);
      if (next) next.classList.add('current');
      updateStats();
    }

    if (currentIndex === quoteChars.length) {
      finishPractice();
    }
  }

  if (len > currentIndex) {
    e.target.value = input.slice(0, currentIndex);
  }
}

function updateStats() {
  if (!startTime) return;
  const now = Date.now();
  const minutes = (now - startTime) / 60000;
  const wpm = minutes > 0 ? Math.round((currentIndex / 5) / minutes) : 0;
  document.getElementById('practice-wpm').textContent = wpm;
  const accuracy = currentIndex > 0 ? Math.round(((currentIndex - errors) / currentIndex) * 100) : 100;
  document.getElementById('practice-accuracy').textContent = accuracy + '%';
}

function updateTimer() {
  if (!startTime) return;
  elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
  document.getElementById('practice-timer').textContent = elapsedSeconds + 's';
  updateStats();
}

async function finishPractice() {
  isFinished = true;
  clearInterval(timerInterval);
  document.getElementById('practice-input').disabled = true;

  const totalChars = quoteChars.length;
  const accuracy = totalChars > 0 ? Math.round(((totalChars - errors) / totalChars) * 100) : 100;
  const minutes = elapsedSeconds / 60;
  const wpm = minutes > 0 ? Math.round((totalChars / 5) / minutes) : 0;

  document.getElementById('result-wpm').textContent = wpm;
  document.getElementById('result-accuracy').textContent = accuracy + '%';
  document.getElementById('result-time').textContent = elapsedSeconds + 's';
  document.getElementById('result-errors').textContent = errors;
  document.getElementById('results-overlay').classList.add('show');

  if (currentUser && accuracy > 0) {
    await saveResult(currentUser.id, wpm, accuracy);
  }
}

async function saveResult(userId, wpm, accuracy) {
  // Update user_stats
  const { data: stats } = await _sb
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (stats) {
    const newCount = stats.matches_played + 1;
    const newAvg = Math.round(((stats.average_wpm * stats.matches_played) + wpm) / newCount);
    const newTop = Math.max(stats.top_wpm, wpm);
    await _sb
      .from('user_stats')
      .update({ average_wpm: newAvg, top_wpm: newTop, matches_played: newCount })
      .eq('user_id', userId);
  }

  // Update daily_leaderboard
  const today = new Date().toISOString().split('T')[0];
  const { data: daily } = await _sb
    .from('daily_leaderboard')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .single();

  if (daily) {
    const newRaces = daily.races_played + 1;
    const newAvgWpm = Math.round(((daily.wpm * daily.races_played) + wpm) / newRaces);
    const newAcc = Math.round(((daily.accuracy * daily.races_played) + accuracy) / newRaces);
    await _sb
      .from('daily_leaderboard')
      .update({ wpm: newAvgWpm, accuracy: newAcc, races_played: newRaces, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('date', today);
  }

  // Award XP
  const xpGain = Math.round(wpm * accuracy / 1000);
  await _sb.rpc('add_xp', { p_user_id: userId, p_xp: xpGain });
  currentUser.total_xp = (currentUser.total_xp || 0) + xpGain;
}

function newPractice() {
  document.getElementById('results-overlay').classList.remove('show');
  loadPractice();
}
