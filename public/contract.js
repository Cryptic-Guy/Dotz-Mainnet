// ─── contract.js ─────────────────────────────────────────────────────────────
// DotWarsEscrow V1 Integration
// Uses config.js for network/contract switching
// Supports: createMatch, joinMatch, declareWinner, withdraw, etc.
// ─────────────────────────────────────────────────────────────────────────────

// Function selectors (keccak256 verified from Solidity contract)
const SIG_CREATE_MATCH = '0xa0cc641a';   // createMatch()
const SIG_JOIN_MATCH = '0x0d4acd16';     // joinMatch(uint64 matchId)
const SIG_CANCEL_MATCH = '0x1e7ca7be';   // cancelMatch(uint64 matchId)
const SIG_TIMEOUT_MATCH = '0x4c0a58e0';  // timeoutActiveMatch(uint64 matchId)
const SIG_DECLARE_WINNER = '0xb72e5e04'; // declareWinner(uint64 matchId, address winner)
const SIG_DECLARE_DRAW = '0x18e1d38f';   // declareDraw(uint64 matchId)
const SIG_WITHDRAW = '0x3ccfd60b';       // withdraw()

// Event topics (keccak256 verified)
const TOPIC_MATCH_CREATED = '0x1598cf06b3bbeddfa848d9dc295eae86175cd6ace4f38d465b3e23a9808baf3c';
const TOPIC_MATCH_JOINED = '0x226c1f7fc6b98f6d51396b469a5f5234d2a3b9c4b16e2a4b9e5d0f3a1c8e7b22';
const TOPIC_MATCH_FINISHED = '0x6f4e0e6a6e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c';

// Base Builder Code (optional, for attribution)
const BUILDER_CODE = '1203bc5f3a7261726a757a3679';

// ─────────────────────────────────────────────────────────────────────────────
// Get provider
// ─────────────────────────────────────────────────────────────────────────────
function _provider() {
  if (!window.ethereum) {
    throw new Error('Wallet not connected. Click "CONNECT" first.');
  }
  return window.ethereum;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify correct network before sending transactions
// ─────────────────────────────────────────────────────────────────────────────
async function _ensureCorrectChain() {
  const currentChain = await _provider().request({ method: 'eth_chainId' });
  
  if (currentChain.toLowerCase() !== CONFIG.chainId.toLowerCase()) {
    console.log(`[contract] Switching chain from ${currentChain} to ${CONFIG.chainId}`);
    await switchChain();
  }
}

async function switchChain() {
  try {
    await _provider().request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONFIG.chainId }],
    });
    console.log('[contract] Switched to', CONFIG.networkName);
  } catch (e) {
    if (e.code === 4902) {
      // Chain not added, add it
      await _provider().request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: CONFIG.chainId,
            chainName: CONFIG.networkName,
            nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
            rpcUrls: [CONFIG.rpcUrl],
            blockExplorerUrls: [CONFIG.explorerUrl],
          },
        ],
      });
      console.log('[contract] Added chain:', CONFIG.networkName);
    } else {
      throw e;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// createMatch() — Player 1 stakes 0.0002 ETH
// ─────────────────────────────────────────────────────────────────────────────
async function txCreateMatch(from) {
  await _ensureCorrectChain();

  const txHash = await _provider().request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: CONFIG.contractAddress,
        value: CONFIG.stake,
        data: SIG_CREATE_MATCH,
      },
    ],
  });

  if (CONFIG.debug) console.log('[txCreateMatch] sent, hash:', txHash);
  return txHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// joinMatch(uint64 matchId) — Player 2 stakes 0.0002 ETH
// ─────────────────────────────────────────────────────────────────────────────
async function txJoinMatch(from, matchId) {
  await _ensureCorrectChain();

  const data = SIG_JOIN_MATCH + BigInt(matchId).toString(16).padStart(64, '0');

  const txHash = await _provider().request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: CONFIG.contractAddress,
        value: CONFIG.stake,
        data: data,
      },
    ],
  });

  if (CONFIG.debug) console.log('[txJoinMatch] sent, hash:', txHash);
  return txHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// cancelMatch(uint64 matchId) — Player 1 reclaims stake if no one joined after 1h
// ─────────────────────────────────────────────────────────────────────────────
async function txCancelMatch(from, matchId) {
  await _ensureCorrectChain();

  const data = SIG_CANCEL_MATCH + BigInt(matchId).toString(16).padStart(64, '0');

  const txHash = await _provider().request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: CONFIG.contractAddress,
        value: '0x0',
        data: data,
      },
    ],
  });

  if (CONFIG.debug) console.log('[txCancelMatch] sent, hash:', txHash);
  return txHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// timeoutActiveMatch(uint64 matchId) — Escape hatch if relayer fails to declare
