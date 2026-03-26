# 🔗 DOTZ Integration Guide - New Smart Contract

## ✨ What You're Getting

This package includes **complete integration** of the new `DotWarsEscrow` smart contract with a **centralized configuration system**. You can now:

✅ Switch between **Base Sepolia (Testnet)** and **Base Mainnet** in ONE file  
✅ Deploy to testnet, verify everything works, then go live on mainnet  
✅ Update contract addresses without touching any other code  
✅ Keep secrets out of git (`.env` and `.gitignore` included)  
✅ Full debugging and logging for transparency  

---

## 📁 Files Included

| File | Purpose |
|------|---------|
| **config.js** | 🔑 MAIN CONFIG - Change NETWORK here to switch between testnet/mainnet |
| **contract.js** | Updated to use config.js, supports all new contract functions |
| **wallet.js** | Updated to use config.js for network switching |
| **index.html** | Updated script order (config.js loads first) |
| **.env.example** | Template for environment variables (copy to .env) |
| **.gitignore** | Protects .env and private keys |
| **README.md** | Full documentation |
| **MIGRATION.md** | Old → New contract migration guide |
| **setup.sh** | One-line setup script |

---

## 🚀 Quick Integration (5 Steps)

### Step 1: Copy Files to Your Project

```bash
# Replace your existing files with these new ones:
- config.js          (NEW - add this!)
- contract.js        (REPLACE - updated)
- wallet.js          (REPLACE - updated)
- index.html         (REPLACE - updated)
- .env.example       (NEW - add this!)
- .gitignore         (NEW - add this!)
```

### Step 2: Copy .env Template & Create .env

```bash
cp .env.example .env
```

Edit `.env` and update:
```env
VITE_NETWORK=base-sepolia
VITE_CONTRACT_ADDRESS_SEPOLIA=0x5538D342FFD851e519f116d4A26EEB1B11594f27
VITE_CONTRACT_ADDRESS_MAINNET=0x716FC46cEbb5B5E9e8c9093052cFA6ee2d7172f5
```

