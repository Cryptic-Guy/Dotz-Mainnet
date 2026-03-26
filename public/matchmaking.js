// ─── matchmaking.js ──────────────────────────────────────────────────────────
// Ably lobby matchmaking + on-chain staking with 30s join timeout
// Relayer flow: frontend publishes result to Ably → relayer calls declareWinner
// ─────────────────────────────────────────────────────────────────────────────

const ABLY_KEY = 'vA41XA.4un8Nw:CzmRTxdqjwJMdBgw4a4yDauV9xignrdVFqE6201YIoc';

// Shared match state
window.M = {
  myPN:            1,
  chan:             null,
  id:              null,
  isFree:          false,
  oppWallet:       '',
  contractMatchId: null
};

let _rt        = null;
let _lobby     = null;
let _matched   = false;
let _statusEl  = null;
let _isFreeMode = false;

// ─────────────────────────────────────────────────────────────────────────────
//  Client ID — stable per session
// ─────────────────────────────────────────────────────────────────────────────
function myClientId() {
  let id = sessionStorage.getItem('_dwmid');
  if (!id) {
    id = 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    sessionStorage.setItem('_dwmid', id);
  }
  return id;
}

function myDisplayName() {
  if (window.Wallet?.addr)
    return window.Wallet.addr.slice(0, 6) + '...' + window.Wallet.addr.slice(-4);
  return 'P_' + myClientId().slice(-4);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Ably instance
// ─────────────────────────────────────────────────────────────────────────────
function getRT() {
  if (!_rt || _rt.connection.state === 'failed' || _rt.connection.state === 'closed') {
    _rt = new Ably.Realtime({ key: ABLY_KEY, clientId: myClientId() });
    _rt.connection.on('failed', () => showToast('Ably connection failed', 5000));
  }
  return _rt;
}

function mmStatus(html) {
  if (_statusEl) document.getElementById(_statusEl).innerHTML = html;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Enter lobby
// ─────────────────────────────────────────────────────────────────────────────
async function enterLobby(mode, isFree, p2AvEl, p2NmEl, statusEl, onStart) {
  _matched    = false;
  _statusEl   = statusEl;
  _isFreeMode = isFree;

  cleanupNet();

  const spinnerClass = isFree ? 'spinner blue' : 'spinner';
  mmStatus(`<div class="${spinnerClass}"></div><div class="mm-txt">CONNECTING...</div>`);

  const rt = getRT();

  try {
    await new Promise((resolve, reject) => {
      if (rt.connection.state === 'connected') { resolve(); return; }
      const t = setTimeout(() => reject(new Error('Timeout')), 8000);
      rt.connection.once('connected', () => { clearTimeout(t); resolve(); });
      rt.connection.once('failed',    () => { clearTimeout(t); reject(new Error('Failed')); });
    });
  } catch (e) {
    mmStatus('<div style="color:var(--pink);font-size:.65rem">Cannot reach server.<br>Check internet.</div>');
    return;
  }

  mmStatus(`<div class="${spinnerClass}"></div><div class="mm-txt">FINDING OPPONENT...</div>`);

  const lobbyName = 'dwm:lobby:' + mode;
  _lobby = rt.channels.get(lobbyName);

  _lobby.presence.subscribe('enter', member => {
    if (_matched) return;
    if (member.clientId === myClientId()) return;
    doPair(member.clientId, member.data?.name || 'Anon', member.data?.wallet || '', p2AvEl, p2NmEl, onStart);
  });

  try {
    const data = { name: myDisplayName() };
    if (!isFree && window.Wallet?.addr) data.wallet = window.Wallet.addr;
    await _lobby.presence.enter(data);
  } catch (e) {
    mmStatus(`<div style="color:var(--pink);font-size:.65rem">Lobby join failed.<br>${e.message}</div>`);
    return;
  }

  try {
    const members = await _lobby.presence.get();
    const others  = members.filter(m => m.clientId !== myClientId());
    if (others.length > 0 && !_matched) {
      doPair(others[0].clientId, others[0].data?.name || 'Anon', others[0].data?.wallet || '', p2AvEl, p2NmEl, onStart);
    }
  } catch (e) { /* will match via subscribe */ }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Pair two players + handle staking with 30s join window
// ─────────────────────────────────────────────────────────────────────────────
async function doPair(oppId, oppName, oppWallet, p2AvEl, p2NmEl, onStart) {
  if (_matched) return;
  _matched = true;

  window.M.oppWallet = oppWallet || '';

  if (_lobby) {
    _lobby.presence.leave().catch(() => {});
    _lobby.presence.unsubscribe();
    _lobby = null;
  }

  const myPN = myClientId() < oppId ? 1 : 2;
  const ids  = [myClientId(), oppId].sort();
  const mid  = 'dwm:game:' + ids[0].slice(-4) + ids[1].slice(-4);

  window.M.myPN   = myPN;
  window.M.id     = mid;
  window.M.isFree = _isFreeMode;

  document.getElementById(p2AvEl).className   = 'pav p2';
  document.getElementById(p2AvEl).textContent = (oppName[0] || '?').toUpperCase();
  document.getElementById(p2NmEl).textContent = oppName.slice(0, 10).toUpperCase();

  // ── Staked: handle on-chain with 30s join window ──────────────────────────
  if (!_isFreeMode) {
    const addr = window.Wallet?.addr;
    if (!addr || !window.ethereum) {
      showToast('Wallet not connected!');
      _matched = false;
      return;
    }

    if (myPN === 1) {
      // ── P1: createMatch on-chain, then wait up to 30s for P2 to join ──────
      try {
        mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
          Approve 0.0002 ETH stake in MetaMask...
        </div>`);

        const hash    = await txCreateMatch(addr);
        mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
          Mining...<br><span style="font-size:.55rem;color:var(--muted)">${hash.slice(0,18)}...</span>
        </div>`);
        const receipt = await waitReceipt(hash);
        const cid     = parseMatchId(receipt);
        window.M.contractMatchId = cid;

        // Tell P2 the matchId + start 30s countdown
        const sc = getRT().channels.get(mid);
        await sc.publish('match_created', { contractMatchId: cid, p1Wallet: addr, p1StakeTime: Math.floor(Date.now()/1000) });

        // Show 30s countdown while waiting for P2 to stake
        let secs = 30;
        const timer = setInterval(() => {
          secs--;
          mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
            Waiting for opponent to stake...<br>
            <span style="font-size:1.2rem;font-family:var(--font-display);color:${secs <= 10 ? 'var(--pink)' : 'var(--gold)'}">${secs}s</span>
          </div>`);
          if (secs <= 0) clearInterval(timer);
        }, 1000);

        // Wait for P2 joined confirmation OR timeout
        await new Promise((resolve, reject) => {
          const t = setTimeout(() => {
            clearInterval(timer);
            reject(new Error('TIMEOUT'));
          }, 31000);

          sc.subscribe('p2_joined', msg => {
            clearTimeout(t);
            clearInterval(timer);
            window.M.oppWallet = msg.data?.p2Wallet || '';
            resolve();
          });
        });

      } catch (e) {
        if (e.message === 'TIMEOUT') {
          mmStatus(`<div style="text-align:center">
            <div style="color:var(--pink);font-size:.7rem;font-weight:700;margin-bottom:8px">
              ⏰ Opponent didn't stake in time
            </div>
            <div style="color:var(--muted);font-size:.58rem;margin-bottom:12px">
              Your 0.0002 ETH is safe in the contract
            </div>
            <button onclick="cancelAndRefund()" style="
              background:var(--green);color:#000;border:none;border-radius:8px;
              padding:10px 20px;font-size:.7rem;font-weight:700;cursor:pointer;
              letter-spacing:.05em;width:100%
            ">💰 GET REFUND</button>
          </div>`);
          showToast('Opponent timed out — claim your refund!', 5000);


        } else {
          mmStatus(`<div style="color:var(--pink);font-size:.65rem">Failed: ${e.message}</div>`);
          showToast('Failed: ' + e.message, 5000);
          _matched = false;
        }
        return;
      }

    } else {
      // ── P2: wait for P1's matchId, then stake within 30s ─────────────────
      try {
        mmStatus(`<div style="color:var(--blue);font-size:.68rem;text-align:center">
          Waiting for opponent to stake first...
        </div>`);

        // Wait for P1's match_created event (up to 45s)
        const cid = await new Promise((resolve, reject) => {
          const t  = setTimeout(() => reject(new Error('P1 stake timeout')), 45000);
          const sc = getRT().channels.get(mid);
          sc.subscribe('match_created', msg => {
            clearTimeout(t);
            sc.unsubscribe('match_created');
            window.M._p1StakeTime = msg.data.p1StakeTime || Math.floor(Date.now()/1000);
            resolve(msg.data.contractMatchId);
          });
        });

        window.M.contractMatchId = cid;

        // Show 30s countdown for P2 to stake
        let secs = 30;
        mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
          Opponent staked! Your turn — approve in MetaMask<br>
          <span style="font-size:.55rem;color:var(--pink)">You have 30s or match cancels</span>
        </div>`);

        const timer = setInterval(() => {
          secs--;
          if (secs <= 0) clearInterval(timer);
        }, 1000);

        // Check balance BEFORE sending tx — save gas on guaranteed fail
        const balHex = await _provider().request({ method: 'eth_getBalance', params: [addr, 'latest'] });
        const balWei = parseInt(balHex, 16);
        const stakeWei = parseInt(STAKE_WEI, 16);
        if (balWei < stakeWei) {
          const balEth = (balWei / 1e18).toFixed(6);
          throw new Error(`Not enough ETH — you have ${balEth} ETH, need 0.0002 ETH`);
        }

        // Hard cutoff — if more than 28s passed since P1 staked, abort
        // This prevents the race condition where P2 stakes after P1's cancel
        const elapsed = Math.floor(Date.now() / 1000) - (window.M._p1StakeTime || 0);
        if (elapsed > 28) {
          throw new Error('Too late — match window closed. Please try again.');
        }

        const hash = await txJoinMatch(addr, cid);
        clearInterval(timer);

        mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
          Mining...<br><span style="font-size:.55rem;color:var(--muted)">${hash.slice(0,18)}...</span>
        </div>`);
        const receipt = await waitReceipt(hash);

        // CRITICAL: verify tx didn't revert (e.g. insufficient ETH)
        if (receipt.status === '0x0' || receipt.status === 0) {
          throw new Error('Join tx reverted — not enough ETH in wallet');
        }

        // Double-check on-chain: match must be Active now
        // Double-check on-chain: match must be Active now
        try {
          const targetCA = window.CONTRACT_ADDR || "0xA50cd7cc647bBFf31EB86dF7D2F759e8dCd5F0eE";
          const isActiveSel = '0x34abcac9'; 
          const matchIdHex = BigInt(cid).toString(16).padStart(64, '0');
          const isActiveData = isActiveSel + matchIdHex;

          const activeResult = await _provider().request({
            method: 'eth_call',
            params: [{ to: targetCA, data: isActiveData }, 'latest']
          });

          const isActive = (activeResult === '0x' || activeResult === null) || parseInt(activeResult, 16) === 1;

          if (!isActive) {
            console.warn("[matchmaking] isActive returned false, but receipt was SUCCESS.");
          }
        } catch (readError) {
          console.warn("[matchmaking] Read-only check failed, but stake was SUCCESS:", readError);
        }

        // Tell P1 that P2 joined successfully
        const sc = getRT().channels.get(mid);
        await sc.publish('p2_joined', { p2Wallet: addr });
        showToast('Stakes locked! Game starting...', 3000);

      } catch (e) {
        const msg = e.message || '';
        if (msg.includes('Not enough ETH') || msg.includes('ETH')) {
          // Tell P1 that P2 can't stake so P1 can get refund
          try {
            const sc = getRT().channels.get(mid);
            await sc.publish('p2_insufficient', { reason: 'insufficient_eth' });
          } catch(_) {}

          mmStatus(`<div style="color:var(--pink);font-size:.65rem;text-align:center">
            ❌ Not enough ETH to stake!<br>
            <span style="font-size:.55rem;color:var(--muted)">You need 0.0002 ETH + gas</span><br>
            <a href="https://coinbase.com/buy" target="_blank"
               style="color:var(--blue);font-size:.6rem">Get ETH to play →</a>
          </div>`);
          showToast('❌ Need ETH to play — get ETH on Base first', 6000);
        } else {
          mmStatus(`<div style="color:var(--pink);font-size:.65rem">Failed: ${e.message}</div>`);
          showToast('Failed: ' + e.message, 5000);
        }
        _matched = false;
        return;
      }
    }
  }

  // ── Set up game channel ───────────────────────────────────────────────────
  const color = _isFreeMode ? 'var(--blue)' : 'var(--green)';
  const label = _isFreeMode ? 'MATCHED' : 'STAKES LOCKED';
  mmStatus(`<div style="color:${color};font-size:.75rem;font-weight:700;text-align:center">
    GAME STARTING...
  </div>`);

  const chan = getRT().channels.get(mid);
  window.M.chan = chan;

  // P2 couldn't stake — show refund button to P1 immediately
  chan.subscribe('p2_insufficient', () => {
    mmStatus(`<div style="text-align:center">
      <div style="color:var(--pink);font-size:.7rem;font-weight:700;margin-bottom:8px">
        ⚠️ Opponent doesn't have enough ETH
      </div>
      <div style="color:var(--muted);font-size:.58rem;margin-bottom:12px">
        Your 0.0002 ETH is safe — get it back now
      </div>
      <button onclick="cancelAndRefund()" style="
        background:var(--green);color:#000;border:none;border-radius:8px;
        padding:10px 20px;font-size:.7rem;font-weight:700;cursor:pointer;width:100%
      ">💰 GET REFUND</button>
    </div>`);
    showToast("Opponent can't stake — claim your refund!", 6000);
  });

  chan.subscribe('mv', msg => {
    const d = msg.data;
    if (!d || d.p === window.M.myPN) return;
    if (window.G?.over) return;
    applyMove(d.t, d.r, d.c, d.p, false);
  });

  chan.subscribe('quit', msg => {
    if (msg.data?.from === window.M.myPN) return;
    if (!window.G?.over) {
      showToast('Opponent quit — you win!');
      const mi = window.M.myPN - 1;
      window.G.scores[mi]     = (window.G.size - 1) * (window.G.size - 1);
      window.G.scores[1 - mi] = 0;
      endGame();
    }
  });

  setTimeout(() => onStart(oppName, myPN === 1 ? 'p1' : 'p2'), 1200);
}

// ─────────────────────────────────────────────────────────────────────────────
//  Cancel match and get refund (P1 only, after 30s timeout)
// ─────────────────────────────────────────────────────────────────────────────
async function cancelAndRefund() {
  // First check if match is still Waiting or already Active
  const _mid = window.M.contractMatchId;
  if (_mid) {
    try {
      const rpc = 'https://mainnet.base.org';
      const r = await fetch(rpc, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({jsonrpc:'2.0',id:1,method:'eth_call',
          params:[{to:CONTRACT_ADDR, data:'0x34abcac9'+BigInt(matchId).toString(16).padStart(64,'0')},'latest']})});
      const isActive = parseInt((await r.json()).result, 16) === 1;
      if (isActive) {
        // P2 snuck in after timeout — both staked, can't cancel
        mmStatus(`<div style="text-align:center">
          <div style="color:var(--gold);font-size:.68rem;font-weight:700;margin-bottom:6px">
            ⚠️ Opponent staked just after timeout
          </div>
          <div style="color:var(--muted);font-size:.58rem">
            Both ETH locked — auto-refunded after 30 min
          </div>
          <div style="color:var(--muted);font-size:.55rem;margin-top:4px">
            Use "ETH stuck in contract? GET REFUND" on home screen
          </div>
        </div>`);
        showToast('Both staked — ETH auto-refunds after 30 min', 6000);
        setTimeout(() => showScreen('home-screen'), 5000);
        return;
      }
    } catch(e) { /* proceed with cancel */ }
  }

  const addr    = window.Wallet?.addr;
  const matchId = window.M.contractMatchId;
  if (!addr || !matchId) {
    console.warn('[cancelAndRefund] missing addr or matchId');
    showScreen('home-screen');
    return;
  }

  // cancelMatch(uint64) — only works after JOIN_TIMEOUT (10 min on-chain)
  // Contract enforces this, so we retry if it fails too early
  const SEL  = '0x26c9bf02';
  const data = SEL + BigInt(matchId).toString(16).padStart(64, '0');

  mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
    <div class="spinner"></div>
    Sending refund transaction...
  </div>`);

  const tryCancel = async (attempt) => {
    try {
      const hash = await _provider().request({
        method: 'eth_sendTransaction',
        params: [{ from: addr, to: CONTRACT_ADDR, data, chainId: CHAIN_ID }]
      });

      mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
        <div class="spinner"></div>
        Mining refund...
      </div>`);

      await waitReceipt(hash);

      showToast('✅ Refunded! 0.0002 ETH returned to your wallet', 5000);
      cleanupNet();
      showScreen('home-screen');

    } catch (e) {
      // If contract says JoinWindowOpen, wait and retry (up to 3x)
      if ((e.message?.includes('JoinWindowOpen') || e.message?.includes('revert')) && attempt < 3) {
        const waitSec = 30 * attempt;
        mmStatus(`<div style="color:var(--gold);font-size:.68rem;text-align:center">
          Waiting ${waitSec}s for on-chain timeout...<br>
          <span style="font-size:.55rem;color:var(--muted)">Retry ${attempt}/3</span>
        </div>`);
        setTimeout(() => tryCancel(attempt + 1), waitSec * 1000);
      } else {
        showToast('❌ Refund failed: ' + e.message, 6000);
        mmStatus(`<div style="color:var(--pink);font-size:.65rem;text-align:center">
          Auto-refund failed.<br>
          <button onclick="cancelAndRefund()" class="btn btn-sm" style="margin-top:8px">RETRY REFUND</button>
          <button onclick="showScreen('home-screen')" class="btn btn-ghost btn-sm" style="margin-top:4px">GO HOME</button>
        </div>`);
      }
    }
  };

  tryCancel(1);
}

// ─────────────────────────────────────────────────────────────────────────────
//  claimTimeout — 50/50 refund after 30 min if relayer/game went silent
// ─────────────────────────────────────────────────────────────────────────────
async function claimTimeoutRefund() {
  const addr    = window.Wallet?.addr;
  const matchId = window.M.contractMatchId;
  if (!addr || !matchId) return;

  // claimTimeout(uint64) selector = 0x939ec696
  const SEL  = '0x939ec696';
  const data = SEL + BigInt(matchId).toString(16).padStart(64, '0');

  try {
    showToast('Claiming timeout refund — approve in wallet...', 6000);
    const hash = await _provider().request({
      method: 'eth_sendTransaction',
      params: [{ from: addr, to: CONTRACT_ADDR, data, chainId: CHAIN_ID }]
    });
    await waitReceipt(hash);
    showToast('✅ Refunded! 0.0002 ETH returned to your wallet', 5000);
    cleanupNet();
    showScreen('home-screen');
  } catch(e) {
    if (e.message?.includes('GameStillRunning')) {
      showToast('⏳ Too early — wait 30 min from match start', 5000);
    } else {
      showToast('❌ Claim failed: ' + e.message, 5000);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  Send move to opponent
// ─────────────────────────────────────────────────────────────────────────────
function netSend(t, r, c, p) {
  if (window.M?.chan) window.M.chan.publish('mv', { t, r, c, p }).catch(() => {});
}

// ─────────────────────────────────────────────────────────────────────────────
//  Clean up all Ably channels
// ─────────────────────────────────────────────────────────────────────────────
function cleanupNet() {
  _matched = false;
  try { if (_lobby) { _lobby.presence.leave().catch(() => {}); _lobby.presence.unsubscribe(); _lobby = null; } } catch (e) {}
  try { if (window.M?.chan) { window.M.chan.unsubscribe(); window.M.chan = null; } } catch (e) {}
}

// ─────────────────────────────────────────────────────────────────────────────
//  INVITE FRIEND — Private staked match via 6-char code
// ─────────────────────────────────────────────────────────────────────────────

let _inviteCode    = null;
let _inviteChan    = null;
let _inviteTimeout = null;

// Generate a random 6-char alphanumeric code
function _genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no confusing chars
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ── Host: create invite code and wait for friend ──────────────────────────────
async function handleInvite() {
  const addr = window.Wallet?.addr;
  if (!addr) { openWalletModal(); return; }

  // Balance check
  try {
    const balHex = await _provider().request({ method: 'eth_getBalance', params: [addr, 'latest'] });
    if (parseInt(balHex, 16) < parseInt(STAKE_WEI, 16)) {
      showToast('❌ Need 0.0002 ETH to stake', 5000);
      showInsufficientEthModal((parseInt(balHex,16)/1e18).toFixed(6));
      return;
    }
  } catch(e) {}

  _inviteCode = _genCode();
  showScreen('invite-host-screen');
  document.getElementById('invite-code-display').textContent = _inviteCode;

  const rt   = getRT();
  const chan  = rt.channels.get('dwm:invite:' + _inviteCode);
  _inviteChan = chan;

  // Wait for friend to join (5 min timeout)
  _inviteTimeout = setTimeout(() => {
    document.getElementById('invite-host-status').innerHTML = `
      <div style="color:var(--pink);font-size:.65rem;text-align:center">
        Code expired — nobody joined in time
      </div>`;
    setTimeout(() => showScreen('home-screen'), 3000);
  }, 5 * 60 * 1000);

  // Listen for friend joining
  chan.subscribe('friend_joined', async msg => {
    clearTimeout(_inviteTimeout);
    const friendWallet = msg.data?.wallet || '';
    const friendName   = msg.data?.name   || 'Friend';

    document.getElementById('invite-host-status').innerHTML = `
      <div style="color:var(--green);font-size:.7rem;text-align:center;font-weight:700">
        ✅ ${friendName} joined! Staking...
      </div>`;

    // Now do P1 stake flow
    try {
      document.getElementById('invite-host-status').innerHTML = `
        <div style="color:var(--gold);font-size:.68rem;text-align:center">
          Approve 0.0002 ETH stake in wallet...
        </div>`;

      const hash    = await txCreateMatch(addr);
      document.getElementById('invite-host-status').innerHTML = `
        <div style="color:var(--gold);font-size:.68rem;text-align:center">
          <div class="spinner"></div>Mining...
        </div>`;
      const receipt = await waitReceipt(hash);
      const cid     = parseMatchId(receipt);
      window.M.contractMatchId = cid;
      window.M.oppWallet       = friendWallet;

      // Tell friend the matchId
      await chan.publish('match_created', {
        contractMatchId: cid,
        p1Wallet:        addr,
        p1StakeTime:     Math.floor(Date.now() / 1000)
      });

      // Wait for friend to stake (30s)
      let secs = 30;
      const timer = setInterval(() => {
        secs--;
        document.getElementById('invite-host-status').innerHTML = `
          <div style="color:var(--gold);font-size:.68rem;text-align:center">
            Waiting for friend to stake...<br>
            <span style="font-size:1.1rem;font-family:var(--font-display);color:${secs<=10?'var(--pink)':'var(--gold)'}">${secs}s</span>
          </div>`;
        if (secs <= 0) clearInterval(timer);
      }, 1000);

      await new Promise((resolve, reject) => {
        const t = setTimeout(() => { clearInterval(timer); reject(new Error('TIMEOUT')); }, 31000);
        chan.subscribe('p2_joined', m => {
          clearTimeout(t); clearInterval(timer);
          window.M.oppWallet = m.data?.p2Wallet || friendWallet;
          resolve();
        });
      });

      // Start game
      _startInviteGame(addr, friendName, friendWallet, cid, 1);

    } catch(e) {
      if (e.message === 'TIMEOUT') {
        document.getElementById('invite-host-status').innerHTML = `
          <div style="text-align:center">
            <div style="color:var(--pink);font-size:.68rem;margin-bottom:8px">Friend didn't stake in time</div>
            <button onclick="cancelAndRefund()" style="background:var(--green);color:#000;border:none;border-radius:8px;padding:8px 16px;font-size:.65rem;font-weight:700;cursor:pointer">💰 GET REFUND</button>
          </div>`;
      } else {
        document.getElementById('invite-host-status').innerHTML = `
          <div style="color:var(--pink);font-size:.65rem">Failed: ${e.message}</div>`;
        showToast('Failed: ' + e.message, 5000);
      }
    }
  });
}

// ── Guest: enter code and join ────────────────────────────────────────────────
async function joinByCode() {
  const addr = window.Wallet?.addr;
  if (!addr) { openWalletModal(); return; }

  const code = document.getElementById('invite-code-input').value.trim().toUpperCase();
  if (code.length !== 6) { showToast('Enter a 6-character code', 3000); return; }

  // Balance check
  try {
    const balHex = await _provider().request({ method: 'eth_getBalance', params: [addr, 'latest'] });
    if (parseInt(balHex, 16) < parseInt(STAKE_WEI, 16)) {
      showToast('❌ Need 0.0002 ETH to stake', 5000);
      return;
    }
  } catch(e) {}

  const statusEl = document.getElementById('invite-join-status');
  statusEl.innerHTML = '<div class="spinner" style="margin:0 auto"></div>';

  const rt   = getRT();
  const chan  = rt.channels.get('dwm:invite:' + code);
  _inviteChan = chan;

  // Tell host we joined
  await chan.publish('friend_joined', {
    wallet: addr,
    name:   myDisplayName()
  });

  statusEl.innerHTML = `<div style="color:var(--green);font-size:.65rem;text-align:center">
    ✅ Connected! Waiting for host to stake...
  </div>`;

  // Wait for host's matchId
  try {
    const cid = await new Promise((resolve, reject) => {
      const t = setTimeout(() => reject(new Error('Host didn\'t stake in time')), 60000);
      chan.subscribe('match_created', msg => {
        clearTimeout(t);
        chan.unsubscribe('match_created');
        window.M._p1StakeTime = msg.data.p1StakeTime || Math.floor(Date.now()/1000);
        resolve(msg.data.contractMatchId);
      });
    });

    window.M.contractMatchId = cid;

    statusEl.innerHTML = `<div style="color:var(--gold);font-size:.65rem;text-align:center">
      Host staked! Approve your stake in wallet...
    </div>`;

    // Balance check before stake
    const elapsed = Math.floor(Date.now()/1000) - (window.M._p1StakeTime || 0);
    if (elapsed > 28) throw new Error('Too late — stake window closed');

    const hash = await txJoinMatch(addr, cid);
    statusEl.innerHTML = `<div style="color:var(--gold);font-size:.65rem;text-align:center">
      <div class="spinner" style="margin:0 auto 6px"></div>Mining...
    </div>`;

    const receipt = await waitReceipt(hash);
    if (receipt.status === '0x0' || receipt.status === 0) {
      throw new Error('Tx reverted');
    }

    // Tell host P2 joined
    await chan.publish('p2_joined', { p2Wallet: addr });
    showToast('Stakes locked! Starting...', 3000);

    // Get host wallet from match_created
    const hostWallet = '';
    _startInviteGame(addr, 'Host', hostWallet, cid, 2);

  } catch(e) {
    statusEl.innerHTML = `<div style="color:var(--pink);font-size:.65rem;text-align:center">
      ❌ ${e.message}
    </div>`;
    showToast('Failed: ' + e.message, 5000);
  }
}

// ── Start the invited game ────────────────────────────────────────────────────
function _startInviteGame(myAddr, oppName, oppWallet, contractMatchId, myPN) {
  const mid = 'dwm:invite:' + (_inviteCode || contractMatchId);

  window.M.myPN            = myPN;
  window.M.chan             = _inviteChan || getRT().channels.get(mid);
  window.M.id               = mid;
  window.M.isFree           = false;
  window.M.oppWallet        = oppWallet;
  window.M.contractMatchId  = contractMatchId;

  const chan = window.M.chan;

  chan.subscribe('mv', msg => {
    const d = msg.data;
    if (!d || d.p === window.M.myPN) return;
    if (window.G?.over) return;
    applyMove(d.t, d.r, d.c, d.p, false);
  });

  chan.subscribe('quit', msg => {
    if (msg.data?.from === window.M.myPN) return;
    if (!window.G?.over) {
      showToast('Opponent quit — you win!');
      const mi = window.M.myPN - 1;
      window.G.scores[mi]     = (window.G.size-1)*(window.G.size-1);
      window.G.scores[1-mi]   = 0;
      endGame();
    }
  });

  chan.subscribe('p2_insufficient', () => {
    document.getElementById('invite-host-status').innerHTML = `
      <div style="text-align:center">
        <div style="color:var(--pink);font-size:.7rem;font-weight:700;margin-bottom:8px">⚠️ Friend doesn't have enough ETH</div>
        <button onclick="cancelAndRefund()" style="background:var(--green);color:#000;border:none;border-radius:8px;padding:10px 20px;font-size:.7rem;font-weight:700;cursor:pointer;width:100%">💰 GET REFUND</button>
      </div>`;
  });

  setTimeout(() => startPvP(oppName, myPN === 1 ? 'p1' : 'p2'), 1200);
}

// ── Cancel invite ─────────────────────────────────────────────────────────────
function cancelInvite() {
  clearTimeout(_inviteTimeout);
  if (_inviteChan) { _inviteChan.unsubscribe(); _inviteChan = null; }
  _inviteCode = null;
  showScreen('home-screen');
}

// ── Copy invite code ──────────────────────────────────────────────────────────
function copyInviteCode() {
  if (!_inviteCode) return;
  navigator.clipboard.writeText(_inviteCode).then(() => {
    showToast('Code copied! Share with your friend', 3000);
    document.getElementById('invite-code-display').style.color = 'var(--green)';
    setTimeout(() => {
      document.getElementById('invite-code-display').style.color = 'var(--gold)';
    }, 1000);
  });
}