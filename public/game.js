// ─── game.js ─────────────────────────────────────────────────────────────────
// Dots & Boxes game engine + canvas rendering + bot AI
// ─────────────────────────────────────────────────────────────────────────────

// Global game state — read by matchmaking.js, ui.js
window.G = {
  size:   4,     // grid size (dots per side)
  hL:     [],    // horizontal lines [row][col] = 0|1|2
  vL:     [],    // vertical lines   [row][col] = 0|1|2
  boxes:  [],    // boxes [row][col]  = 0|1|2
  scores: [0,0], // [p1score, p2score]
  turn:   1,     // whose turn: 1 or 2
  myPN:   1,     // this client's player number
  vsBot:  false,
  isPvP:  false,
  isFree: false,
  over:   false,
  sz:     4,     // selected staked grid size
  freeSz: 4      // selected free grid size
};

let _history = []; // for undo

const _cv = document.getElementById('C');
const _cx = _cv.getContext('2d');
let CELL, OX, OY;

const px = c => OX + c * CELL;
const py = r => OY + r * CELL;

// ─────────────────────────────────────────────────────────────────────────────
//  Init / Reset game state
// ─────────────────────────────────────────────────────────────────────────────
function initGame() {
  const n = window.G.size;
  window.G.hL    = Array.from({ length: n },     () => new Array(n - 1).fill(0));
  window.G.vL    = Array.from({ length: n - 1 }, () => new Array(n).fill(0));
  window.G.boxes = Array.from({ length: n - 1 }, () => new Array(n - 1).fill(0));
  window.G.scores = [0, 0];
  window.G.turn   = 1;
  window.G.over   = false;
  _history = [];
  updateScore();
  updateTurn();
  resizeCanvas();
  renderBoard();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Canvas resize
// ─────────────────────────────────────────────────────────────────────────────
function resizeCanvas() {
  const wrap = document.querySelector('.canvas-wrap');
  const mx   = Math.min(wrap.clientWidth - 14, wrap.clientHeight - 14, 390);
  const n    = window.G.size;
  CELL = Math.floor((mx - 30) / (n - 1));
  _cv.width = _cv.height = CELL * (n - 1) + 30;
  OX = OY = 15;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Render board
// ─────────────────────────────────────────────────────────────────────────────
function renderBoard() {
  const n = window.G.size;
  _cx.clearRect(0, 0, _cv.width, _cv.height);

  // Box fills
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      if (!window.G.boxes[r][c]) continue;
      const owner = window.G.boxes[r][c];
      _cx.fillStyle = owner === 1 ? 'rgba(0,255,136,.15)' : 'rgba(255,0,102,.15)';
      _cx.beginPath(); _cx.roundRect(px(c) + 2, py(r) + 2, CELL - 4, CELL - 4, 3); _cx.fill();
      _cx.fillStyle = owner === 1 ? 'rgba(0,255,136,.5)' : 'rgba(255,0,102,.5)';
      _cx.font = `700 ${Math.max(8, CELL / 4)}px IBM Plex Mono`;
      _cx.textAlign = 'center'; _cx.textBaseline = 'middle';
      _cx.fillText('■', px(c) + CELL / 2, py(r) + CELL / 2);
    }
  }

  // Lines
  for (let r = 0; r < n; r++)     for (let c = 0; c < n - 1; c++) drawLine(px(c), py(r), px(c + 1), py(r), window.G.hL[r][c]);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++)     drawLine(px(c), py(r), px(c),     py(r + 1), window.G.vL[r][c]);

  // Dots
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      _cx.fillStyle = '#2a2a42'; _cx.beginPath(); _cx.arc(px(c), py(r), 5.5, 0, Math.PI * 2); _cx.fill();
      _cx.fillStyle = '#7070a0'; _cx.beginPath(); _cx.arc(px(c), py(r), 3.5, 0, Math.PI * 2); _cx.fill();
    }
  }
}

