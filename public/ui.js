// ─── ui.js ───────────────────────────────────────────────────────────────────
// Screen navigation, game start flows, result screen, toasts, confetti
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
//  Screen switcher
// ─────────────────────────────────────────────────────────────────────────────
function showScreen(id) {
  // Check for stuck ETH whenever home screen is shown
  if (id === 'home-screen' && window.Wallet?.addr) {
    setTimeout(checkStuckEth, 500);
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Home screen button handlers
// ─────────────────────────────────────────────────────────────────────────────
async function handleStake() {
  if (!window.Wallet?.addr) { openWalletModal(); return; }

  // Check balance before entering matchmaking
  try {
    const balHex = await _provider().request({ method: 'eth_getBalance', params: [window.Wallet.addr, 'latest'] });
    const balWei = parseInt(balHex, 16);
    const stakeWei = parseInt(STAKE_WEI, 16);

    if (balWei < stakeWei) {
      const balEth = (balWei / 1e18).toFixed(6);
      showInsufficientEthModal(balEth);
      return;
    }
  } catch(e) {
    // If balance check fails just proceed
    console.warn('Balance check failed:', e.message);
  }

  startStakedMM();
}

function showInsufficientEthModal(currentBal) {
  // Show a toast + block entry
  showToast(`❌ Not enough ETH! You have ${currentBal} ETH, need 0.0002 ETH`, 7000);

  // Update the stake button temporarily
  const btn = document.querySelector('.btn-stake');
  if (btn) {
    const orig = btn.innerHTML;
    btn.innerHTML = '⚠️ GET ETH TO PLAY FIRST';
    btn.style.opacity = '0.6';
    btn.style.cursor  = 'not-allowed';
    // Show faucet link as toast
    setTimeout(() => {
      showToast('👉 Get ETH on Base to play: coinbase.com/buy', 8000);
    }, 500);
    setTimeout(() => {
      btn.innerHTML = orig;
      btn.style.opacity = '';
      btn.style.cursor  = '';
    }, 5000);
  }
}

function handleFree() {
  startFreeMM();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Grid size pickers
// ─────────────────────────────────────────────────────────────────────────────
function pickSize(n) {
  window.G.sz = n;
  document.querySelectorAll('.sz-opt:not([data-fn])').forEach(el =>
    el.classList.toggle('sel', +el.dataset.n === n)
  );
}

function pickFreeSize(n) {
  window.G.freeSz = n;
  document.querySelectorAll('.sz-opt[data-fn]').forEach(el =>
    el.classList.toggle('sel', +el.dataset.fn === n)
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  Start flows
// ─────────────────────────────────────────────────────────────────────────────
function startStakedMM() {
  window.G.sz = 4; // Staked PvP is always 4x4
  showScreen('mm-screen');
  document.getElementById('mm-p1').textContent  = myDisplayName().slice(0, 6).toUpperCase();
  document.getElementById('mm-p2').className    = 'pav wait';
  document.getElementById('mm-p2').textContent  = '?';
  document.getElementById('mm-opp').textContent = 'FINDING';
  enterLobby('staked', false, 'mm-p2', 'mm-opp', 'mm-status', (opp, role) => startPvP(opp, role));
}

function cancelMM() { cleanupNet(); showScreen('home-screen'); }

function startFreeMM() {
  showScreen('free-mm-screen');
  document.getElementById('fmm-p1').textContent  = myDisplayName().slice(0, 6).toUpperCase();
  document.getElementById('fmm-p2').className    = 'pav wait';
  document.getElementById('fmm-p2').textContent  = '?';
  document.getElementById('fmm-opp').textContent = 'FINDING';
  enterLobby('free', true, 'fmm-p2', 'fmm-opp', 'fmm-status', (opp, role) => startFreePvP(opp, role));
}

function cancelFreeMM() { cleanupNet(); showScreen('home-screen'); }

function startBot() {
  window.G.vsBot  = true;
  window.G.isPvP  = false;
  window.G.isFree = false;
  window.G.size   = 4;
  window.G.myPN   = 1;
  initGame();
  document.getElementById('sc-me-nm').textContent = 'YOU';
  document.getElementById('sc-op-nm').textContent = 'BOT';
  document.getElementById('pot-tag').style.display = 'none';
  document.getElementById('undo-btn').style.display = 'block';
  showScreen('game-screen');
}

function startPvP(oppName, role) {
  window.G.vsBot  = false;
  window.G.isPvP  = true;
  window.G.isFree = false;
  window.G.size   = window.G.sz || 4;
  window.G.myPN   = role === 'p1' ? 1 : 2;
  window.G.turn   = 1;
  initGame();
  document.getElementById('sc-me-nm').textContent = 'YOU';
  document.getElementById('sc-op-nm').textContent = (oppName || 'OPP').slice(0, 8).toUpperCase();
  const pt = document.getElementById('pot-tag');
  pt.style.display     = 'block';
  pt.textContent       = '🏆 0.0004E';
  pt.style.background  = 'rgba(255,204,0,.06)';
  pt.style.borderColor = 'rgba(255,204,0,.18)';
  pt.style.color       = 'var(--gold)';
  document.getElementById('undo-btn').style.display = 'none';
  showScreen('game-screen');
  showToast(window.G.myPN === 1 ? 'You go first! ⚔' : 'Opponent goes first…', 3000);
}

function startFreePvP(oppName, role) {
  window.G.vsBot  = false;
  window.G.isPvP  = true;
  window.G.isFree = true;
  window.G.size   = window.G.freeSz || 4;
  window.G.myPN   = role === 'p1' ? 1 : 2;
  window.G.turn   = 1;
  initGame();
  document.getElementById('sc-me-nm').textContent = 'YOU';
  document.getElementById('sc-op-nm').textContent = (oppName || 'OPP').slice(0, 8).toUpperCase();
  const pt = document.getElementById('pot-tag');
  pt.style.display     = 'block';
  pt.textContent       = '🎮 FREE';
  pt.style.background  = 'rgba(0,136,255,.06)';
  pt.style.borderColor = 'rgba(0,136,255,.2)';
  pt.style.color       = 'var(--blue)';
  document.getElementById('undo-btn').style.display = 'none';
  showScreen('game-screen');
  showToast(window.G.myPN === 1 ? 'You go first! 🎮' : 'Opponent goes first…', 3000);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Quit game
// ─────────────────────────────────────────────────────────────────────────────
function quitGame() {
  if (!confirm('Quit the match?')) return;
  window.G.over = true;
  if (window.M?.chan && window.M.id) {
    window.M.chan.publish('quit', { from: window.M.myPN }).catch(() => {});
  }
  window.M.id = null;
  cleanupNet();
  showScreen('home-screen');
}

// ─────────────────────────────────────────────────────────────────────────────
//  Result screen
// ─────────────────────────────────────────────────────────────────────────────
function showResultScreen() {
  const my  = window.G.scores[window.G.myPN - 1];
  const opp = window.G.scores[2 - window.G.myPN];
  const rc  = document.getElementById('r-card');
  const rp  = document.getElementById('r-prize');

  if (my > opp) {
    rc.className = 'result-card win';
    document.getElementById('r-icon').textContent  = '🏆';
    document.getElementById('r-title').textContent = 'WIN';
    if (window.G.isPvP && !window.G.isFree) {
      document.getElementById('r-prize-lbl').textContent = 'PRIZE AWARDED';
      document.getElementById('r-prize-val').textContent = '0.0004 ETH';
      rp.style.display = 'block';
      spawnConfetti();
    } else if (window.G.isFree) {
      document.getElementById('r-prize-lbl').textContent = 'WINNER';
      document.getElementById('r-prize-val').textContent = 'BRAGGING RIGHTS 😎';
      rp.style.borderColor = 'rgba(0,136,255,.2)';
      rp.style.display = 'block';
      spawnConfetti();
    } else {
      rp.style.display = 'none';
    }
  } else if (opp > my) {
    rc.className = 'result-card lose';
    document.getElementById('r-icon').textContent  = window.G.vsBot ? '🤖' : '💀';
    document.getElementById('r-title').textContent = window.G.vsBot ? 'BOT WINS' : 'LOSS';
    rp.style.display = 'none';
  } else {
    rc.className = 'result-card draw';
    document.getElementById('r-icon').textContent  = '🤝';
    document.getElementById('r-title').textContent = 'DRAW';
    if (window.G.isPvP && !window.G.isFree) {
      document.getElementById('r-prize-lbl').textContent = 'RETURNED';
      document.getElementById('r-prize-val').textContent = '0.0002 ETH EACH';
      rp.style.display = 'block';
    } else {
      rp.style.display = 'none';
    }
  }

  document.getElementById('r-sub').textContent = `${my} — ${opp} BOXES`;
  showScreen('result-screen');
}

function playAgain() {
  if (window.G.isFree)      startFreeMM();
  else if (window.G.isPvP)  startStakedMM();
  else                      startBot();
}

// ─────────────────────────────────────────────────────────────────────────────
//  Share result
// ─────────────────────────────────────────────────────────────────────────────
function doShare() {
  const my  = window.G.scores[window.G.myPN - 1];
  const opp = window.G.scores[2 - window.G.myPN];
  const text = my > opp
    ? `⚔️ Won ${window.G.isPvP ? '0.0004 ETH' : 'a match'} on DOTZ!\n${my}–${opp} boxes 🏆\nPlay at: YOUR_URL`
    : `🎮 Played DOTZ! ${my}–${opp}`;
  navigator.clipboard?.writeText(text)
    .then(()  => showToast('Result copied to clipboard!'))
    .catch(()  => showToast(text, 5000));
}

// ─────────────────────────────────────────────────────────────────────────────
//  Toast notification
// ─────────────────────────────────────────────────────────────────────────────
function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Confetti
// ─────────────────────────────────────────────────────────────────────────────
function spawnConfetti() {
  const wrap = document.getElementById('confetti');
  wrap.innerHTML = '';
  const cols = ['#00ff88', '#ff0066', '#ffcc00', '#0088ff', '#aa00ff'];
  for (let i = 0; i < 55; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.cssText = `left:${Math.random() * 100}vw;background:${cols[~~(Math.random() * 5)]};animation-duration:${1.4 + Math.random() * 2}s;animation-delay:${Math.random() * 0.7}s;width:${4 + Math.random() * 7}px;height:${4 + Math.random() * 7}px;`;
    wrap.appendChild(p);
  }
  setTimeout(() => wrap.innerHTML = '', 4500);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Real on-chain stats — fetched from contract + Ably presence
// ─────────────────────────────────────────────────────────────────────────────
async function fetchRealStats() {
  const rpc = 'https://mainnet.base.org';
  // Games played
  try {
    const res   = await fetch(rpc, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:CONTRACT_ADDR,data:'0x79c4264b'},'latest']})});
    const total = parseInt((await res.json()).result, 16);
    if (!isNaN(total) && total > 0) {
      const el = document.getElementById('s-games');
      if (el) el.textContent = total.toLocaleString();
    }
  } catch(e) {}

  // Online players via Ably presence
  try {
    const rt = typeof getRT === 'function' ? getRT() : null;
    if (rt) {
      let online = 0;
      for (const ch of ['dwm:lobby:staked', 'dwm:lobby:free']) {
        const members = await rt.channels.get(ch).presence.get().catch(() => []);
        online += members.length;
      }
      const el = document.getElementById('s-online');
      if (el) el.textContent = Math.max(online, 1);
    }
  } catch(e) {}
}

window.addEventListener('load', () => setTimeout(fetchRealStats, 2000));
setInterval(fetchRealStats, 30000);

// ─────────────────────────────────────────────────────────────────────────────
//  Loading screen hide
// ─────────────────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  setTimeout(() => {
    const l = document.getElementById('loading');
    l.style.opacity = '0';
    setTimeout(() => l.style.display = 'none', 300);
  }, 600);

  // Tell Base/Farcaster the app is ready — hides splash screen
  setTimeout(() => {
    try {
      if (window.sdk?.actions?.ready) {
        window.sdk.actions.ready();
        console.log('[miniapp] sdk.actions.ready() called');
      } else if (window.farcaster?.miniapp?.ready) {
        window.farcaster.miniapp.ready();
      }
    } catch(e) { /* not in mini app context, ignore */ }
  }, 800);
});

