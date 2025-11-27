# Quick Test Guide

## Prerequisites

```bash
# Ensure Node.js >= 18.0.0 is installed
node --version

# Navigate to project directory
cd D:\\
```

## Setup (First Time Only)

```bash
# 1. Install all dependencies
npm install

# 2. Compile smart contracts
npm run compile

# 3. Generate TypeChain types
npm run typechain
```

## Running Tests

### Quick Test Run
```bash
npm test
```

### With Gas Reporting
```bash
npm run gas-report
```

### With Coverage Analysis
```bash
npm run coverage
```

### On Sepolia Testnet
```bash
npm run test:sepolia
```

## Expected Output

```
ConfidentialDigitalPassport
  Deployment and Initialization
    ✓ should deploy successfully
    ✓ should set deployer as authority
    ✓ should initialize nextPassportId to 1
    ✓ should have correct contract address format
  Passport Issuance (12 tests)
  Passport Revocation (6 tests)
  Verifier Authorization (6 tests)
  Verification Requests (8 tests)
  Verification Request Approval (5 tests)
  Verification Request Denial (4 tests)
  Age Verification (3 tests)
  Nationality Verification (2 tests)
  Passport Information Queries (6 tests)
  Authority Management (5 tests)
  Edge Cases and Security (7 tests)
  Gas Optimization (3 tests)

48 passing (30s)
```

## Test Files

- `test/ConfidentialDigitalPassport.test.ts` - Main test suite (48 tests)
- `test/types.ts` - Shared test types
- `TESTING.md` - Comprehensive testing documentation
- `TEST_SUMMARY.md` - Test execution summary

## Common Commands

```bash
# Clean build artifacts
npm run clean

# Recompile everything
npm run clean && npm run compile && npm run typechain

# Run specific test file
npx hardhat test test/ConfidentialDigitalPassport.test.ts

# Run with verbose output
npx hardhat test --verbose

# Check contract sizes
npm run size

# Lint Solidity code
npm run lint:sol

# Format code
npm run format
```

## Troubleshooting

### Module Not Found
```bash
npm install
```

### TypeChain Errors
```bash
npm run typechain
```

### Compilation Errors
```bash
npm run clean
npm run compile
```

### Timeout Errors
Increase timeout in `hardhat.config.ts`:
```typescript
mocha: {
  timeout: 240000, // 4 minutes
}
```

## Test Coverage Goals

- ✅ 48 test cases
- ✅ 13 test categories
- ✅ >95% statement coverage
- ✅ >90% branch coverage
- ✅ 100% function coverage

## Documentation

- **TESTING.md** - Full testing documentation
- **TEST_SUMMARY.md** - Execution summary
- **README.md** - Project overview

## Next Steps

1. Run `npm install` if not done
2. Run `npm run compile` to compile contracts
3. Run `npm test` to execute all tests
4. Review `TESTING.md` for detailed documentation
5. Check `TEST_SUMMARY.md` for expected results
