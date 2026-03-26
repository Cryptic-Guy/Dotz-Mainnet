# 🎮 DOTZ - New Smart Contract Integration Package

## 📦 What You Received

Complete, production-ready integration of the new **DotWarsEscrow** smart contract with:
- ✅ Centralized configuration system
- ✅ One-file network switching (testnet ↔ mainnet)
- ✅ Secure environment setup (.env + .gitignore)
- ✅ Full documentation
- ✅ Migration guide from old contract

---

## 🚀 5-Minute Setup

### 1. Copy Files
Replace your old files with these new ones:
- `config.js` (NEW)
- `contract.js` (UPDATED)
- `wallet.js` (UPDATED)
- `index.html` (UPDATED)
- `.env.example` (NEW)
- `.gitignore` (NEW)

### 2. Create .env
```bash
cp .env.example .env
```

### 3. Update Contract Addresses in config.js

Find lines 35-50 and update:
```javascript
'base-sepolia': {
  contractAddress: 'YOUR_TESTNET_CONTRACT_ADDRESS_HERE',
},
'base-mainnet': {
  contractAddress: 'YOUR_MAINNET_CONTRACT_ADDRESS_HERE',
},
```

### 4. Select Network in config.js

Line 5 - Change this to switch networks:
```javascript
const NETWORK = 'base-sepolia';  // For testing
// Change to 'base-mainnet' when ready for production
```

### 5. Start!
```bash
npm install && npm run dev
```

---

## 🔄 Network Switching (The Magic)

### Test on Base Sepolia (Testnet)
```javascript
// config.js, line 5
const NETWORK = 'base-sepolia';
```
✅ Auto-switches everything (RPC, Chain ID, Explorer, Contract address)

### Go Live on Base Mainnet
```javascript
// config.js, line 5
const NETWORK = 'base-mainnet';
```
✅ Auto-switches everything for production

---

## 📁 Files Explained

| File | Purpose | Edit? |
|------|---------|-------|
| **config.js** | 🔑 MAIN CONFIG - Network/contract settings | **YES - Update contract addresses** |
| **contract.js** | Smart contract integration (reads from config.js) | Only if adding new functions |
| **wallet.js** | Wallet connection (reads from config.js) | Only if changing UI |
| **index.html** | HTML template | Only if changing UI |
| **.env** | Environment variables (NEVER commit) | For production deployment |
| **.gitignore** | Git ignore rules | No (protects .env) |
| **README.md** | Full documentation | Reference only |
| **INTEGRATION.md** | This integration guide | Reference only |
| **MIGRATION.md** | Old → New contract migration | Reference only |

---

## 🧪 Testing Flow

```
1. Deploy to Base Sepolia
   ↓
2. Update config.js with testnet contract address
   ↓
3. Set NETWORK = 'base-sepolia' in config.js
   ↓
4. Test full game flow (create, join, win, withdraw)
   ↓
5. Verify all transactions on https://sepolia.basescan.org
   ↓
6. Deploy to Base Mainnet
   ↓
7. Update config.js with mainnet contract address
   ↓
8. Set NETWORK = 'base-mainnet' in config.js
   ↓
9. Build: npm run build
   ↓
10. Deploy dist/ folder to production
```

---

## 💡 Key Changes from Old Contract

| Feature | Old | New |
|---------|-----|-----|
| Match creation | Basic | ✅ Fee snapshotted |
| Winner payout | Immediate | ✅ Pull-payment (safer) |
| Escape hatches | Limited | ✅ Timeout after 24h |
| Draw support | ❌ | ✅ Supported |
| State tracking | Implicit | ✅ Explicit (Enum) |
| Reentrancy protection | ❌ | ✅ Protected |
| Pausable | ❌ | ✅ Owner can pause |

---

## 🔐 Security

### What's Protected:
- ✅ `.env` file (secrets never in git)
- ✅ Private keys (in .gitignore)
- ✅ Contract addresses (only in config.js)

