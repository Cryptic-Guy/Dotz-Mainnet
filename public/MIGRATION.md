# Migration Guide: Old Contract → New DotWarsEscrow

## 📋 What Changed

### Old Contract (Implicit)
- Basic 1v1 matchmaking
- Simple win/loss tracking
- Limited escape hatches

### New Contract (DotWarsEscrow V1)
- ✅ Pull-payment pattern (safer)
- ✅ Fee snapshotting (transparent)
- ✅ Participant escape hatches (player-friendly)
- ✅ Draw support
- ✅ Relayer pattern (scalable)
- ✅ Pausable & ReentrancyGuard (secure)
- ✅ Owner controls for emergency

## 🔄 Function Mapping

| Old Function | New Function | Notes |
|--------------|--------------|-------|
| `startMatch()` | `createMatch()` | Same stakes (0.0002 ETH) |
| `joinMatch()` | `joinMatch(matchId)` | Now takes matchId |
| `reportWin()` | `declareWinner()` | Relayer-only |
| `withdraw()` | `withdraw()` | Same behavior |
| N/A | `cancelMatch()` | **NEW**: Refund if abandoned |
| N/A | `timeoutActiveMatch()` | **NEW**: Escape hatch |
| N/A | `declareDraw()` | **NEW**: Draw support |

## 🔑 Key Differences

### 1. Match State Management

**Old**:
```javascript
// Implicit state tracking
if (match.winner) { /* finished */ }
```

**New**:
```javascript
enum MatchState { 
  Waiting,    // Awaiting P2
  Active,     // Game in progress
  Finished,   // Declared winner
  Cancelled,  // Refunded
  Draw        // Both get stake back
}
```

### 2. Fee Handling

**Old**:
- Global fee applied at payout time
- Could change mid-game

**New**:
```javascript
// Fee snapshotted at match creation
Match {
  uint16 matchFeeBps;  // Immutable per match
}
```

✅ **Benefit**: Fair for all players, predictable

### 3. Winner Declaration

**Old** (assumed):
- Direct payout on winner declaration
- Could fail mid-transfer

**New**:
```javascript
// Pull-payment pattern
1. declareWinner() → updates balances[winner]
2. player calls withdraw() → receives ETH
```

✅ **Benefit**: Safer, no re-entrancy risks

### 4. Escape Hatches

**Old**:
- Limited recovery options

**New**:
```javascript
// Player 1 can cancel after 1 hour if P2 never joined
cancelMatch(matchId)

// Either player can timeout after 24 hours if relayer fails
timeoutActiveMatch(matchId) // Both get stakes back
```

✅ **Benefit**: Players never lose funds to stuck games

## 📊 Data Migration Strategy

### Option 1: Fresh Start (Recommended)
- Old contract: Stop accepting new matches
- New contract: Launch as "Season 2"
- Old players: Manual refund from old contract
- **Timeline**: Cleanest, no migration complexity

### Option 2: Migrate User Data
- Export old player balances/stats
- Load into new system
- Use multi-sig to distribute unclaimed ETH
- **Timeline**: More complex, but preserves history

## 🧪 Testing the New Contract

### 1. Deploy to Base Sepolia

```bash
# Using your Solidity tooling (Hardhat/Foundry)
npx hardhat deploy --network baseSepolia

# Note the contract address
# Example: 0x5538D342FFD851e519f116d4A26EEB1B11594f27
```

### 2. Update config.js

```javascript
'base-sepolia': {
  contractAddress: '0x5538D342FFD851e519f116d4A26EEB1B11594f27',
}
```

### 3. Test Each Function

```javascript
// Test createMatch
await txCreateMatch(myAddress)
// Should emit MatchCreated with matchId

// Test joinMatch
await txJoinMatch(myAddress, matchId)
// Should emit MatchJoined, set state to Active

// Test cancelMatch (after 1h)
await txCancelMatch(myAddress, matchId)
// Should refund P1

// Test withdraw
await txWithdraw(myAddress)
// Should transfer balance to wallet
```

### 4. Verify on Basescan

https://sepolia.basescan.org/address/0x5538D342FFD851e519f116d4A26EEB1B11594f27

## 🎮 Game Flow Changes

### Before (Old Contract)

```
1. P1: createMatch() [stake]
2. P2: joinMatch() [stake]
3. Game plays...
4. Relayer: reportWin(winner)
5. Winner: receive payout immediately
```

### After (New Contract)

```
1. P1: createMatch() [stake, fee snapshotted]
2. P2: joinMatch() [stake]
3. Game plays...
4. Relayer: declareWinner(winner)
   - balances[winner] += pot - fee
   - balances[treasury] += fee
5. Winner: withdraw() [pull own funds]
6. Treasury: withdraw() [pull fees]
```

✅ **Benefit**: More flexible, handles draws/timeouts

## 🔐 Security Improvements

| Feature | Status |
|---------|--------|
| ReentrancyGuard | ✅ Protected |
| Pausable | ✅ Admin can pause if issues |
| Pull-payments | ✅ Safer than push |
| Fee snapshotting | ✅ No surprise fee changes |
| Escape hatches | ✅ Players never lose funds |

## 📋 Checklist Before Going Live

- [ ] Deploy contract to Base Sepolia
- [ ] Verify contract on Basescan
- [ ] Test all functions (create, join, cancel, timeout, withdraw, declare)
- [ ] Update `config.js` with contract address
- [ ] Update `index.html` meta tags
- [ ] Run through full game flow on testnet
- [ ] Verify relayer can call `declareWinner()`
- [ ] Test escape hatch (timeout after 24h)
- [ ] Deploy to Base Mainnet when ready
- [ ] Update production `config.js`
- [ ] Verify live games work end-to-end

## ⚠️ Admin Functions (New)

Only contract owner can call:

```javascript
// Pause/unpause game
pause()
unpause()

// Update relayer address
setRelayer(address _r)

// Update treasury address
setTreasury(address _t)

// Update global fee
setFeeBps(uint16 _f)  // Max 10% (1000 bps)

// Emergency sweep of excess ETH
emergencySweep()
```

## 📞 Troubleshooting

### "Match does not exist"
- Verify matchId is correct
- Check you're on right network
- Verify contract address in config.js

### "Incorrect stake amount"
- Must be exactly 0.0002 ETH (0xb5e620f48000 wei)
- Check gas settings aren't adding extra ETH

### "Cannot cancel: match already started"
- Only P1 can cancel
- Only if match is in Waiting state
- Try timeoutActiveMatch instead

### "Game timeout has not yet passed"
- Must wait 24 hours from game start
- Check game startedAt timestamp

### "Only authorized relayer can call this"
- Only the relayer address (set by owner) can declare winners
- Or declareWinner is being called by wrong account

## 🚀 Rollout Strategy

1. **Week 1**: Deploy to Sepolia, extensive testing
2. **Week 2**: Beta on Sepolia with real users
3. **Week 3**: Deploy to Mainnet
4. **Week 4**: Gradual user migration
5. **Week 5**: Sunsetting old contract

---

**Questions?** Check `README.md` or contact team