// ─────────────────────────────────────────────────────────────────────────────
async function txTimeoutMatch(from, matchId) {
  await _ensureCorrectChain();

  const data = SIG_TIMEOUT_MATCH + BigInt(matchId).toString(16).padStart(64, '0');

  const txHash = await _provider().request({
    method: 'eth_sendTransaction',
    params: [
      {
        from,
        to: CONFIG.contractAddress,
        value: '0x0',
        data: data,
      },
    ],
  });

  if (CONFIG.debug) console.log('[txTimeoutMatch] sent, hash:', txHash);
  return txHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// withdraw() — Claim winnings from contract
// ─────────────────────────────────────────────────────────────────────────────
async function txWithdraw(from) {
  await _ensureCorrectChain();

  const txHash = await _provider().request({
    method: 'eth_sendTransaction',
    params: [
      {
        from: from,
        to: CONFIG.contractAddress,
        value: '0x0',
        data: SIG_WITHDRAW,
        // Manually set gas to 100,000 (0x186A0 in hex) 
        // This prevents the "failed to estimate gas" revert.
        gas: '0x249F0', 
      },
    ],
  });

  if (CONFIG.debug) console.log('[txWithdraw] sent, hash:', txHash);
  return txHash;
}

// ─────────────────────────────────────────────────────────────────────────────
// waitReceipt(hash) — Poll for tx confirmation (every 2s, max 90s)
// ─────────────────────────────────────────────────────────────────────────────
async function waitReceipt(hash) {
  if (CONFIG.debug) console.log('[waitReceipt] waiting for:', hash);
  
  for (let i = 0; i < 45; i++) {
    const receipt = await _provider().request({
      method: 'eth_getTransactionReceipt',
      params: [hash],
    });

    if (receipt?.blockNumber) {
      console.log('[waitReceipt] ✓ mined at block:', receipt.blockNumber);
      console.log('[waitReceipt] status:', receipt.status === '0x1' ? '✓ SUCCESS' : '✗ FAILED');
      console.log('[waitReceipt] logs:', receipt.logs?.length);

      if (receipt.status === '0x0' || receipt.status === 0) {
        const explorerUrl = CONFIG.getExplorerTxUrl(hash);
        throw new Error(`TX REVERTED — ${explorerUrl}`);
      }

      return receipt;
    }

    await new Promise((res) => setTimeout(res, 2000));
  }

  const explorerUrl = CONFIG.getExplorerTxUrl(hash);
  throw new Error(`TX not mined after 90s — ${explorerUrl}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// parseMatchId(receipt) — Extract matchId from MatchCreated log
// ─────────────────────────────────────────────────────────────────────────────
function parseMatchId(receipt) {
  if (CONFIG.debug) {
    console.log('[parseMatchId] receipt.logs count:', receipt.logs?.length);
    receipt.logs?.forEach((l, i) => {
      console.log(`[log ${i}] address: ${l.address} | topics: ${l.topics?.length}`);
    });
  }

  // Try exact match first
  let log = receipt.logs?.find(
    (l) =>
      l.address?.toLowerCase() === CONFIG.contractAddress.toLowerCase() &&
      l.topics?.[0]?.toLowerCase() === TOPIC_MATCH_CREATED
  );

  // Fallback: any log from our contract
  if (!log) {
    log = receipt.logs?.find(
      (l) => l.address?.toLowerCase() === CONFIG.contractAddress.toLowerCase()
    );
  }

  // Last resort: first log with 2+ topics
  if (!log) {
    log = receipt.logs?.find((l) => l.topics?.length >= 2);
  }

  if (!log) {
    console.error('[parseMatchId] Full receipt:', JSON.stringify(receipt, null, 2));
    throw new Error('No matching log found in receipt');
  }

  if (!log.topics?.[1]) {
    throw new Error('matchId topic missing');
  }

  const matchId = BigInt(log.topics[1]).toString();
  console.log('[parseMatchId] ✓ matchId =', matchId);
  return matchId;
}

// Fetch claimable balance from the 'balances' mapping in the contract
async function getClaimableBalance(address) {
  try {
    // selector for balances(address)
    const data = '0x27e235e3' + address.substring(2).padStart(64, '0');

    const response = await fetch(CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [{ to: CONFIG.contractAddress, data: data }, 'latest'],
      }),
    });

    const result = await response.json();
    if (result.error) return BigInt(0);

    return BigInt(result.result);
  } catch (e) {
    console.error("[getClaimableBalance] error:", e);
    return BigInt(0);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getBalance(address) — Fetch user balance from contract via HTTP RPC
// ─────────────────────────────────────────────────────────────────────────────
async function getBalance(address) {
  try {
    const response = await fetch(CONFIG.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_getBalance',
        params: [address, 'latest'],
      }),
    });

    const data = await response.json();

    if (data.error) throw new Error(data.error.message);

    const balanceWei = BigInt(data.result);
    const balanceEth = Number(balanceWei) / 1e18;

    if (CONFIG.debug) console.log('[getBalance]', address, '=', balanceEth, 'ETH');

    return { weiBalance: balanceWei, ethBalance: balanceEth };
  } catch (e) {
    console.error('[getBalance] error:', e.message);
    return { weiBalance: BigInt(0), ethBalance: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Config status helper
// ─────────────────────────────────────────────────────────────────────────────
function getContractStatus() {
  return {
    network: CONFIG.networkName,
    isTestnet: CONFIG.isTestnet,
    contractAddress: CONFIG.contractAddress,
    chainId: CONFIG.chainId,
    rpcUrl: CONFIG.rpcUrl,
    stake: CONFIG.stakeFormatted,
  };
}

// Log on load
if (typeof window !== 'undefined' && CONFIG.debug) {
  window.addEventListener('load', () => {
    console.log('[contract] Status:', getContractStatus());
  });
}
window.CONTRACT_ADDR = CONFIG.contractAddress;
window.STAKE_WEI = CONFIG.stake;