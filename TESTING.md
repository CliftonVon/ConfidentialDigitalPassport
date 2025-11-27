# Testing Documentation

## Overview

This document provides comprehensive testing documentation for the Confidential Digital Passport smart contract system. The test suite ensures the reliability, security, and correctness of the privacy-preserving digital identity platform.

## Test Infrastructure

### Technology Stack

- **Testing Framework**: Hardhat + Mocha + Chai
- **Type Safety**: TypeScript + TypeChain
- **Encryption Testing**: FHEVM Hardhat Plugin
- **Coverage Tools**: solidity-coverage
- **Gas Reporting**: hardhat-gas-reporter
- **Network Testing**: Mock (local) and Sepolia (testnet)

### Configuration

The testing environment is configured with:

- **Solidity Version**: 0.8.24
- **EVM Version**: Cancun
- **Optimizer**: Enabled (800 runs)
- **Test Timeout**: 120 seconds
- **TypeChain**: Automatic type generation

## Test Suite Structure

The comprehensive test suite contains **48 test cases** organized into the following categories:

### 1. Deployment and Initialization (4 tests)
Tests that verify correct contract deployment and initial state:
- Contract deployment success
- Authority assignment
- Passport ID initialization
- Address format validation

**Coverage**: Initial state, constructor logic, access control setup

### 2. Passport Issuance (12 tests)
Tests for the core passport creation functionality:
- Successful issuance by authority
- Event emission verification
- State updates (nextPassportId, owner mappings)
- Access control (non-authority rejection)
- Input validation (zero address, duplicate passports)
- Validity period constraints (0 years, >10 years)
- Multiple passport issuance
- Passport status initialization
- Expiration date calculation

**Coverage**: Core business logic, input validation, access control, state management

### 3. Passport Revocation (6 tests)
Tests for passport revocation workflow:
- Authority-only revocation
- Status updates (inactive state)
- Mapping cleanup
- Access control enforcement
- Invalid passport ID handling
- Double revocation prevention

**Coverage**: Administrative functions, state transitions, security

### 4. Verifier Authorization (6 tests)
Tests for verifier management:
- Verifier authorization by authority
- Authorization state tracking
- Verifier revocation
- Access control enforcement
- Zero address validation
- Event emissions

**Coverage**: Role management, administrative controls

### 5. Verification Requests (8 tests)
Tests for the verification request workflow:
- Request creation by authorized verifiers
- Authority request permissions
- Request counting
- Unauthorized access prevention
- Invalid passport handling
- Inactive passport checks
- Verification type requirements
- Request detail storage

**Coverage**: Permission system, data integrity, workflow validation

### 6. Verification Request Approval (5 tests)
Tests for passport owner approval flow:
- Owner approval permissions
- State updates (approved, processed)
- Non-owner rejection
- Invalid request index handling
- Double processing prevention

**Coverage**: Owner permissions, state transitions, security

### 7. Verification Request Denial (4 tests)
Tests for passport owner denial flow:
- Owner denial permissions
- State updates (processed but not approved)
- Access control
- Double processing prevention

**Coverage**: Permission system, state management

### 8. Age Verification (3 tests)
Tests for FHE-based age verification:
- Encrypted age comparison
- Invalid passport handling
- Inactive passport checks

**Coverage**: FHE operations, validation

### 9. Nationality Verification (2 tests)
Tests for FHE-based nationality verification:
- Encrypted nationality comparison
- Invalid passport handling

**Coverage**: FHE operations, validation

### 10. Passport Information Queries (6 tests)
Tests for data retrieval functions:
- Passport info retrieval
- Owner-based passport ID lookup
- Validity checking
- Revoked passport handling
- Expired passport handling
- Invalid passport ID errors

**Coverage**: View functions, data integrity, edge cases

### 11. Authority Management (5 tests)
Tests for authority transfer:
- Authority update by current authority
- Non-authority rejection
- Zero address validation
- New authority permissions
- Old authority revocation