function drawLine(x1, y1, x2, y2, v, hover, hoverColor) {
  if (hover) {
    _cx.strokeStyle = hoverColor; _cx.lineWidth = 3.5; _cx.lineCap = 'square';
    _cx.shadowColor = hoverColor; _cx.shadowBlur = 12; _cx.setLineDash([]);
    _cx.beginPath(); _cx.moveTo(x1, y1); _cx.lineTo(x2, y2); _cx.stroke(); _cx.shadowBlur = 0;
    return;
  }
  if (!v) {
    _cx.strokeStyle = 'rgba(255,255,255,.05)'; _cx.lineWidth = 1.5; _cx.setLineDash([3, 4]);
    _cx.beginPath(); _cx.moveTo(x1, y1); _cx.lineTo(x2, y2); _cx.stroke(); _cx.setLineDash([]);
    return;
  }
  const col = v === 1 ? '#00ff88' : '#ff0066';
  _cx.strokeStyle = col; _cx.lineWidth = 3.5; _cx.lineCap = 'square';
  _cx.shadowColor = col; _cx.shadowBlur = 8; _cx.setLineDash([]);
  _cx.beginPath(); _cx.moveTo(x1, y1); _cx.lineTo(x2, y2); _cx.stroke(); _cx.shadowBlur = 0;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Input handling
// ─────────────────────────────────────────────────────────────────────────────
function getPointer(e) {
  const rect = _cv.getBoundingClientRect();
  const t    = e.touches ? e.touches[0] || e.changedTouches[0] : e;
  return {
    x: (t.clientX - rect.left) * (_cv.width  / rect.width),
    y: (t.clientY - rect.top)  * (_cv.height / rect.height)
  };
}

function nearestLine(mx, my) {
  const n = window.G.size;
  let best = null, bestDist = 16;

  function check(t, r, c, x1, y1, x2, y2) {
    const d = ptSegDist(mx, my, x1, y1, x2, y2);
    if (d < bestDist) { bestDist = d; best = { t, r, c }; }
  }

  for (let r = 0; r < n; r++)     for (let c = 0; c < n - 1; c++) if (!window.G.hL[r][c]) check('h', r, c, px(c), py(r), px(c + 1), py(r));
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++)     if (!window.G.vL[r][c]) check('v', r, c, px(c), py(r), px(c),     py(r + 1));

  return best;
}

function ptSegDist(mx, my, x1, y1, x2, y2) {
  const dx = x2 - x1, dy = y2 - y1;
  const t  = Math.max(0, Math.min(1, ((mx - x1) * dx + (my - y1) * dy) / (dx * dx + dy * dy)));
  return Math.sqrt((mx - x1 - t * dx) ** 2 + (my - y1 - t * dy) ** 2);
}

_cv.addEventListener('click', handleTap);
_cv.addEventListener('touchend', e => { e.preventDefault(); handleTap(e); }, { passive: false });

function handleTap(e) {
  if (window.G.over) return;
  if (window.G.vsBot && window.G.turn === 2) return;
  if (!window.G.vsBot && window.G.turn !== window.G.myPN) return;
  const p = getPointer(e), l = nearestLine(p.x, p.y);
  if (l) applyMove(l.t, l.r, l.c, window.G.myPN, true);
}

