# Deployment Information

## Contract Details

### ConfidentialDigitalPassport

**Contract Name:** ConfidentialDigitalPassport
**Solidity Version:** 0.8.24
**License:** MIT

## Network Deployments

### Ethereum Sepolia Testnet

**Network:** Sepolia
**Chain ID:** 11155111
**Contract Address:** `0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d`

#### Etherscan Links

- **Contract:** [https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d](https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d)
- **Transactions:** [https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#transactions](https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#transactions)
- **Contract Code:** [https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#code](https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#code)
- **Read Contract:** [https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#readContract](https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#readContract)
- **Write Contract:** [https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#writeContract](https://sepolia.etherscan.io/address/0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d#writeContract)

#### Network Information

- **RPC URL:** https://ethereum-sepolia.publicnode.com
- **Currency:** SepoliaETH
- **Block Explorer:** https://sepolia.etherscan.io

#### Get Test ETH

To interact with the contract on Sepolia, you need test ETH:

- **Sepolia Faucet 1:** https://sepoliafaucet.com/
- **Sepolia Faucet 2:** https://www.alchemy.com/faucets/ethereum-sepolia
- **Sepolia Faucet 3:** https://faucet.quicknode.com/ethereum/sepolia

## Deployment Scripts

All deployment scripts are located in the `scripts/` directory:

### deploy.js

Main deployment script that deploys the ConfidentialDigitalPassport contract.

**Usage:**
```bash
# Deploy to Sepolia
npm run deploy:sepolia

# Deploy to local network
npm run deploy:localhost
```

**Features:**
- Automatic balance checking
- Deployment time tracking
- Gas usage reporting
- Deployment info saved to `deployments/` directory

### verify.js

Contract verification script for Etherscan.

**Usage:**
```bash
# Verify on Sepolia
npm run verify:sepolia
```

**Requirements:**
- Contract must be deployed first
- `ETHERSCAN_API_KEY` must be set in `.env`

### interact.js

Interactive script for contract operations.

**Usage:**
```bash
# Interact on Sepolia
npm run interact:sepolia

# Interact on local network
npm run interact:localhost
```

**Features:**
- View contract information
- Authorize verifiers
- Issue passports
- Request and approve verifications
- Verify age and nationality

### simulate.js

Complete workflow simulation script.

**Usage:**
```bash
# Simulate on local network
npm run simulate:localhost
```

**Features:**
- Full passport lifecycle simulation
- Multiple test accounts
- Various verification scenarios
- Comprehensive testing of all features

## Environment Configuration

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Required variables:

```env
SEPOLIA_RPC_URL=https://ethereum-sepolia.publicnode.com
PRIVATE_KEY=your_private_key_here
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

## Deployment Process

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

Edit `.env` file with your private key and API keys.

### Step 3: Compile Contracts

```bash
npm run compile
```

### Step 4: Deploy to Sepolia

```bash
npm run deploy:sepolia
```

### Step 5: Verify Contract

```bash
npm run verify:sepolia
```

### Step 6: Interact with Contract

```bash
npm run interact:sepolia
```

## Contract Architecture

### Main Functions

#### Authority Functions
- `issuePassport()` - Issue new passport to a citizen
- `revokePassport()` - Revoke an existing passport
- `authorizeVerifier()` - Authorize a verifier
- `revokeVerifier()` - Revoke verifier authorization
- `updateAuthority()` - Transfer authority to new address

#### Citizen Functions
- `approveVerificationRequest()` - Approve verification request
- `denyVerificationRequest()` - Deny verification request
- `getMyPassportId()` - Get own passport ID

#### Verifier Functions
- `requestVerification()` - Request verification access
- `verifyAge()` - Verify if age meets minimum requirement
- `verifyNationality()` - Verify nationality match

#### Public View Functions
- `getPassportInfo()` - Get passport details
- `getVerificationRequestCount()` - Get request count
- `getVerificationRequest()` - Get request details
- `isValidPassport()` - Check passport validity

## Security Considerations

### Access Control
- Only authority can issue/revoke passports
- Only authorized verifiers can request verification
- Only passport owners can approve/deny requests

### Privacy Features
- Age, nationality, and identity data encrypted using FHE
- Verifications performed on encrypted data
- Selective disclosure - citizens control access

### Best Practices
- Keep private keys secure
- Use hardware wallets for production
- Regularly update dependencies
- Audit smart contracts before mainnet deployment

## Gas Estimates

Approximate gas costs on Sepolia (may vary):

| Operation | Gas Used |
|-----------|----------|
| Deploy Contract | ~3,500,000 |
| Issue Passport | ~350,000 |
| Request Verification | ~100,000 |
| Approve Verification | ~80,000 |
| Revoke Passport | ~50,000 |

## Support & Resources

### Documentation
- Hardhat: https://hardhat.org/docs
- Ethers.js: https://docs.ethers.org/v6/
- Zama FHE: https://docs.zama.ai/

### Development Tools
- Hardhat Network: Local Ethereum network
- Hardhat Console: Interactive JavaScript console
- Gas Reporter: Gas usage analysis
- Contract Sizer: Contract size analysis

## Troubleshooting

### Common Issues

**Issue:** "Insufficient funds"
- **Solution:** Ensure deployer account has enough Sepolia ETH

**Issue:** "Network connection error"
- **Solution:** Check RPC URL in `.env` file

**Issue:** "Contract verification failed"
- **Solution:** Ensure contract is deployed and Etherscan API key is valid

**Issue:** "Transaction timeout"
- **Solution:** Increase gas price or wait for network congestion to clear

## License

MIT License - see LICENSE file for details
