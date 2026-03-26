# DOTZ · On-Chain 1v1 Dots Game

A fully on-chain, 1v1 competitive dots game with staked ETH prizes, powered by **Base Mainnet** & **Base Sepolia**.

## 🎮 Features

- **Staked PVP**: Play with 0.0002 ETH stakes, winner takes the pot
- **Free PVP**: Play without wallet connection
- **Invite Friends**: Share invite codes with custom matchmaking
- **Bot Practice**: Train against AI
- **On-Chain Results**: All game outcomes recorded on Base blockchain
- **Multi-Network Support**: Easy switching between testnet & mainnet

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/your-username/dotz.git
cd dotz
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and update with your contract addresses:

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_NETWORK=base-sepolia
VITE_CONTRACT_ADDRESS_SEPOLIA=0x5538D342FFD851e519f116d4A26EEB1B11594f27
VITE_CONTRACT_ADDRESS_MAINNET=0x716FC46cEbb5B5E9e8c9093052cFA6ee2d7172f5
```

### 3. Update Network Config

Edit `config.js` to switch between networks:

```javascript
// Line 5 in config.js
const NETWORK = 'base-sepolia'; // Change to 'base-mainnet' for production
```

### 4. Start Development Server

```bash
npm run dev
```

Visit `http://localhost:5173`

## 🔄 Network Switching

### Testing on Base Sepolia (Testnet)

1. **Edit `config.js`**:
   ```javascript
   const NETWORK = 'base-sepolia';
   ```

2. **Update your contract address** in the same file:
   ```javascript
   'base-sepolia': {
     contractAddress: '0x5538D342FFD851e519f116d4A26EEB1B11594f27', // Your testnet contract
   }
   ```

3. **Get testnet ETH**: [Faucet link](https://www.base.org/docs/tools/faucets)

### Going Live on Base Mainnet

1. **Deploy your contract** to Base Mainnet

2. **Edit `config.js`**:
   ```javascript
   const NETWORK = 'base-mainnet';
   ```

3. **Update contract address**:
   ```javascript
   'base-mainnet': {
     contractAddress: '0x716FC46cEbb5B5E9e8c9093052cFA6ee2d7172f5', // Your mainnet contract
   }
   ```

4. **Rebuild & deploy**:
   ```bash
   npm run build
   ```

## 📁 File Structure

```
dotz/
├── config.js              # 🔑 MAIN CONFIG - Switch networks here
├── contract.js            # Smart contract integration (uses config.js)
├── wallet.js              # Wallet connection (uses config.js)
├── game.js                # Game logic
├── matchmaking.js         # Matchmaking system
├── ui.js                  # UI interactions
├── index.html             # HTML template
├── style.css              # Styling
├── .env.example           # Environment template (NEVER commit .env)
├── .gitignore             # Git ignore rules
└── package.json           # Dependencies
```

## 🔐 Security & Secrets

### Never commit `.env` to git!

`.gitignore` already protects:
- `.env`
- `.env.local`
- `private_key.txt`
- `secrets/`

### Before pushing to GitHub:

1. Check `.env` is in `.gitignore` ✓
2. Never commit private keys
3. Use environment variables for sensitive config

## 🛠️ Configuration Details

### config.js Structure

```javascript
CONFIG = {
  // Network settings (auto-set based on NETWORK constant)
  network: 'base-sepolia',
  chainId: '0x14a34',
  chainIdInt: 84532,
  rpcUrl: 'https://sepolia.base.org',
  explorerUrl: 'https://sepolia.basescan.org',
  
  // Contract & game
  contractAddress: '0x5538D342FFD851e519f116d4A26EEB1B11594f27',
  stake: '0xb5e620f48000', // 0.0002 ETH
  
  // Timeouts
  cancelTimeout: 3600,    // 1 hour
  gameTimeout: 86400,     // 24 hours
  
  // Helpers
  getExplorerTxUrl: (hash) => '...',
  getExplorerAddrUrl: (addr) => '...',
}
```

### Using CONFIG in Your Code

```javascript
// contract.js automatically uses it
await txCreateMatch(window.Wallet.addr); // Uses CONFIG.contractAddress

// wallet.js uses it for network switching
connectWallet(); // Switches to CONFIG.chainId

// Anywhere in app:
console.log(CONFIG.networkName); // "Base Sepolia (Testnet)"
console.log(CONFIG.stakeFormatted); // "0.0002 ETH"
```

## 📝 Smart Contract Integration

### Supported Functions

- `createMatch()` - Start a game (stake 0.0002 ETH)
- `joinMatch(uint64 matchId)` - Join existing match
- `cancelMatch(uint64 matchId)` - Refund if no one joined (after 1h)
- `timeoutActiveMatch(uint64 matchId)` - Escape hatch (after 24h)
- `withdraw()` - Claim winnings
- `declareWinner()` - Called by relayer only
- `declareDraw()` - Mark game as draw

### Current Contract Addresses

| Network | Address | Status |
|---------|---------|--------|
| **Base Sepolia** | `0x5538D342FFD851e519f116d4A26EEB1B11594f27` | ✅ Testnet |
| **Base Mainnet** | `0x716FC46cEbb5B5E9e8c9093052cFA6ee2d7172f5` | ✅ Live |

## 🐛 Debug Mode

Enable debug logging:

```javascript
// In config.js
const CONFIG = {
  debug: true, // Set to false in production
}
```

Browser console will show:
```
⬟ DOTZ active network: Base Sepolia (Testnet)
[wallet] auto-reconnected: 0xeC1...3B46
[contract] Switched to Base Sepolia
[txCreateMatch] sent, hash: 0x1234...
```

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

Outputs to `dist/` folder ready for:
- Vercel
- Netlify
- Railway
- GitHub Pages

### Environment Variables in Production

Set these in your hosting platform:

```env
VITE_NETWORK=base-mainnet
VITE_CONTRACT_ADDRESS_MAINNET=0x716FC46cEbb5B5E9e8c9093052cFA6ee2d7172f5
VITE_APP_LOGO_URL=https://your-domain.com/icon.png
```

## 🔗 Useful Links

- **Base Documentation**: https://docs.base.org
- **Base Sepolia Faucet**: https://docs.base.org/docs/tools/faucets
- **Basescan Explorer**: https://basescan.org
- **Sepolia Explorer**: https://sepolia.basescan.org

## ⚠️ Testnet Disclaimer

- Use **testnet ETH only** on Base Sepolia
- Do NOT use real funds for testing
- Contract addresses may change during development

## 💡 Common Tasks

### Add a new game mode

Edit `config.js`:
```javascript
features: {
  walletConnect: true,
  inviteFriends: true,
  freeMode: true,
  botMode: true,
  stakingMode: true,
  // newMode: true, // Add here
}
```

### Change stake amount

Update in `config.js`:
```javascript
stake: '0xb5e620f48000', // Wei amount
stakeAmount: 0.0002,
stakeFormatted: '0.0002 ETH',
```

### Update contract address

Update in both locations:
1. `config.js` - for contract interaction
2. Index.html meta tags - for app info

## 📞 Support

- Check browser console for debug logs
- Visit contract on Basescan for transaction details
- Use `CONFIG.getExplorerTxUrl(hash)` for explorer links

## 📄 License

MIT

---

**Built with ❤️ on Base**