_cv.addEventListener('mousemove', e => {
  if (window.G.over) return;
  if (window.G.vsBot && window.G.turn === 2) return;
  if (!window.G.vsBot && window.G.turn !== window.G.myPN) return;
  const p = getPointer(e), l = nearestLine(p.x, p.y);
  renderBoard();
  if (l) {
    const hc = window.G.myPN === 1 ? 'rgba(0,255,136,.7)' : 'rgba(255,0,102,.7)';
    if (l.t === 'h') drawLine(px(l.c), py(l.r), px(l.c + 1), py(l.r), 0, true, hc);
    else             drawLine(px(l.c), py(l.r), px(l.c),     py(l.r + 1), 0, true, hc);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
//  Apply a move (local or remote)
//  local = true means we send it to opponent via Ably
// ─────────────────────────────────────────────────────────────────────────────
function applyMove(t, r, c, playerNum, local) {
  if (t === 'h') window.G.hL[r][c] = playerNum;
  else           window.G.vL[r][c] = playerNum;

  _history.push({ t, r, c, p: playerNum });

  const closed = closeBoxes(playerNum);
  window.G.scores[playerNum - 1] += closed;
  updateScore();

  const total = (window.G.size - 1) * (window.G.size - 1);
  if (window.G.scores[0] + window.G.scores[1] === total) {
    if (local && !window.G.vsBot) netSend(t, r, c, playerNum);
    endGame();
    return;
  }

  if (!closed) window.G.turn = window.G.turn === 1 ? 2 : 1;
  updateTurn();
  renderBoard();

  if (local && !window.G.vsBot) netSend(t, r, c, playerNum);
  if (window.G.vsBot && window.G.turn === 2 && !window.G.over) setTimeout(botMove, 540);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Check + claim completed boxes for playerNum, return count closed
// ─────────────────────────────────────────────────────────────────────────────
function closeBoxes(p) {
  const n = window.G.size;
  let closed = 0;
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      if (!window.G.boxes[r][c] &&
          window.G.hL[r][c] && window.G.hL[r + 1][c] &&
          window.G.vL[r][c] && window.G.vL[r][c + 1]) {
        window.G.boxes[r][c] = p;
        closed++;
      }
    }
  }
  return closed;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Undo (bot mode only)
// ─────────────────────────────────────────────────────────────────────────────
function doUndo() {
  if (!_history.length) return;
  if (_history[_history.length - 1]?.p === 2) _history.pop();
  if (_history.length) _history.pop();
  const n = window.G.size, saved = [..._history];
  window.G.hL    = Array.from({ length: n },     () => new Array(n - 1).fill(0));
  window.G.vL    = Array.from({ length: n - 1 }, () => new Array(n).fill(0));
  window.G.boxes = Array.from({ length: n - 1 }, () => new Array(n - 1).fill(0));
  window.G.scores = [0, 0]; _history = [];
  saved.forEach(mv => {
    if (mv.t === 'h') window.G.hL[mv.r][mv.c] = mv.p;
    else              window.G.vL[mv.r][mv.c] = mv.p;
    window.G.scores[mv.p - 1] += closeBoxes(mv.p);
    _history.push(mv);
  });
  window.G.turn = 1; window.G.over = false;
  updateScore(); updateTurn(); renderBoard();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Bot AI (3-tier: take box → safe move → any move)
// ─────────────────────────────────────────────────────────────────────────────
function adjacentCount(t, r, c) {
  const n = window.G.size;
  const adj = [];
  if (t === 'h') {
    if (r > 0)     adj.push([r - 1, c]);
    if (r < n - 1) adj.push([r, c]);
  } else {
    if (c > 0)     adj.push([r, c - 1]);
    if (c < n - 1) adj.push([r, c]);
  }
  return adj.filter(([br, bc]) =>
    (window.G.hL[br][bc] ? 1 : 0) + (window.G.hL[br + 1][bc] ? 1 : 0) +
    (window.G.vL[br][bc] ? 1 : 0) + (window.G.vL[br][bc + 1] ? 1 : 0)
  );
}

function wouldClose(t, r, c)      { return adjacentCount(t, r, c).some(([br, bc]) => sideCount(br, bc) === 3); }
function wouldGive(t, r, c)       { return adjacentCount(t, r, c).some(([br, bc]) => sideCount(br, bc) === 2); }
function sideCount(br, bc)        { return (window.G.hL[br][bc]?1:0)+(window.G.hL[br+1][bc]?1:0)+(window.G.vL[br][bc]?1:0)+(window.G.vL[br][bc+1]?1:0); }

function botMove() {
  if (window.G.over) return;
  const n = window.G.size;
  const all = [];

  // Tier 1: take a box
  for (let r = 0; r < n; r++)     for (let c = 0; c < n - 1; c++) if (!window.G.hL[r][c] && wouldClose('h', r, c)) return applyMove('h', r, c, 2, false);
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++)     if (!window.G.vL[r][c] && wouldClose('v', r, c)) return applyMove('v', r, c, 2, false);

  // Tier 2: safe move (doesn't give opponent a box)
  const safe = [];
  for (let r = 0; r < n; r++)     for (let c = 0; c < n - 1; c++) if (!window.G.hL[r][c] && !wouldGive('h', r, c)) safe.push({ t: 'h', r, c });
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++)     if (!window.G.vL[r][c] && !wouldGive('v', r, c)) safe.push({ t: 'v', r, c });
  if (safe.length) { const m = safe[~~(Math.random() * safe.length)]; return applyMove(m.t, m.r, m.c, 2, false); }

  // Tier 3: any move
  for (let r = 0; r < n; r++)     for (let c = 0; c < n - 1; c++) if (!window.G.hL[r][c]) all.push({ t: 'h', r, c });
  for (let r = 0; r < n - 1; r++) for (let c = 0; c < n; c++)     if (!window.G.vL[r][c]) all.push({ t: 'v', r, c });
  if (all.length) { const m = all[~~(Math.random() * all.length)]; applyMove(m.t, m.r, m.c, 2, false); }
}

// ─────────────────────────────────────────────────────────────────────────────
//  End game — publish result, show result screen
// ─────────────────────────────────────────────────────────────────────────────
function endGame() {
  window.G.over = true;
  renderBoard();

  // Publish result to Ably so relayer can call declareWinner on-chain
  if (window.G.isPvP && !window.G.isFree && window.M?.contractMatchId && window.M?.chan) {
    const my  = window.G.scores[window.G.myPN - 1];
    const opp = window.G.scores[2 - window.G.myPN];
    // Each player reports their OWN score only
    // Relayer compares both reports and decides winner — can't be cheated
    const resultPayload = {
      contractMatchId: window.M.contractMatchId,
      reporterPN:      window.G.myPN,
      reporterWallet:  window.Wallet?.addr || '',
      reporterScore:   my,
      oppScore:        opp,
      gameChannel:     window.M.id
    };

    console.log('[endGame] publishing result:', resultPayload);

    // Publish to game channel
    window.M.chan.publish('result', resultPayload).catch(e => console.warn('game chan publish failed:', e));

    // ALSO publish to global dwm:results — relayer subscribes here
    try {
      const rt = getRT();
      const globalChan = rt.channels.get('dwm:results');
      globalChan.publish('result', resultPayload).catch(e => console.warn('global publish failed:', e));
      console.log('[endGame] published to dwm:results');
    } catch(e) {
      console.warn('[endGame] could not publish to dwm:results:', e.message);
    }

    // HTTP backup — calls relayer /settle directly
    // Set RELAYER_URL to your Replit URL e.g. https://dotwars.YOUR_NAME.repl.co
    const RELAYER_URL = window.RELAYER_URL || '';
    if (RELAYER_URL) {
      fetch(RELAYER_URL + '/settle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resultPayload)
      })
      .then(r => r.json())
      .then(d => console.log('[endGame] HTTP settle response:', d))
      .catch(e => console.warn('[endGame] HTTP settle failed:', e.message));
    }
  }

  setTimeout(() => showResultScreen(), 650);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Score + turn UI updates
// ─────────────────────────────────────────────────────────────────────────────
function updateScore() {
  document.getElementById('sc-me-v').textContent = window.G.scores[window.G.myPN - 1];
  document.getElementById('sc-op-v').textContent = window.G.scores[2 - window.G.myPN];
}

function updateTurn() {
  const mine = window.G.turn === window.G.myPN;
  document.getElementById('sc-me').classList.toggle('active', mine);
  document.getElementById('sc-op').classList.toggle('active', !mine);
  document.getElementById('t-lbl').textContent  = window.G.vsBot
    ? (window.G.turn === 1 ? 'YOUR TURN' : 'BOT…')
    : (mine ? 'YOUR TURN' : 'THEIR TURN');
  document.getElementById('t-pip').style.background = mine ? 'var(--green)' : 'var(--pink)';
}

// Expose for matchmaking.js (it calls applyMove and endGame)
window.applyMove = applyMove;
window.endGame   = endGame;

window.addEventListener('resize', () => {
  if (document.getElementById('game-screen').classList.contains('active')) {
    resizeCanvas(); renderBoard();
  }
});