// ─────────────────────────────────────────────────────────────────────────────
//  Stuck ETH detection + recovery
//  Scans last N matches for any where wallet is p1/p2 and state is Waiting/Active
// ─────────────────────────────────────────────────────────────────────────────

// Called every time home screen is shown and wallet is connected
async function checkStuckEth() {
  const addr   = window.Wallet?.addr;
  const banner = document.getElementById('stuck-eth-banner');
  if (!banner) return;
  // Show whenever wallet is connected
  banner.style.display = addr ? '' : 'none';
}

async function recoverStuckEth() {
  const addr = window.Wallet?.addr;
  if (!addr) { showToast('Connect wallet first'); return; }

  showToast('🔍 Scanning for stuck ETH...', 4000);

  const rpc   = 'https://mainnet.base.org';
  const addrL = addr.toLowerCase();
  const call  = async (data) => {
    const r = await fetch(rpc, { method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',params:[{to:CONTRACT_ADDR,data},'latest']})});
    const j = await r.json();
    return j.result || '0x';
  };

  try {
    // Get total match count
    const countHex = await call('0x79c4264b');
    const total    = parseInt(countHex, 16);
    if (!total || isNaN(total)) { showToast('No matches found on-chain'); return; }

    console.log('[recover] total matches:', total);

    const from     = Math.max(1, total - 49); // scan last 50
    let   found    = [];

    for (let i = total; i >= from; i--) {
      try {
        // getMatch(uint64) = 0x3b92c4d3
        const res = await call('0x3b92c4d3' + BigInt(i).toString(16).padStart(64,'0'));
        if (!res || res === '0x' || res.length < 10) continue;

        const hex   = res.slice(2); // remove 0x
        // Struct layout (each slot = 64 hex chars = 32 bytes):
        // slot 0: p1 address (last 40 chars of 64)
        // slot 1: p2 address
        // slot 2: createdAt
        // slot 3: startedAt
        const p1        = '0x' + hex.slice(24,   64);
        const p2        = '0x' + hex.slice(88,  128);
        const createdAt = parseInt(hex.slice(128, 192), 16);
        const startedAt = parseInt(hex.slice(192, 256), 16);
        const state     = parseInt(hex.slice(-2), 16);

        const isP1 = p1.toLowerCase() === addrL;
        const isP2 = p2.toLowerCase() === addrL;

        console.log(`[recover] match #${i} p1:${p1.slice(0,8)} p2:${p2.slice(0,8)} state:${state} isP1:${isP1} isP2:${isP2}`);

        const nowSec = Math.floor(Date.now() / 1000);
        // Waiting(0) + I am P1 + JOIN_TIMEOUT(35s) passed → cancelMatch
        if (state === 0 && isP1 && (nowSec - createdAt) > 35)
          found.push({ id: i, action: 'cancel' });
        // Active(1) + I am P1 or P2 + GAME_TIMEOUT(30min) passed → claimTimeout
        if (state === 1 && (isP1 || isP2) && (nowSec - startedAt) > 1800)
          found.push({ id: i, action: 'timeout' });
      } catch(e) { continue; }
    }

    console.log('[recover] found:', found);

    if (found.length === 0) {
      showToast('✅ No stuck ETH found!', 3000);
      return;
    }

    let recovered = 0;
    for (const m of found) {
      try {
        const sel  = m.action === 'cancel' ? '0x26c9bf02' : '0x939ec696';
        const data = sel + BigInt(m.id).toString(16).padStart(64, '0');
        showToast(`Recovering match #${m.id}... approve in wallet`, 8000);
        const hash = await _provider().request({
          method: 'eth_sendTransaction',
          params: [{ from: addr, to: CONTRACT_ADDR, data, chainId: CHAIN_ID }]
        });
        await waitReceipt(hash);
        recovered++;
        showToast(`✅ Match #${m.id} refunded!`, 4000);
      } catch(e) {
        if (e.code === 4001) { showToast('Cancelled'); break; }
        showToast(`Match #${m.id}: ${e.message?.slice(0,60)}`, 4000);
      }
    }

    if (recovered > 0) showToast(`💰 Recovered ${recovered} match(es)!`, 5000);

  } catch(e) {
    showToast('❌ ' + e.message, 5000);
    console.error('[recover]', e);
  }
}

// Hook into showScreen — check for stuck ETH whenever home screen appears
const _origShowScreen = typeof showScreen === 'function' ? showScreen : null;
window.addEventListener('load', () => {
  // Wait for wallet to auto-reconnect then show banner
  setTimeout(() => {
    if (window.Wallet?.addr) checkStuckEth();
  }, 3000);
});
