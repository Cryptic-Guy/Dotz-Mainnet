// ─── wallet.js ───────────────────────────────────────────────────────────────
// Base Account SDK — replaces raw window.ethereum
// Supports: Base Smart Wallet (passkey), Coinbase Wallet app, MetaMask
// Uses config.js for network switching
// ─────────────────────────────────────────────────────────────────────────────

window.Wallet = {
  addr: null,
  shortAddr: () =>
    window.Wallet.addr
      ? window.Wallet.addr.slice(0, 5) + "..." + window.Wallet.addr.slice(-5)
      : "",
};

// ── Init Base Account SDK (runs once on page load) ────────────────────────────
let _baseProvider = null;

function _getBaseProvider() {
  if (_baseProvider) return _baseProvider;

  if (typeof window.createBaseAccountSDK !== "function") {
    throw new Error(
      "Base Account SDK not loaded — check script tag in index.html",
    );
  }

  const sdk = window.createBaseAccountSDK({
    appName: CONFIG.appName,
    appLogoUrl: CONFIG.appLogoUrl,
    appChainIds: [CONFIG.chainIdInt],
  });

  _baseProvider = sdk.getProvider();
  window.ethereum = _baseProvider;

  _baseProvider.on("accountsChanged", (accounts) => {
    if (!accounts || accounts.length === 0) {
      _onDisconnect();
    } else {
      window.Wallet.addr = accounts[0];
      _updateWalletUI();
    }
  });

  _baseProvider.on("chainChanged", (chainId) => {
    if (CONFIG.debug) console.log("[wallet] chain changed to", chainId);
  });

  return _baseProvider;
}

// ── Connect wallet ────────────────────────────────────────────────────────────
async function connectWallet() {
  try {
    const provider = _getBaseProvider();

    try {
      await provider.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: CONFIG.chainId }],
      });
    } catch (switchErr) {
      if (switchErr.code === 4902) {
        await provider.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: CONFIG.chainId,
              chainName: CONFIG.networkName,
              nativeCurrency: { name: "ETH", symbol: "ETH", decimals: 18 },
              rpcUrls: [CONFIG.rpcUrl],
              blockExplorerUrls: [CONFIG.explorerUrl],
            },
          ],
        });
      }
    }

    const accounts = await provider.request({ method: "eth_requestAccounts" });
    if (!accounts || accounts.length === 0) throw new Error("No accounts returned");

    window.Wallet.addr = accounts[0];
    window.ethereum = provider;

    _updateWalletUI();
    closeWalletModal();

    if (CONFIG.debug) console.log("[wallet] connected:", window.Wallet.addr);
    showToast(`Connected to ${CONFIG.networkName}`, 3000);

    setTimeout(() => {
      if (typeof checkStuckEth === "function") checkStuckEth();
    }, 1000);

    return window.Wallet.addr;
  } catch (e) {
    if (e.code === 4001) {
      showToast("Connection cancelled", 3000);
    } else {
      showToast("Connect failed: " + e.message, 5000);
    }
    throw e;
  }
}

// ── Disconnect ────────────────────────────────────────────────────────────────
function disconnectWallet() {
  _onDisconnect();
  showToast("Wallet disconnected", 2000);
}

function _onDisconnect() {
  window.Wallet.addr = null;
  _updateWalletUI();
  if (CONFIG.debug) console.log("[wallet] disconnected");
}

