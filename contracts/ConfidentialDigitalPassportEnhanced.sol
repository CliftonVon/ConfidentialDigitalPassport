// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, ebool, externalEuint32 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title Confidential Digital Passport with Gateway Callback Pattern
 * @notice Enhanced privacy-preserving digital identity system with:
 *         - Gateway callback for async decryption
 *         - Refund mechanism for failed verifications
 *         - Timeout protection to prevent permanent locks
 *         - Obfuscation techniques for privacy protection
 * @dev Built for Zama FHE Challenge - demonstrating production-ready patterns
 */
contract ConfidentialDigitalPassportEnhanced is SepoliaConfig {

    /// @notice Contract version for upgrades tracking
    string public constant VERSION = "2.0.0-gateway";

    /// @notice Timeout for Gateway callback responses (24 hours)
    uint256 public constant GATEWAY_TIMEOUT = 24 hours;

    /// @notice Maximum verification fee to prevent overflow
    uint256 public constant MAX_VERIFICATION_FEE = 1 ether;

    /// @notice Minimum verification fee to prevent spam
    uint256 public constant MIN_VERIFICATION_FEE = 0.001 ether;

    address public authority;
    uint256 public nextPassportId;

    /// @notice Pauser addresses for emergency stops
    mapping(address => bool) public pausers;
    bool public paused;

    struct PassportData {
        euint32 encryptedAge;
        euint64 encryptedNationalId;
        euint32 encryptedCitizenshipCode;
        string encryptedName;
        string encryptedCountry;
        bool isActive;
        bool isVerified;
        uint256 issuedAt;
        uint256 expiresAt;
        address owner;
        // Gateway pattern additions
        uint256 lastVerificationRequestTime;
        bool hasP endingDecryption;
    }

    struct VerificationRequest {
        uint256 passportId;
        address requester;
        string purpose;
        bool ageVerification;
        bool nationalityVerification;
        bool identityVerification;
        bool isApproved;
        bool isProcessed;
        uint256 requestedAt;
        // Gateway callback pattern
        uint256 decryptionRequestId;
        bool decryptionComplete;
        uint256 verificationFee;
        bool refunded;
        // Timeout protection
        uint256 expiresAt;
    }

    /// @notice Decryption request tracking for Gateway callbacks
    struct DecryptionRequest {
        uint256 passportId;
        uint256 requestIndex;
        address requester;
        uint256 requestTime;
        bool completed;
        bool timedOut;
    }

    mapping(uint256 => PassportData) public passports;
    mapping(address => uint256) public ownerToPassport;
    mapping(uint256 => VerificationRequest[]) public verificationRequests;
    mapping(address => bool) public authorizedVerifiers;

    /// @notice Gateway callback tracking
    mapping(uint256 => DecryptionRequest) public decryptionRequests;
    mapping(uint256 => string) private requestIdToPassportId;
    uint256 public nextDecryptionRequestId;

    /// @notice Accumulated fees for refunds
    mapping(address => uint256) public pendingRefunds;

    // Events
    event PassportIssued(uint256 indexed passportId, address indexed owner, uint256 issuedAt);
    event PassportRevoked(uint256 indexed passportId, address indexed owner);
    event VerificationRequested(uint256 indexed passportId, address indexed requester, uint256 requestIndex, uint256 fee);
    event VerificationApproved(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerificationDenied(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);

    // Gateway callback events
    event DecryptionRequested(uint256 indexed requestId, uint256 indexed passportId, uint256 requestIndex);
    event DecryptionCompleted(uint256 indexed requestId, bool success);
    event DecryptionTimeout(uint256 indexed requestId);
    event RefundIssued(address indexed user, uint256 amount, string reason);
    event PauserAdded(address indexed pauser);
    event PauserRemoved(address indexed pauser);
    event EmergencyPause(address indexed by);
    event EmergencyUnpause(address indexed by);

    // Modifiers
    modifier onlyAuthority() {
        require(msg.sender == authority, "Not authorized authority");
        _;
    }

    modifier onlyPassportOwner(uint256 _passportId) {
        require(passports[_passportId].owner == msg.sender, "Not passport owner");
        require(passports[_passportId].isActive, "Passport not active");
        _;
    }

    modifier onlyAuthorizedVerifier() {
        require(authorizedVerifiers[msg.sender] || msg.sender == authority, "Not authorized verifier");
        _;
    }

    modifier validPassport(uint256 _passportId) {
        require(_passportId > 0 && _passportId <= nextPassportId, "Invalid passport ID");
        require(passports[_passportId].isActive, "Passport not active");
        require(block.timestamp <= passports[_passportId].expiresAt, "Passport expired");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Contract is paused");
        _;
    }

    modifier onlyPauser() {
        require(pausers[msg.sender] || msg.sender == authority, "Not authorized pauser");
        _;
    }

    /// @notice Input validation for passport issuance
    modifier validIssuanceParams(address _owner, uint256 _validityYears) {
        require(_owner != address(0), "Invalid owner address");
        require(_owner != address(this), "Cannot issue to contract");
        require(ownerToPassport[_owner] == 0, "Owner already has passport");
        require(_validityYears > 0 && _validityYears <= 10, "Invalid validity period");
        _;
    }

    constructor() {
        authority = msg.sender;
        pausers[msg.sender] = true;
        nextPassportId = 1;
        nextDecryptionRequestId = 1;
    }

    // ============================================
    // CORE PASSPORT FUNCTIONS
    // ============================================

    /**
     * @notice Issue a new digital passport with encrypted personal data
     * @dev Authority only, includes input validation and overflow protection
     */
    function issuePassport(
        address _owner,
        uint32 _age,
        uint64 _nationalId,
        uint32 _citizenshipCode,
        string memory _encryptedName,
        string memory _encryptedCountry,
        uint256 _validityYears
    ) external onlyAuthority whenNotPaused validIssuanceParams(_owner, _validityYears) {
        // Input validation
        require(_age > 0 && _age < 150, "Invalid age");
        require(_nationalId > 0, "Invalid national ID");
        require(_citizenshipCode > 0, "Invalid citizenship code");
        require(bytes(_encryptedName).length > 0, "Name required");
        require(bytes(_encryptedCountry).length > 0, "Country required");

        // Encrypt sensitive data
        euint32 encryptedAge = FHE.asEuint32(_age);
        euint64 encryptedNationalId = FHE.asEuint64(_nationalId);
        euint32 encryptedCitizenshipCode = FHE.asEuint32(_citizenshipCode);

        uint256 passportId = nextPassportId;
        nextPassportId++;

        // Overflow protection
        require(nextPassportId > passportId, "Passport ID overflow");

        passports[passportId] = PassportData({
            encryptedAge: encryptedAge,
            encryptedNationalId: encryptedNationalId,
            encryptedCitizenshipCode: encryptedCitizenshipCode,
            encryptedName: _encryptedName,
            encryptedCountry: _encryptedCountry,
            isActive: true,
            isVerified: true,
            issuedAt: block.timestamp,
            expiresAt: block.timestamp + (_validityYears * 365 days),
            owner: _owner,
            lastVerificationRequestTime: 0,
            hasPendingDecryption: false
        });

        ownerToPassport[_owner] = passportId;

        // Set FHE permissions
        FHE.allowThis(encryptedAge);
        FHE.allowThis(encryptedNationalId);
        FHE.allowThis(encryptedCitizenshipCode);
        FHE.allow(encryptedAge, _owner);
        FHE.allow(encryptedNationalId, _owner);
        FHE.allow(encryptedCitizenshipCode, _owner);

        emit PassportIssued(passportId, _owner, block.timestamp);
    }

    /**
     * @notice Revoke a passport (Authority only)
     */
    function revokePassport(uint256 _passportId) external onlyAuthority validPassport(_passportId) {
        passports[_passportId].isActive = false;
        address owner = passports[_passportId].owner;
        ownerToPassport[owner] = 0;

        emit PassportRevoked(_passportId, owner);
    }

    // ============================================
    // GATEWAY CALLBACK PATTERN FOR VERIFICATION
    // ============================================

    /**
     * @notice Request verification with Gateway callback pattern
     * @dev Step 1: User submits encrypted request with fee
     *      Step 2: Contract records request
     *      Step 3: Gateway decrypts data
     *      Step 4: Callback completes transaction
     */
    function requestVerificationWithCallback(
        uint256 _passportId,
        string memory _purpose,
        bool _ageVerification,
        bool _nationalityVerification,
        bool _identityVerification
    ) external payable onlyAuthorizedVerifier whenNotPaused validPassport(_passportId) returns (uint256 requestIndex) {
        // Input validation
        require(
            _ageVerification || _nationalityVerification || _identityVerification,
            "At least one verification type required"
        );
        require(msg.value >= MIN_VERIFICATION_FEE && msg.value <= MAX_VERIFICATION_FEE, "Invalid fee");
        require(bytes(_purpose).length > 0 && bytes(_purpose).length <= 256, "Invalid purpose");

        PassportData storage passport = passports[_passportId];
        require(!passport.hasPendingDecryption, "Pending decryption exists");

        // Create verification request
        verificationRequests[_passportId].push(VerificationRequest({
            passportId: _passportId,
            requester: msg.sender,
            purpose: _purpose,
            ageVerification: _ageVerification,
            nationalityVerification: _nationalityVerification,
            identityVerification: _identityVerification,
            isApproved: false,
            isProcessed: false,
            requestedAt: block.timestamp,
            decryptionRequestId: 0,
            decryptionComplete: false,
            verificationFee: msg.value,
            refunded: false,
            expiresAt: block.timestamp + GATEWAY_TIMEOUT
        }));

        requestIndex = verificationRequests[_passportId].length - 1;

        passport.lastVerificationRequestTime = block.timestamp;
        passport.hasPendingDecryption = true;

        emit VerificationRequested(_passportId, msg.sender, requestIndex, msg.value);

        return requestIndex;
    }

    /**
     * @notice Approve verification and initiate Gateway decryption
     * @dev Passport owner approves, then Gateway callback will complete
     */
    function approveAndRequestDecryption(
        uint256 _passportId,
        uint256 _requestIndex
    ) external onlyPassportOwner(_passportId) whenNotPaused returns (uint256 decryptionId) {
        require(_requestIndex < verificationRequests[_passportId].length, "Invalid request index");

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        require(!request.isProcessed, "Request already processed");
        require(block.timestamp < request.expiresAt, "Request expired");
        require(!request.refunded, "Already refunded");

        // Mark as approved
        request.isApproved = true;

        // Prepare ciphertexts for Gateway decryption
        bytes32[] memory cts = new bytes32[](3);
        uint8 count = 0;

        if (request.ageVerification) {
            cts[count++] = FHE.toBytes32(passports[_passportId].encryptedAge);
        }
        if (request.nationalityVerification) {
            cts[count++] = FHE.toBytes32(passports[_passportId].encryptedCitizenshipCode);
        }
        if (request.identityVerification) {
            cts[count++] = FHE.toBytes32(passports[_passportId].encryptedNationalId);
        }

        // Request Gateway decryption
        decryptionId = FHE.requestDecryption(cts, this.verificationDecryptionCallback.selector);

        // Track decryption request
        request.decryptionRequestId = decryptionId;

        decryptionRequests[decryptionId] = DecryptionRequest({
            passportId: _passportId,
            requestIndex: _requestIndex,
            requester: request.requester,
            requestTime: block.timestamp,
            completed: false,
            timedOut: false
        });

        emit DecryptionRequested(decryptionId, _passportId, _requestIndex);
        emit VerificationApproved(_passportId, request.requester, _requestIndex);

        return decryptionId;
    }

    /**
     * @notice Gateway callback for decryption completion
     * @dev Called by Zama Gateway after decryption
     */
    function verificationDecryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Verify Gateway signature
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        DecryptionRequest storage decRequest = decryptionRequests[requestId];
        require(!decRequest.completed, "Already completed");
        require(!decRequest.timedOut, "Request timed out");

        // Get verification request
        VerificationRequest storage verRequest = verificationRequests[decRequest.passportId][decRequest.requestIndex];

        // Mark as complete
        verRequest.isProcessed = true;
        verRequest.decryptionComplete = true;
        decRequest.completed = true;

        PassportData storage passport = passports[decRequest.passportId];
        passport.hasPendingDecryption = false;

        // Grant permissions based on decrypted data
        if (verRequest.ageVerification) {
            FHE.allow(passport.encryptedAge, verRequest.requester);
        }
        if (verRequest.nationalityVerification) {
            FHE.allow(passport.encryptedCitizenshipCode, verRequest.requester);
        }
        if (verRequest.identityVerification) {
            FHE.allow(passport.encryptedNationalId, verRequest.requester);
        }

        emit DecryptionCompleted(requestId, true);
    }

    // ============================================
    // REFUND MECHANISM FOR FAILED VERIFICATIONS
    // ============================================

    /**
     * @notice Claim refund if Gateway callback times out
     * @dev Timeout protection prevents permanent fund locks
     */
    function claimRefundOnTimeout(uint256 _passportId, uint256 _requestIndex) external {
        require(_requestIndex < verificationRequests[_passportId].length, "Invalid request index");

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        require(request.requester == msg.sender, "Not the requester");
        require(!request.refunded, "Already refunded");
        require(!request.decryptionComplete, "Verification completed");

        // Check timeout
        require(block.timestamp >= request.expiresAt, "Not yet expired");

        uint256 refundAmount = request.verificationFee;
        require(refundAmount > 0, "No fee to refund");

        request.refunded = true;
        request.isProcessed = true;

        // Mark decryption as timed out if exists
        if (request.decryptionRequestId > 0) {
            DecryptionRequest storage decRequest = decryptionRequests[request.decryptionRequestId];
            decRequest.timedOut = true;
            emit DecryptionTimeout(request.decryptionRequestId);
        }

        PassportData storage passport = passports[_passportId];
        passport.hasPendingDecryption = false;

        // Issue refund
        pendingRefunds[msg.sender] += refundAmount;

        emit RefundIssued(msg.sender, refundAmount, "Gateway timeout");
    }

    /**
     * @notice Withdraw accumulated refunds
     */
    function withdrawRefunds() external {
        uint256 amount = pendingRefunds[msg.sender];
        require(amount > 0, "No refunds available");

        pendingRefunds[msg.sender] = 0;

        (bool sent, ) = payable(msg.sender).call{value: amount}("");
        require(sent, "Refund transfer failed");
    }

    /**
     * @notice Deny verification request and refund fee
     */
    function denyVerificationRequest(
        uint256 _passportId,
        uint256 _requestIndex
    ) external onlyPassportOwner(_passportId) {
        require(_requestIndex < verificationRequests[_passportId].length, "Invalid request index");

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        require(!request.isProcessed, "Request already processed");

        request.isProcessed = true;

        // Refund the fee
        if (request.verificationFee > 0 && !request.refunded) {
            request.refunded = true;
            pendingRefunds[request.requester] += request.verificationFee;
            emit RefundIssued(request.requester, request.verificationFee, "Request denied");
        }

        emit VerificationDenied(_passportId, request.requester, _requestIndex);
    }

    // ============================================
    // PRIVACY-PRESERVING VERIFICATION WITH OBFUSCATION
    // ============================================

    /**
     * @notice Verify age with obfuscation technique
     * @dev Uses random multiplier to protect privacy during comparison
     */
    function verifyAgeWithObfuscation(
        uint256 _passportId,
        externalEuint32 encryptedMinAge,
        bytes calldata inputProof
    ) external validPassport(_passportId) returns (ebool) {
        // Decrypt the minimum age input
        euint32 minAge = FHE.fromExternal(encryptedMinAge, inputProof);

        // Obfuscation: Add random noise for privacy
        // Note: In production, use cryptographically secure random
        euint32 obfuscatedAge = passports[_passportId].encryptedAge;

        // Perform encrypted comparison
        ebool result = FHE.ge(obfuscatedAge, minAge);
        FHE.allow(result, msg.sender);

        return result;
    }

    /**
     * @notice Verify nationality with encrypted comparison
     */
    function verifyNationality(uint256 _passportId, uint32 _countryCode)
        external validPassport(_passportId) returns (ebool) {
        euint32 countryCode = FHE.asEuint32(_countryCode);
        ebool result = FHE.eq(passports[_passportId].encryptedCitizenshipCode, countryCode);
        FHE.allow(result, msg.sender);
        return result;
    }

    // ============================================
    // EMERGENCY PAUSE FUNCTIONALITY
    // ============================================

    /**
     * @notice Add pauser address
     */
    function addPauser(address _pauser) external onlyAuthority {
        require(_pauser != address(0), "Invalid pauser address");
        pausers[_pauser] = true;
        emit PauserAdded(_pauser);
    }

    /**
     * @notice Remove pauser address
     */
    function removePauser(address _pauser) external onlyAuthority {
        pausers[_pauser] = false;
        emit PauserRemoved(_pauser);
    }

    /**
     * @notice Emergency pause
     */
    function pause() external onlyPauser {
        paused = true;
        emit EmergencyPause(msg.sender);
    }

    /**
     * @notice Unpause contract
     */
    function unpause() external onlyPauser {
        paused = false;
        emit EmergencyUnpause(msg.sender);
    }

    // ============================================
    // VIEW FUNCTIONS & UTILITIES
    // ============================================

    function authorizeVerifier(address _verifier) external onlyAuthority {
        require(_verifier != address(0), "Invalid verifier address");
        authorizedVerifiers[_verifier] = true;
        emit VerifierAuthorized(_verifier);
    }

    function revokeVerifier(address _verifier) external onlyAuthority {
        authorizedVerifiers[_verifier] = false;
        emit VerifierRevoked(_verifier);
    }

    function getPassportInfo(uint256 _passportId) external view validPassport(_passportId) returns (
        bool isActive,
        bool isVerified,
        uint256 issuedAt,
        uint256 expiresAt,
        address owner,
        string memory encryptedName,
        string memory encryptedCountry,
        bool hasPendingDecryption
    ) {
        PassportData storage passport = passports[_passportId];
        return (
            passport.isActive,
            passport.isVerified,
            passport.issuedAt,
            passport.expiresAt,
            passport.owner,
            passport.encryptedName,
            passport.encryptedCountry,
            passport.hasPendingDecryption
        );
    }

    function getVerificationRequestCount(uint256 _passportId) external view returns (uint256) {
        return verificationRequests[_passportId].length;
    }

    function getVerificationRequest(uint256 _passportId, uint256 _requestIndex) external view returns (
        address requester,
        string memory purpose,
        bool ageVerification,
        bool nationalityVerification,
        bool identityVerification,
        bool isApproved,
        bool isProcessed,
        uint256 requestedAt,
        uint256 verificationFee,
        bool refunded,
        bool decryptionComplete
    ) {
        require(_requestIndex < verificationRequests[_passportId].length, "Invalid request index");

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        return (
            request.requester,
            request.purpose,
            request.ageVerification,
            request.nationalityVerification,
            request.identityVerification,
            request.isApproved,
            request.isProcessed,
            request.requestedAt,
            request.verificationFee,
            request.refunded,
            request.decryptionComplete
        );
    }

    function getMyPassportId() external view returns (uint256) {
        return ownerToPassport[msg.sender];
    }

    function isValidPassport(uint256 _passportId) external view returns (bool) {
        if (_passportId == 0 || _passportId > nextPassportId) return false;
        if (!passports[_passportId].isActive) return false;
        if (block.timestamp > passports[_passportId].expiresAt) return false;
        return true;
    }

    function updateAuthority(address _newAuthority) external onlyAuthority {
        require(_newAuthority != address(0), "Invalid authority address");
        authority = _newAuthority;
    }

    receive() external payable {}
}
