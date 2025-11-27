# Quick Start Guide

Get up and running with the Digital Passport Platform in minutes.

## Prerequisites

- Node.js 18+ installed
- MetaMask browser extension
- Sepolia testnet ETH (get from [faucet](https://sepoliafaucet.com/))

## Installation (3 minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env

# 3. Add your WalletConnect Project ID to .env
# Get it from: https://cloud.walletconnect.com

# 4. Start the app
npm run dev
```

Open `http://localhost:3000` in your browser.

## First Steps

### 1. Connect Your Wallet
- Click "Connect Wallet" button
- Select MetaMask
- Approve connection
- Switch to Sepolia testnet if prompted

### 2. Check Your Role
After connecting, you'll see your role:
- **🏛️ Authority**: Can issue passports and manage verifiers
- **🔍 Verifier**: Can request and perform verifications
- **👤 User**: Can view passport and manage verification requests

### 3. Get Test ETH
If you don't have Sepolia ETH:
1. Copy your wallet address
2. Visit https://sepoliafaucet.com/
3. Paste address and request tokens
4. Wait 1-2 minutes

## Common Tasks

### Issue a Passport (Authority Only)
1. Navigate to "Government Authority Panel"
2. Fill in all fields:
   - Citizen wallet address
   - Age (e.g., 25)
   - National ID number
   - Country code (e.g., 840 for USA)
   - Encrypted name
   - Encrypted country
   - Validity years (default: 5)
3. Click "Issue Passport"
4. Approve transaction in MetaMask
5. Wait for confirmation

### View Your Passport
1. Go to "My Passport" section
2. Your passport details will display if issued
3. Check validity status and expiration date

### Request Verification (Verifier Only)
1. Navigate to "Verification Panel"
2. Select "Request Verification" tab
3. Enter passport ID
4. Describe purpose
5. Select verification types needed
6. Submit request
7. Approve transaction

### Approve Verification Request (Passport Holder)
1. Go to "Verification Requests" tab
2. Review pending requests
3. Click "✅ Approve" or "❌ Deny"
4. Confirm transaction

### View Transaction History
1. Scroll to "Transaction History" section
2. Click "🔄 Refresh" to update
3. Click transaction hash to view on Etherscan

## Tips

- 🔄 **Refresh data**: Most data auto-refreshes on wallet changes
- 💡 **Check gas**: Ensure sufficient ETH for transactions
- 🔍 **Verify on Etherscan**: Click transaction links to see details
- 🔐 **Network**: Always use Sepolia testnet
- 📱 **Mobile**: Use MetaMask mobile browser

## Troubleshooting

### Can't connect wallet?
- Ensure MetaMask is installed
- Refresh page and try again
- Check if MetaMask is locked

### Transaction failing?
- Check you have enough Sepolia ETH
- Increase gas limit in MetaMask
- Verify you're on correct network

### Not seeing data?
- Wait a few seconds for blockchain sync
- Click refresh button
- Check console for errors (F12)

## Next Steps

- Read the full [README](./README.md) for detailed documentation
- See [INSTALLATION](./INSTALLATION.md) for deployment guides
- Review [PROJECT_SUMMARY](./PROJECT_SUMMARY.md) for technical details

## Support

- Check browser console (F12) for error messages
- Verify contract address matches documentation
- Ensure wallet is connected to Sepolia

---

**Ready to go!** Start by connecting your wallet.