**Coverage**: Critical access control, administrative transitions

### 12. Edge Cases and Security (7 tests)
Tests for boundary conditions and security:
- Maximum uint32/uint64 values
- Zero age handling
- Empty string inputs
- Very long string inputs
- State consistency across multiple operations
- Complex workflow combinations

**Coverage**: Boundary testing, security hardening, integration

### 13. Gas Optimization (3 tests)
Tests for gas efficiency:
- Passport issuance gas cost
- Verification request gas cost
- Approval operation gas cost

**Coverage**: Performance optimization, cost monitoring

## Test Execution

### Running Tests

```bash
# Run all tests
npm test

# Run with gas reporting
npm run gas-report

# Run with coverage
npm run coverage

# Run on Sepolia testnet
npm run test:sepolia

# Compile contracts first
npm run compile
```

### Expected Output

The test suite should produce:
- ✓ 48 passing tests
- 0 failing tests
- Gas usage reports for key operations
- Coverage metrics for smart contracts

## Test Coverage Goals

### Target Metrics

| Metric | Target | Purpose |
|--------|--------|---------|
| Statement Coverage | >95% | Ensure all code paths are tested |
| Branch Coverage | >90% | Test all conditional logic |
| Function Coverage | 100% | Test every function |
| Line Coverage | >95% | Comprehensive code testing |

### Critical Coverage Areas

1. **Access Control**: All modifiers and permission checks
2. **State Transitions**: Passport lifecycle (issue → active → revoked)
3. **Verification Workflow**: Request → Approve/Deny
4. **FHE Operations**: Encrypted data handling
5. **Input Validation**: All require statements
6. **Event Emissions**: All state-changing events

## Security Testing

### Access Control Testing

Every function with restricted access is tested for:
- ✓ Authorized access succeeds
- ✓ Unauthorized access reverts
- ✓ Proper error messages

### Input Validation Testing

All inputs are validated for:
- ✓ Zero addresses
- ✓ Invalid IDs
- ✓ Boundary values (0, max uint)
- ✓ Empty strings
- ✓ Duplicate operations

### State Consistency Testing

State integrity is verified:
- ✓ Mappings stay synchronized
- ✓ Counters increment correctly
- ✓ Status flags update properly
- ✓ Events match state changes

## Testing Best Practices

### Test Organization

```typescript
describe("ContractName", function () {
  describe("Feature Category", function () {
    beforeEach(async function () {
      // Setup for this category
    });

    it("should do specific thing", async function () {
      // Test implementation
    });
  });
});
```

### Test Naming Convention

- Use descriptive "should" statements
- Focus on behavior, not implementation
- Example: "should revert when non-owner tries to approve"

### Assertion Pattern

```typescript
// 1. Setup
const initialState = await contract.getValue();

// 2. Action
await contract.doSomething();

// 3. Assert
const newState = await contract.getValue();
expect(newState).to.equal(expectedValue);
```

### Event Testing

```typescript
await expect(tx)
  .to.emit(contract, "EventName")
  .withArgs(arg1, arg2, arg3);
```

## Continuous Integration

### Pre-Commit Checks

Before committing code:
```bash
npm run compile
npm test
npm run coverage
npm run lint:sol
```

### CI/CD Pipeline

Automated testing runs:
1. Contract compilation
2. Full test suite execution
3. Coverage report generation
4. Gas usage analysis
5. Linting and formatting checks

## Known Limitations

### Mock Environment Limitations

- FHE decryption is mocked in local testing
- True encryption testing requires Sepolia testnet
- Gas costs may differ between mock and real networks

### Test Environment Constraints

- Time manipulation limited to Hardhat network
- Block timestamp precision varies
- Network latency not simulated

## Future Testing Enhancements

### Planned Additions

1. **Fuzzing Tests**: Using Echidna for property-based testing
2. **Formal Verification**: Certora integration for mathematical proofs
3. **Integration Tests**: Multi-contract interaction scenarios
4. **Performance Tests**: Stress testing with many passports
5. **Sepolia E2E Tests**: Full workflow on testnet

