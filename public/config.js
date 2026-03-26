// ─── config.js ───────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// Switch between Base Mainnet & Base Sepolia by changing NETWORK constant
// ──────────────────────────────────────────────────────────────────────────────

// ⚠️ CHANGE THIS to switch networks
const NETWORK = 'base-mainnet'; // Options: 'base-mainnet' | 'base-sepolia'

// ──────────────────────────────────────────────────────────────────────────────
// NETWORK CONFIGURATIONS
// ──────────────────────────────────────────────────────────────────────────────

const NETWORKS = {
  'base-sepolia': {
    name: 'Base Sepolia (Testnet)',
    chainId: '0x14a34',        // 84532 in decimal
    chainIdInt: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorerUrl: 'https://sepolia.basescan.org',
    contractAddress: '0xA50cd7cc647bBFf31EB86dF7D2F759e8dCd5F0eE', // REPLACE with your testnet contract
    isTestnet: true,
  },
  'base-mainnet': {
    name: 'Base Mainnet',
    chainId: '0x2105',         // 8453 in decimal
    chainIdInt: 8453,
    rpcUrl: 'https://mainnet.base.org',
    explorerUrl: 'https://basescan.org',
    contractAddress: '0xcab5d6DFa4910cEdfbf7a0eB73B779e92D28780D', // REPLACE with your mainnet contract
    isTestnet: false,
  },
};

// Get active network config
const ACTIVE_NETWORK = NETWORKS[NETWORK];

if (!ACTIVE_NETWORK) {
  throw new Error(`Invalid NETWORK: "${NETWORK}". Choose: base-mainnet | base-sepolia`);
}

// ──────────────────────────────────────────────────────────────────────────────
// EXPORT CONFIGURATION
// ──────────────────────────────────────────────────────────────────────────────

const CONFIG = {
  // Network
  network: NETWORK,
  chainId: ACTIVE_NETWORK.chainId,
  chainIdInt: ACTIVE_NETWORK.chainIdInt,
  rpcUrl: ACTIVE_NETWORK.rpcUrl,
  explorerUrl: ACTIVE_NETWORK.explorerUrl,
  networkName: ACTIVE_NETWORK.name,
  isTestnet: ACTIVE_NETWORK.isTestnet,

  // Contract
  contractAddress: ACTIVE_NETWORK.contractAddress,

  // Game Constants
  stake: '0xb5e620f48000',      // 0.0002 ETH in wei
  stakeAmount: 0.0002,
  stakeFormatted: '0.0002 ETH',
  maxStakeBps: 1000,             // 10% max fee

  // Timeouts (in seconds)
  cancelTimeout: 3600,           // 1 hour
  gameTimeout: 86400,            // 24 hours

  // App Info
  appName: 'DOTZ',
  appLogoUrl: 'https://dotz.repl.co/icon.png', // Update to your domain
  relayerUrl: 'https://relayerdotz-production.up.railway.app',

  // Feature Flags
  features: {
    walletConnect: true,
    inviteFriends: true,
    freeMode: true,
    botMode: true,
    stakingMode: true,
  },

  // Logging
  debug: true,
};

// Helper: Get explorer URL for tx/address
CONFIG.getExplorerTxUrl = (hash) => `${CONFIG.explorerUrl}/tx/${hash}`;
CONFIG.getExplorerAddrUrl = (addr) => `${CONFIG.explorerUrl}/address/${addr}`;

// Log which network is active
if (typeof window !== 'undefined') {
  console.log(`%c⬟ DOTZ active network: ${CONFIG.networkName}`, 'color: #4488ff; font-weight: bold;');
  if (CONFIG.isTestnet) {
    console.warn('⚠️ TESTNET MODE - Use test ETH only!');
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CONFIG;
}
// ──────────────────────────────────────────────────────────────────────────────
// GLOBAL ALIASES (Fixes "is not defined" errors in matchmaking.js and ui.js)
// ──────────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // Network & Contract
  window.CONTRACT_ADDR = CONFIG.contractAddress;
  window.CHAIN_ID = CONFIG.chainId;
  window.CHAIN_ID_INT = CONFIG.chainIdInt;
  window.RPC_URL = CONFIG.rpcUrl;

  // Staking
  window.STAKE_WEI = CONFIG.stake;
  window.STAKE_AMOUNT = CONFIG.stakeAmount;
  window.STAKE_FORMATTED = CONFIG.stakeFormatted;

  // App Info
  window.APP_NAME = CONFIG.appName;

  console.log('✅ Global config aliases initialized.');
}
// ──────────────────────────────────────────────────────────────────────────────
// CONTRACT LOCKDOWN - Fixes "Execution Reverted" on isActive check
// ──────────────────────────────────────────────────────────────────────────────

const ACTUAL_CA = "0xcab5d6DFa4910cEdfbf7a0eB73B779e92D28780D"; // <-- MUST BE YOUR ACTUAL CONTRACT ADDRESS

// ──────────────────────────────────────────────────────────────────────────────
// MATCHMAKING SHIM - Fixes the "Execution Reverted" after Success
// ──────────────────────────────────────────────────────────────────────────────

// ──────────────────────────────────────────────────────────────────────────────
// MATCHMAKING SHIM: Fixes "Execution Reverted" after Successful Stake
// ──────────────────────────────────────────────────────────────────────────────

if (typeof window !== 'undefined') {
  // 1. Lock the Contract Address for all global calls
  window.CONTRACT_ADDR = "0xcab5d6DFa4910cEdfbf7a0eB73B779e92D28780D";

  // 2. Ensure Stake and Chain globals are strictly defined
  window.STAKE_WEI = "0xb5e620f48000"; 
  window.CHAIN_ID = "0x2105"; 

  // 3. Fix: The 'eth_call' check in matchmaking.js often reverts if 
  // the 'to' address or 'data' formatting is slightly off during a dry-run.
  // By locking window.CONTRACT_ADDR above, we ensure 'eth_call' hits the CA.

  console.log("🚀 Matchmaking Shims Applied. Ready to play.");
}