// ── Update wallet UI elements ─────────────────────────────────────────────────
function _updateWalletUI() {
  const connected = !!window.Wallet.addr;
  const addr = window.Wallet.addr || "";
  const short = connected ? addr.slice(0, 5) + "..." + addr.slice(-5) : "";

  const btn = document.getElementById("wb-btn");
  if (btn) {
    btn.textContent = connected ? short : "CONNECT";
    btn.style.color = connected ? "var(--green, #00ff88)" : "";
    btn.style.fontSize = connected ? "0.62rem" : "";
  }

  const wmConnected = document.getElementById("wm-connected");
  const wmDisconnected = document.getElementById("wm-disconnected");
  const wmTitle = document.getElementById("wm-title");
  const wmAddrFull = document.getElementById("wm-addr-full");
  const wmNetworkLabel = document.getElementById("wm-network-label");

  if (wmConnected) wmConnected.style.display = connected ? "" : "none";
  if (wmDisconnected) wmDisconnected.style.display = connected ? "none" : "";
  if (wmTitle) wmTitle.textContent = connected ? "WALLET" : "CONNECT";
  if (wmAddrFull) wmAddrFull.textContent = connected ? short : "—";
  if (wmNetworkLabel) wmNetworkLabel.textContent = CONFIG.networkName;

  const balEl = document.getElementById("wm-bal");
  if (balEl) {
    if (connected) {
      balEl.textContent = "…";
      fetch(CONFIG.rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_getBalance",
          params: [window.Wallet.addr, "latest"],
        }),
      })
        .then((r) => r.json())
        .then((j) => {
          const balanceEth = (parseInt(j.result, 16) / 1e18).toFixed(6);
          balEl.textContent = balanceEth + " ETH";
        })
        .catch(() => {
          balEl.textContent = "—";
        });
    } else {
      balEl.textContent = "—";
    }
  }

  // --- CHECK CLAIMABLE WINNINGS ---
  const actionArea = document.getElementById('wallet-actions-area');
  const withdrawSec = document.getElementById('withdraw-section');
  const claimableText = document.getElementById('claimable-bal');

  if (connected && actionArea) {
    actionArea.style.display = 'block';

    // getClaimableBalance should be in your contract.js
    if (typeof getClaimableBalance === 'function') {
      getClaimableBalance(window.Wallet.addr).then(claimableWei => {
        const claimableEth = Number(claimableWei) / 1e18;
        if (claimableEth > 0) {
          withdrawSec.style.display = 'block';
          claimableText.textContent = claimableEth.toFixed(5);
        } else {
          withdrawSec.style.display = 'none';
        }
      });
    }
  } else if (actionArea) {
    actionArea.style.display = 'none';
  }

  document.querySelectorAll(".wallet-addr").forEach((el) => {
    el.textContent = short;
  });

  document.querySelectorAll("[data-wallet-required]").forEach((el) => {
    el.style.display = connected ? "" : "none";
  });

  const testnetWarning = document.getElementById("testnet-warning");
  if (testnetWarning) {
    testnetWarning.style.display = CONFIG.isTestnet ? "" : "none";
  }
}

// ── Copy wallet address ───────────────────────────────────────────────────────
function copyWalletAddr() {
  const addr = window.Wallet.addr;
  if (!addr) return;

  navigator.clipboard
    .writeText(addr)
    .then(() => {
      const icon = document.getElementById("wm-copy-icon");
      const ok = document.getElementById("wm-copy-ok");
      if (icon) icon.style.opacity = "0";
      if (ok) {
        ok.style.opacity = "1";
        setTimeout(() => {
          ok.style.opacity = "0";
          if (icon) icon.style.opacity = "0.5";
        }, 1500);
      }
      showToast("Address copied!", 2000);
    })
    .catch(() => {
      const el = document.createElement("textarea");
      el.value = addr;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      showToast("Address copied!", 2000);
    });
}

// ── Action Handlers ───────────────────────────────────────────────────────────
async function handleWithdraw() {
  if (!window.Wallet.addr) return;

  try {
    // ADD THIS CHECK: Verify the balance isn't zero before requesting
    if (typeof getClaimableBalance === 'function') {
      const currentBal = await getClaimableBalance(window.Wallet.addr);
      if (currentBal == 0n) {
        showToast("No ETH to withdraw. Check if you're in the right wallet!", 4000);
        return;
      }
    }
    showToast("Requesting withdrawal...", 2000);
    const hash = await txWithdraw(window.Wallet.addr);
    showToast("Processing... please wait.", 5000);

    await waitReceipt(hash);
    showToast("ETH sent to your wallet! 🎉", 5000);

    _updateWalletUI(); // Refresh to hide button
  } catch (e) {
    console.error("[handleWithdraw] Error:", e);
    showToast("Withdrawal failed: " + (e.reason || "Transaction rejected"), 5000);
  }
}

// ── Wallet modal ──────────────────────────────────────────────────────────────
function openWalletModal() {
  if (window.Wallet.addr) {
    const modal = document.getElementById("wallet-modal");
    if (modal) {
      _updateWalletUI();
      modal.classList.add("open");
    }
    return;
  }
  connectWallet().catch(() => {});
}

function closeWalletModal() {
  const modal = document.getElementById("wallet-modal");
  if (modal) modal.classList.remove("open");
}

// ── Auto-reconnect on page load ───────────────────────────────────────────────
window.addEventListener("load", async () => {
  try {
    const provider = _getBaseProvider();
    const accounts = await provider.request({ method: "eth_accounts" });
    if (accounts && accounts.length > 0) {
      window.Wallet.addr = accounts[0];
      window.ethereum = provider;
      _updateWalletUI();
      if (CONFIG.debug)
        console.log("[wallet] auto-reconnected:", window.Wallet.addr);
      setTimeout(() => {
        if (typeof checkStuckEth === "function") checkStuckEth();
      }, 1000);
    }
  } catch (e) {
    if (CONFIG.debug) console.log("[wallet] no prior session");
  }
});