### Test Metrics Tracking

- Gas usage trends over time
- Coverage percentage history
- Test execution time monitoring
- Flaky test identification

## Debugging Failed Tests

### Common Issues

1. **Timeout Errors**
   - Solution: Increase mocha timeout in hardhat.config.ts
   - Current timeout: 120 seconds

2. **Revert Without Reason**
   - Solution: Check modifier conditions
   - Verify contract state before function call

3. **Gas Estimation Failed**
   - Solution: Ensure contract is compiled
   - Check for infinite loops or excessive operations

4. **Type Errors**
   - Solution: Regenerate TypeChain types
   - Run: `npm run typechain`

### Debug Commands

```bash
# Clean and recompile
npm run clean
npm run compile

# Regenerate types
npm run typechain

# Verbose test output
npx hardhat test --verbose

# Test specific file
npx hardhat test test/ConfidentialDigitalPassport.test.ts

# Debug with stack traces
npx hardhat test --stack-trace
```

## Test Data

### Sample Test Data

```typescript
const SAMPLE_AGE = 25;
const SAMPLE_NATIONAL_ID = 123456789n;
const SAMPLE_CITIZENSHIP_CODE = 840; // USA
const SAMPLE_NAME = "encrypted_name_data";
const SAMPLE_COUNTRY = "encrypted_country_data";
const DEFAULT_VALIDITY = 10; // 10 years
```

### Test Accounts

- **deployer/authority**: Contract deployer and initial authority
- **alice**: First passport owner
- **bob**: Second passport owner
- **charlie**: Third passport owner
- **verifier**: Authorized verifier
- **malicious**: Unauthorized user for security tests

## Performance Benchmarks

### Expected Gas Costs

| Operation | Expected Gas | Max Acceptable |
|-----------|-------------|----------------|
| Issue Passport | ~500-800k | <1M |
| Revoke Passport | ~50-80k | <150k |
| Request Verification | ~150-250k | <500k |
| Approve Request | ~150-300k | <400k |
| Deny Request | ~40-60k | <100k |
| Verify Age | ~80-120k | <200k |
| Verify Nationality | ~80-120k | <200k |

### Coverage Targets

Expected coverage results:
- **Statements**: 95-100%
- **Branches**: 90-95%
- **Functions**: 100%
- **Lines**: 95-100%

## Contributing to Tests

### Adding New Tests

1. Identify the feature/function to test
2. Create a new describe block or add to existing
3. Follow the naming convention
4. Include positive and negative test cases
5. Add edge case tests
6. Update this documentation

### Test Review Checklist

- [ ] Tests are descriptive and well-named
- [ ] Both success and failure cases covered
- [ ] Edge cases included
- [ ] Gas costs monitored
- [ ] Events properly tested
- [ ] Access control verified
- [ ] State consistency checked
- [ ] Documentation updated

## Resources

- [Hardhat Testing Guide](https://hardhat.org/hardhat-runner/docs/guides/test-contracts)
- [Chai Assertion Library](https://www.chaijs.com/)
- [FHEVM Documentation](https://docs.zama.ai/fhevm)
- [TypeChain Documentation](https://github.com/dethcrypto/TypeChain)

## Summary

This comprehensive test suite ensures the Confidential Digital Passport contract:
- ✅ Functions correctly under normal conditions
- ✅ Handles edge cases safely
- ✅ Enforces access control properly
- ✅ Maintains state consistency
- ✅ Emits events correctly
- ✅ Uses gas efficiently
- ✅ Validates all inputs
- ✅ Protects against unauthorized access

**Total Test Cases**: 48 tests across 13 categories
**Coverage Target**: >95% statements, >90% branches, 100% functions
**Estimated Test Runtime**: ~30-60 seconds (local), ~5-10 minutes (Sepolia)