### Before Publishing to GitHub:
```bash
# Verify .env is in .gitignore:
cat .gitignore

# Should show: .env, .env.local, private_key.txt, etc.

# NEVER commit:
- .env
- Private keys
- API keys
```

---

## 📊 Contract Integration

### Functions Available:
```javascript
txCreateMatch(addr)           // Create match (stake 0.0002 ETH)
txJoinMatch(addr, matchId)    // Join match
txCancelMatch(addr, matchId)  // Refund if abandoned (after 1h)
txTimeoutMatch(addr, matchId) // Escape hatch (after 24h)
txWithdraw(addr)              // Claim winnings
waitReceipt(hash)             // Wait for transaction
parseMatchId(receipt)         // Extract matchId from logs
```

### Automatic Features:
- ✅ Network switching (reads from config.js)
- ✅ Chain verification (ensures you're on right network)
- ✅ Balance checking (fetches via RPC)
- ✅ Transaction monitoring (polls every 2s)
- ✅ Error handling (informative messages)

---

## 🎯 Deployment Checklist

### Testnet (Base Sepolia)
- [ ] Contract deployed to Base Sepolia
- [ ] `config.js` has testnet contract address
- [ ] `NETWORK = 'base-sepolia'` in config.js
- [ ] Get testnet ETH from faucet
- [ ] Test: Create match
- [ ] Test: Join match
- [ ] Test: Withdraw
- [ ] Verify transactions on Sepolia Basescan

### Production (Base Mainnet)
- [ ] Contract deployed to Base Mainnet
- [ ] Contract verified on Basescan
- [ ] `config.js` has mainnet contract address
- [ ] `NETWORK = 'base-mainnet'` in config.js
- [ ] `npm run build` succeeds
- [ ] Test full flow on mainnet
- [ ] Deploy `dist/` folder
- [ ] Set environment variables in hosting

---

## 🐛 Common Issues & Fixes

### "Wrong chain, switch to Base Sepolia"
→ Check `config.js` NETWORK constant
→ Check contract address is on that network

### "Contract address not found"
→ Verify contract is deployed to that address
→ Check Basescan contract exists
→ Verify contract address matches `config.js`

### "Insufficient funds"
→ Need at least 0.0002 ETH + gas
→ Get testnet ETH from faucet
→ Check balance in wallet

### Changes not showing
→ Clear browser cache (Ctrl+Shift+Delete)
→ Rebuild project (`npm run build`)
→ Check CONFIG in browser console

---

## 📞 Documentation Files

1. **INTEGRATION.md** ← Start here! Complete setup guide
2. **README.md** ← Full documentation
3. **MIGRATION.md** ← Old to new contract migration
4. **config.js** ← Inline comments explain every setting

---

## ✅ You're Ready When:

- ✅ Files copied to your project
- ✅ `.env` created (in `.gitignore`)
- ✅ Contract deployed to Base Sepolia
- ✅ `config.js` updated with testnet address
- ✅ `NETWORK = 'base-sepolia'` in config.js
- ✅ Test game works on testnet
- ✅ Contract deployed to Base Mainnet
- ✅ `config.js` updated with mainnet address
- ✅ `NETWORK = 'base-mainnet'` in config.js
- ✅ Ready to deploy to production

---

## 🚀 Next Steps

1. Read `INTEGRATION.md` (complete step-by-step)
2. Copy files to your project
3. Update `config.js` with your contract addresses
4. Test on Base Sepolia
5. Deploy to Base Mainnet when ready

---

## 🎮 One-Liner to Remember

> **To switch between testnet and mainnet: Change ONE line in config.js!**

```javascript
const NETWORK = 'base-sepolia';  // ← Change this
```

That's it. Everything else is automatic! 🚀

---

**Questions?** Check the docs:
- `INTEGRATION.md` - Setup & common tasks
- `README.md` - Full documentation  
- `MIGRATION.md` - Old vs new contract
- `config.js` - Inline comments

**Ready to deploy?** 🎉
