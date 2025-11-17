// Clicker game with 10s timer, leaderboard via Firestore, and localStorage/cookies for name/highscore
(function () {
  function $(id) { return document.getElementById(id); }
  const elTime = $('time');
  const elScore = $('score');
  const elBest = $('best');
  const elArea = $('area');
  const elName = $('name');
  const elStart = $('start');
  const elSubmit = $('submit');
  const elStatus = $('status');
  const elList = $('list');

  // LocalStorage + cookies helpers
  function getLocal(key, fallback) {
    try { const v = localStorage.getItem(key); return v != null ? JSON.parse(v) : fallback; } catch { return fallback; }
  }
  function setLocal(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
  function setCookie(name, value, days) {
    const d = new Date(); d.setTime(d.getTime() + (days*24*60*60*1000));
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${d.toUTCString()}; path=/`;
  }
  function getCookie(name) {
    return document.cookie.split(';').map(s => s.trim()).filter(s => s.startsWith(name + '=')).map(s => decodeURIComponent(s.split('=')[1]))[0] || '';
  }

  // Prefill player name
  elName.value = getLocal('playerName', '') || getCookie('playerName') || '';
  const bestStored = getLocal('clickerBest', 0); elBest.textContent = bestStored;

  let score = 0;
  let timeLeft = 10.0;
  let running = false;
  let timerId = null;

  function tick() {
    timeLeft = Math.max(0, timeLeft - 0.05);
    elTime.textContent = timeLeft.toFixed(1);
    if (timeLeft <= 0) {
      stop();
      elSubmit.disabled = false;
      elStatus.textContent = 'Time’s up! You can submit your score.';
    } else {
      timerId = setTimeout(tick, 50);
    }
  }

  function start() {
    if (running) return;
    score = 0; timeLeft = 10.0; running = true;
    elScore.textContent = '0'; elTime.textContent = timeLeft.toFixed(1);
    elSubmit.disabled = true; elStatus.textContent = '';
    tick();
  }
  function stop() {
    running = false;
    if (timerId) { clearTimeout(timerId); timerId = null; }
    // best tracking
    const currentBest = getLocal('clickerBest', 0);
    if (score > currentBest) {
      setLocal('clickerBest', score);
      elBest.textContent = String(score);
    }
  }

  elArea.addEventListener('click', () => {
    if (!running) return;
    score += 1;
    elScore.textContent = String(score);
  });
  elStart.addEventListener('click', start);
  elSubmit.addEventListener('click', submitScore);
  elName.addEventListener('input', () => {
    setLocal('playerName', elName.value.trim());
    setCookie('playerName', elName.value.trim(), 365);
  });

  // Firestore leaderboard
  let db = null;
  document.addEventListener('DOMContentLoaded', initDb);

  function initDb() {
    if (typeof firebase === 'undefined' || !firebase.firestore) {
      elStatus.textContent = 'Firebase failed to load.';
      elSubmit.disabled = true;
      return;
    }
    db = firebase.firestore();
    // Live top 10
    db.collection('leaderboard').orderBy('score', 'desc').limit(10).onSnapshot(
      snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        renderLeaderboard(docs);
      },
      err => { elStatus.textContent = 'Leaderboard error: ' + err.message; }
    );
  }

  async function submitScore() {
    const name = (elName.value || '').trim() || 'Anonymous';
    setLocal('playerName', name);
    setCookie('playerName', name, 365);
    elStatus.textContent = 'Submitting…';
    try {
      if (!db) throw new Error('No database');
      // Simple schema: { name, score, at }
      await db.collection('leaderboard').add({
        name,
        score,
        at: firebase.firestore.FieldValue.serverTimestamp(),
      });
      elStatus.textContent = 'Submitted!';
      elSubmit.disabled = true;
    } catch (e) {
      elStatus.textContent = 'Submit failed: ' + e.message;
    }
  }

  function renderLeaderboard(items) {
    elList.innerHTML = '';
    if (!items || !items.length) {
      const row = document.createElement('div');
      row.className = 'row';
      row.innerHTML = '<span class="meta">No scores yet.</span>';
      elList.appendChild(row);
      return;
    }
    let rank = 1;
    for (const it of items) {
      const row = document.createElement('div');
      row.className = 'row';
      const name = it.name || 'Anonymous';
      const at = it.at && it.at.toDate ? it.at.toDate() : null;
      const timeStr = at ? at.toLocaleString() : '';
      row.innerHTML = `<span>#${rank}. ${escapeHtml(name)}</span><span>Score: <strong>${escapeHtml(String(it.score || 0))}</strong></span><span class="meta">${escapeHtml(timeStr)}</span>`;
      elList.appendChild(row);
      rank++;
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
})();