**DO NOT commit .env to git!** (It's in .gitignore)

### Step 3: Update config.js with Your Contract Addresses

Open `config.js` and find this section (around line 35):

```javascript
const NETWORKS = {
  'base-sepolia': {
    // ... other settings ...
    contractAddress: '0x5538D342FFD851e519f116d4A26EEB1B11594f27', // ← REPLACE with your testnet contract
  },
  'base-mainnet': {
    // ... other settings ...
    contractAddress: '0x716FC46cEbb5B5E9e8c9093052cFA6ee2d7172f5', // ← REPLACE with your mainnet contract
  },
};
```

### Step 4: Update NETWORK Constant in config.js

Find line ~5:
```javascript
const NETWORK = 'base-sepolia'; // ← START HERE FOR TESTING
// Change to 'base-mainnet' when ready for production
```

### Step 5: Verify index.html Script Order

Check that `config.js` loads **FIRST** (it already does in the new index.html):

```html
<script src="config.js"></script>      <!-- ✅ First -->
<script src="contract.js"></script>    <!-- ✅ Uses CONFIG -->
<script src="wallet.js"></script>      <!-- ✅ Uses CONFIG -->
<script src="game.js"></script>
<script src="matchmaking.js"></script>
<script src="ui.js"></script>
```

---

## 🔄 Network Switching (The Magic Part!)

### To Test on Base Sepolia:

**Edit config.js, line ~5:**
```javascript
const NETWORK = 'base-sepolia';
```

That's it! Everything else is automatic:
- ✅ RPC URL switches to `https://sepolia.base.org`
- ✅ Chain ID switches to `0x14a34` (84532)
- ✅ Explorer switches to `sepolia.basescan.org`
- ✅ Contract address switches to your testnet address
- ✅ Wallet automatically prompts user to switch networks

### To Go Live on Base Mainnet:

**Edit config.js, line ~5:**
```javascript
const NETWORK = 'base-mainnet';
```

Again, everything else is automatic:
- ✅ RPC URL switches to `https://mainnet.base.org`
- ✅ Chain ID switches to `0x2105` (8453)
- ✅ Explorer switches to `basescan.org`
- ✅ Contract address switches to your mainnet address

---

## 🧪 Testing Checklist

### On Base Sepolia (Testnet)

- [ ] config.js set to `'base-sepolia'`
- [ ] config.js has your **testnet** contract address
- [ ] Get testnet ETH from [faucet](https://docs.base.org/docs/tools/faucets)
- [ ] Connect wallet → should prompt Base Sepolia
- [ ] Test: Create match (0.0002 ETH)
- [ ] Test: Join match
- [ ] Test: Withdraw winnings
- [ ] Verify on [Sepolia Basescan](https://sepolia.basescan.org)

### Before Going Live on Mainnet

- [ ] Contract deployed to Base Mainnet
- [ ] Contract verified on [Basescan](https://basescan.org)
- [ ] config.js set to `'base-mainnet'`
- [ ] config.js has your **mainnet** contract address
- [ ] Build for production: `npm run build`
- [ ] Test full game flow on mainnet
- [ ] Deploy website to production

---

## 📊 How config.js Works

### When You Load the Page:

1. Browser loads `config.js`
2. Reads `const NETWORK = 'base-sepolia'` (or 'base-mainnet')
3. Sets up `CONFIG` object with all network-specific values
4. Every other script reads from `CONFIG`

### Example Usage in Your Code:

```javascript
// In contract.js:
const txHash = await _provider().request({
  method: 'eth_sendTransaction',
  params: [{
    from: address,
    to: CONFIG.contractAddress,      // 👈 Comes from config.js
    value: CONFIG.stake,              // 👈 Comes from config.js
    data: SIG_CREATE_MATCH,
  }]
});

// In wallet.js:
await _baseProvider.request({
  method: 'wallet_switchEthereumChain',
  params: [{ chainId: CONFIG.chainId }],  // 👈 Comes from config.js
});
```

### What CONFIG Provides:

```javascript
CONFIG = {
  // Network info
  network: 'base-sepolia',
  chainId: '0x14a34',
  chainIdInt: 84532,
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  networkName: 'Base Sepolia (Testnet)',
  isTestnet: true,
  
  // Contract
  contractAddress: '0x5538D342FFD851e519f116d4A26EEB1B11594f27',
  
  // Game settings
  stake: '0xb5e620f48000',
  stakeFormatted: '0.0002 ETH',
  
  // Helpers
  getExplorerTxUrl: (hash) => '...',
  getExplorerAddrUrl: (addr) => '...',
}
```

---

## 🔐 Keeping Secrets Safe

### .env File (NEVER Commit!)

`.env` is in `.gitignore`, so it won't be committed to git:

```env
# .env (local only, not in git)
VITE_NETWORK=base-sepolia
VITE_CONTRACT_ADDRESS_SEPOLIA=0x5538D342FFD851e519f116d4A26EEB1B11594f27
```

### Before Pushing to GitHub:

```bash
# Check these are in .gitignore:
cat .gitignore

# Should include:
.env
.env.local
*.env
private_key.txt
secrets/
```

### For Deployment (Vercel, Railway, etc):

Set environment variables in your hosting dashboard:
- No `.env` file needed
- Platform reads from Settings → Environment Variables

---

## 🛠️ Common Tasks

### Add a New Network (e.g., Base Goerli)

1. Edit `config.js`:
```javascript
const NETWORKS = {
  'base-goerli': {
    name: 'Base Goerli',
    chainId: '0x14a3',
    chainIdInt: 5303,
    rpcUrl: 'https://goerli.base.org',
    explorerUrl: 'https://goerli.basescan.org',
    contractAddress: '0x...your-goerli-contract...',
    isTestnet: true,
  },
  // ... other networks ...
};
```

2. Change the NETWORK constant:
```javascript
const NETWORK = 'base-goerli';
```

### Change Stake Amount

Edit `config.js` around line 68:
```javascript
stake: '0x1bc16d674ec80000',    // New amount in wei
stakeAmount: 0.0008,             // Human readable
stakeFormatted: '0.0008 ETH',    // For UI
```

### Change Max Fee

Edit `config.js`:
```javascript
maxStakeBps: 500,  // 5% max (was 1000 = 10%)
```

### Enable/Disable Features

Edit `config.js` around line 82:
```javascript
features: {
  walletConnect: true,
  inviteFriends: false,  // Disable invite feature
  freeMode: true,
  botMode: true,
  stakingMode: true,
}
```

---

## 🐛 Debugging

### Enable Debug Mode

Edit `config.js`:
```javascript
debug: true,  // Set to false in production
```

### Check Browser Console

You'll see messages like:
```
⬟ DOTZ active network: Base Sepolia (Testnet)
⚠️ TESTNET MODE - Use test ETH only!
[wallet] auto-reconnected: 0xeC1...3B46
[contract] Switched to Base Sepolia
[txCreateMatch] sent, hash: 0x1234...
```

### Get Contract Status Anywhere

```javascript
// Type in browser console:
console.log(getContractStatus());

// Output:
{
  network: "Base Sepolia (Testnet)",
  isTestnet: true,
  contractAddress: "0x5538D342FFD851e519f116d4A26EEB1B11594f27",
  chainId: "0x14a34",
  rpcUrl: "https://sepolia.base.org",
  stake: "0.0002 ETH"
}
```

---

## 📋 New Smart Contract Functions

All functions now integrated and use `CONFIG.contractAddress`:

```javascript
// Create a match (P1 stakes)
await txCreateMatch(walletAddress)
// emits: MatchCreated(matchId)

// Join a match (P2 stakes)
await txJoinMatch(walletAddress, matchId)
// emits: MatchJoined()

// Cancel if no one joined (after 1h)
await txCancelMatch(walletAddress, matchId)
// emits: MatchCancelled()

// Escape hatch if relayer fails (after 24h)
await txTimeoutMatch(walletAddress, matchId)
// emits: MatchCancelled() with reason "Game Timeout"

// Withdraw winnings
await txWithdraw(walletAddress)
// emits: Withdrawal()

// Get user's ETH balance (helper)
const { ethBalance } = await getBalance(walletAddress)
```

---

## 📚 File Reference

### config.js
- **Purpose**: Single source of truth for all network/contract settings
- **When to edit**: To change network, contract address, or game settings
- **Never edit**: Function logic (that's in contract.js)

### contract.js
- **Purpose**: Smart contract interaction using config.js
- **When to edit**: To add new contract functions or change transaction logic
- **Never edit**: CONFIG is always read from config.js, not hardcoded

### wallet.js
- **Purpose**: MetaMask connection using config.js for network switching
- **When to edit**: To change wallet UI or add new wallet features
- **Never edit**: Chain/network values (use config.js)

### index.html
- **Purpose**: HTML template
- **When to edit**: To add new elements or change layout
- **Important**: Keep config.js first in script order!

---

## 🚀 Deployment Workflow

```bash
# 1. Test on testnet
# Edit config.js: const NETWORK = 'base-sepolia'
npm run dev
# Test thoroughly...

# 2. Deploy contract to mainnet
# (Use your deployment tools: Hardhat, Foundry, etc.)

# 3. Update config.js for mainnet
# Edit config.js: const NETWORK = 'base-mainnet'
# Edit config.js: update contractAddress for mainnet

# 4. Build for production
npm run build

# 5. Deploy dist/ folder to your hosting
# Set environment variables in hosting dashboard
```

---

## ✅ Checklist: You're Ready When...

- [ ] All files copied to your project
- [ ] `.env` created (and in `.gitignore`)
- [ ] Contract deployed to Base Sepolia
- [ ] `config.js` updated with testnet contract address
- [ ] `config.js` set to `NETWORK = 'base-sepolia'`
- [ ] Testnet games work end-to-end
- [ ] Can switch networks in one place
- [ ] Before deployment: contract deployed to Base Mainnet
- [ ] `config.js` updated with mainnet contract address
- [ ] `config.js` set to `NETWORK = 'base-mainnet'`
- [ ] Build is clean: `npm run build`

---

## 🆘 Troubleshooting

### "Wrong network" error
- Check `CONFIG.chainId` matches wallet's chain ID
- Check `config.js` has correct network selected

### Contract address not recognized
- Verify `config.js` has the right contract address
- Verify contract is deployed to that network
- Check Basescan that contract exists

### "createMatch() reverted"
- Check you have at least 0.0002 ETH
- Check you're on the right network (should prompt auto-switch)
- Check contract is not paused (owner can pause)

### Changes not taking effect
- Clear browser cache: Ctrl+Shift+Delete
- Rebuild: `npm run build`
- Check `CONFIG` in browser console

---

## 📞 Next Steps

1. **Read**: `README.md` for full documentation
2. **Read**: `MIGRATION.md` for old → new contract changes
3. **Run**: `setup.sh` for one-line setup
4. **Edit**: `config.js` with your contract addresses
5. **Test**: Full game flow on Base Sepolia
6. **Deploy**: When ready for mainnet

---

**You're all set! 🎮 Happy building!**
