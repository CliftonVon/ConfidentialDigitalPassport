// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint32, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {SepoliaConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/**
 * @title ConfidentialDigitalPassport
 * @notice Privacy-preserving digital identity system using Fully Homomorphic Encryption
 * @dev Implements FHE-based passport issuance and verification with security enhancements
 *
 * Security Features:
 * - Reentrancy protection on critical functions
 * - Rate limiting for verification requests
 * - DoS protection with request limits
 * - Access control with role-based permissions
 * - Emergency pause mechanism
 * - Input validation and bounds checking
 */
contract ConfidentialDigitalPassport is SepoliaConfig {
    // ========================================
    // State Variables
    // ========================================

    address public authority;
    uint256 public nextPassportId;

    // Rate limiting and DoS protection
    uint256 public constant MAX_REQUESTS_PER_PASSPORT = 100;
    uint256 public constant REQUEST_COOLDOWN = 1 hours;
    mapping(uint256 => uint256) public lastRequestTime;
    mapping(uint256 => uint256) public requestCount;

    // Emergency controls
    bool public paused;
    uint256 public constant MAX_VALIDITY_YEARS = 10;

    // Reentrancy guard
    uint256 private constant NOT_ENTERED = 1;
    uint256 private constant ENTERED = 2;
    uint256 private reentrancyStatus;

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
    }

    mapping(uint256 => PassportData) public passports;
    mapping(address => uint256) public ownerToPassport;
    mapping(uint256 => VerificationRequest[]) public verificationRequests;
    mapping(address => bool) public authorizedVerifiers;

    // ========================================
    // Events
    // ========================================

    event PassportIssued(uint256 indexed passportId, address indexed owner, uint256 issuedAt);
    event PassportRevoked(uint256 indexed passportId, address indexed owner);
    event VerificationRequested(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerificationApproved(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerificationDenied(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);
    event EmergencyPause(address indexed by);
    event EmergencyUnpause(address indexed by);
    event AuthorityTransferred(address indexed previousAuthority, address indexed newAuthority);

    // ========================================
    // Errors
    // ========================================

    error Unauthorized();
    error NotPassportOwner();
    error PassportNotActive();
    error InvalidPassportId();
    error PassportExpired();
    error ContractPaused();
    error InvalidAddress();
    error OwnerAlreadyHasPassport();
    error InvalidValidityPeriod();
    error InvalidRequestIndex();
    error RequestAlreadyProcessed();
    error NoVerificationTypeSelected();
    error RateLimitExceeded();
    error TooManyRequests();
    error ReentrancyDetected();

    // ========================================
    // Modifiers
    // ========================================

    modifier onlyAuthority() {
        if (msg.sender != authority) revert Unauthorized();
        _;
    }

    modifier onlyPassportOwner(uint256 _passportId) {
        if (passports[_passportId].owner != msg.sender) revert NotPassportOwner();
        if (!passports[_passportId].isActive) revert PassportNotActive();
        _;
    }

    modifier onlyAuthorizedVerifier() {
        if (!authorizedVerifiers[msg.sender] && msg.sender != authority) revert Unauthorized();
        _;
    }

    modifier validPassport(uint256 _passportId) {
        if (_passportId == 0 || _passportId > nextPassportId) revert InvalidPassportId();
        if (!passports[_passportId].isActive) revert PassportNotActive();
        if (block.timestamp > passports[_passportId].expiresAt) revert PassportExpired();
        _;
    }

    modifier whenNotPaused() {
        if (paused) revert ContractPaused();
        _;
    }

    modifier nonReentrant() {
        if (reentrancyStatus == ENTERED) revert ReentrancyDetected();
        reentrancyStatus = ENTERED;
        _;
        reentrancyStatus = NOT_ENTERED;
    }

    modifier rateLimited(uint256 _passportId) {
        if (block.timestamp < lastRequestTime[_passportId] + REQUEST_COOLDOWN) {
            revert RateLimitExceeded();
        }
        if (requestCount[_passportId] >= MAX_REQUESTS_PER_PASSPORT) {
            revert TooManyRequests();
        }
        _;
    }

    // ========================================
    // Constructor
    // ========================================

    constructor() {
        authority = msg.sender;
        nextPassportId = 1;
        paused = false;
        reentrancyStatus = NOT_ENTERED;
    }

    // ========================================
    // Core Functions
    // ========================================

    /**
     * @notice Issues a new digital passport with encrypted personal data
     * @dev Only callable by authority, includes input validation
     * @param _owner The wallet address of the passport owner
     * @param _age Plain age value (will be encrypted)
     * @param _nationalId Plain national ID (will be encrypted)
     * @param _citizenshipCode Plain citizenship code (will be encrypted)
     * @param _encryptedName Encrypted name string
     * @param _encryptedCountry Encrypted country string
     * @param _validityYears Validity period in years (1-10)
     */
    function issuePassport(
        address _owner,
        uint32 _age,
        uint64 _nationalId,
        uint32 _citizenshipCode,
        string memory _encryptedName,
        string memory _encryptedCountry,
        uint256 _validityYears
    ) external onlyAuthority whenNotPaused nonReentrant {
        if (_owner == address(0)) revert InvalidAddress();
        if (ownerToPassport[_owner] != 0) revert OwnerAlreadyHasPassport();
        if (_validityYears == 0 || _validityYears > MAX_VALIDITY_YEARS) {
            revert InvalidValidityPeriod();
        }

        // Encrypt sensitive data
        euint32 encryptedAge = FHE.asEuint32(_age);
        euint64 encryptedNationalId = FHE.asEuint64(_nationalId);
        euint32 encryptedCitizenshipCode = FHE.asEuint32(_citizenshipCode);

        uint256 passportId = nextPassportId;
        unchecked {
            nextPassportId++;
        }

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
            owner: _owner
        });

        ownerToPassport[_owner] = passportId;

        // Set permissions
        FHE.allowThis(encryptedAge);
        FHE.allowThis(encryptedNationalId);
        FHE.allowThis(encryptedCitizenshipCode);
        FHE.allow(encryptedAge, _owner);
        FHE.allow(encryptedNationalId, _owner);
        FHE.allow(encryptedCitizenshipCode, _owner);

        emit PassportIssued(passportId, _owner, block.timestamp);
    }

    /**
     * @notice Revokes a passport, making it inactive
     * @param _passportId The ID of the passport to revoke
     */
    function revokePassport(uint256 _passportId)
        external
        onlyAuthority
        validPassport(_passportId)
        nonReentrant
    {
        passports[_passportId].isActive = false;
        address owner = passports[_passportId].owner;
        ownerToPassport[owner] = 0;

        emit PassportRevoked(_passportId, owner);
    }

    /**
     * @notice Requests verification access to specific passport data
     * @dev Implements rate limiting and DoS protection
     * @param _passportId The ID of the passport to verify
     * @param _purpose Description of verification purpose
     * @param _ageVerification Request access to age data
     * @param _nationalityVerification Request access to nationality data
     * @param _identityVerification Request access to identity data
     */
    function requestVerification(
        uint256 _passportId,
        string memory _purpose,
        bool _ageVerification,
        bool _nationalityVerification,
        bool _identityVerification
    )
        external
        onlyAuthorizedVerifier
        validPassport(_passportId)
        whenNotPaused
        rateLimited(_passportId)
        nonReentrant
    {
        if (!_ageVerification && !_nationalityVerification && !_identityVerification) {
            revert NoVerificationTypeSelected();
        }

        verificationRequests[_passportId].push(
            VerificationRequest({
                passportId: _passportId,
                requester: msg.sender,
                purpose: _purpose,
                ageVerification: _ageVerification,
                nationalityVerification: _nationalityVerification,
                identityVerification: _identityVerification,
                isApproved: false,
                isProcessed: false,
                requestedAt: block.timestamp
            })
        );

        uint256 requestIndex = verificationRequests[_passportId].length - 1;

        // Update rate limiting counters
        lastRequestTime[_passportId] = block.timestamp;
        unchecked {
            requestCount[_passportId]++;
        }

        emit VerificationRequested(_passportId, msg.sender, requestIndex);
    }

    /**
     * @notice Approves a verification request and grants data access
     * @param _passportId The ID of the passport
     * @param _requestIndex The index of the verification request
     */
    function approveVerificationRequest(uint256 _passportId, uint256 _requestIndex)
        external
        onlyPassportOwner(_passportId)
        whenNotPaused
        nonReentrant
    {
        if (_requestIndex >= verificationRequests[_passportId].length) {
            revert InvalidRequestIndex();
        }

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        if (request.isProcessed) revert RequestAlreadyProcessed();

        request.isApproved = true;
        request.isProcessed = true;

        // Grant permissions based on request
        if (request.ageVerification) {
            FHE.allow(passports[_passportId].encryptedAge, request.requester);
        }
        if (request.nationalityVerification) {
            FHE.allow(passports[_passportId].encryptedCitizenshipCode, request.requester);
        }
        if (request.identityVerification) {
            FHE.allow(passports[_passportId].encryptedNationalId, request.requester);
        }

        emit VerificationApproved(_passportId, request.requester, _requestIndex);
    }

    /**
     * @notice Denies a verification request
     * @param _passportId The ID of the passport
     * @param _requestIndex The index of the verification request
     */
    function denyVerificationRequest(uint256 _passportId, uint256 _requestIndex)
        external
        onlyPassportOwner(_passportId)
        whenNotPaused
        nonReentrant
    {
        if (_requestIndex >= verificationRequests[_passportId].length) {
            revert InvalidRequestIndex();
        }

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        if (request.isProcessed) revert RequestAlreadyProcessed();

        request.isProcessed = true;

        emit VerificationDenied(_passportId, request.requester, _requestIndex);
    }

    /**
     * @notice Verifies if passport holder meets minimum age requirement
     * @param _passportId The ID of the passport
     * @param _minimumAge The minimum age to check against
     * @return ebool Encrypted boolean result of age verification
     */
    function verifyAge(uint256 _passportId, uint32 _minimumAge)
        external
        validPassport(_passportId)
        whenNotPaused
        returns (ebool)
    {
        euint32 minimumAge = FHE.asEuint32(_minimumAge);
        ebool result = FHE.ge(passports[_passportId].encryptedAge, minimumAge);
        FHE.allow(result, msg.sender);
        return result;
    }

    /**
     * @notice Verifies if passport holder has specific nationality
     * @param _passportId The ID of the passport
     * @param _countryCode The country code to verify
     * @return ebool Encrypted boolean result of nationality verification
     */
    function verifyNationality(uint256 _passportId, uint32 _countryCode)
        external
        validPassport(_passportId)
        whenNotPaused
        returns (ebool)
    {
        euint32 countryCode = FHE.asEuint32(_countryCode);
        ebool result = FHE.eq(passports[_passportId].encryptedCitizenshipCode, countryCode);
        FHE.allow(result, msg.sender);
        return result;
    }

    // ========================================
    // Access Control Functions
    // ========================================

    /**
     * @notice Authorizes a verifier to request passport verifications
     * @param _verifier The address to authorize
     */
    function authorizeVerifier(address _verifier) external onlyAuthority {
        if (_verifier == address(0)) revert InvalidAddress();
        authorizedVerifiers[_verifier] = true;
        emit VerifierAuthorized(_verifier);
    }

    /**
     * @notice Revokes verifier authorization
     * @param _verifier The address to revoke
     */
    function revokeVerifier(address _verifier) external onlyAuthority {
        authorizedVerifiers[_verifier] = false;
        emit VerifierRevoked(_verifier);
    }

    /**
     * @notice Transfers authority to a new address
     * @param _newAuthority The new authority address
     */
    function updateAuthority(address _newAuthority) external onlyAuthority {
        if (_newAuthority == address(0)) revert InvalidAddress();
        address previousAuthority = authority;
        authority = _newAuthority;
        emit AuthorityTransferred(previousAuthority, _newAuthority);
    }

    // ========================================
    // Emergency Controls
    // ========================================

    /**
     * @notice Pauses the contract in case of emergency
     */
    function pause() external onlyAuthority {
        paused = true;
        emit EmergencyPause(msg.sender);
    }

    /**
     * @notice Unpauses the contract
     */
    function unpause() external onlyAuthority {
        paused = false;
        emit EmergencyUnpause(msg.sender);
    }

    // ========================================
    // View Functions
    // ========================================

    /**
     * @notice Gets public passport information
     * @param _passportId The ID of the passport
     * @return All non-encrypted passport data
     */
    function getPassportInfo(uint256 _passportId)
        external
        view
        validPassport(_passportId)
        returns (
            bool isActive,
            bool isVerified,
            uint256 issuedAt,
            uint256 expiresAt,
            address owner,
            string memory encryptedName,
            string memory encryptedCountry
        )
    {
        PassportData storage passport = passports[_passportId];
        return (
            passport.isActive,
            passport.isVerified,
            passport.issuedAt,
            passport.expiresAt,
            passport.owner,
            passport.encryptedName,
            passport.encryptedCountry
        );
    }

    /**
     * @notice Gets the number of verification requests for a passport
     * @param _passportId The ID of the passport
     * @return The count of verification requests
     */
    function getVerificationRequestCount(uint256 _passportId) external view returns (uint256) {
        return verificationRequests[_passportId].length;
    }

    /**
     * @notice Gets details of a specific verification request
     * @param _passportId The ID of the passport
     * @param _requestIndex The index of the request
     * @return All verification request data
     */
    function getVerificationRequest(uint256 _passportId, uint256 _requestIndex)
        external
        view
        returns (
            address requester,
            string memory purpose,
            bool ageVerification,
            bool nationalityVerification,
            bool identityVerification,
            bool isApproved,
            bool isProcessed,
            uint256 requestedAt
        )
    {
        if (_requestIndex >= verificationRequests[_passportId].length) {
            revert InvalidRequestIndex();
        }

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        return (
            request.requester,
            request.purpose,
            request.ageVerification,
            request.nationalityVerification,
            request.identityVerification,
            request.isApproved,
            request.isProcessed,
            request.requestedAt
        );
    }

    /**
     * @notice Gets the caller's passport ID
     * @return The passport ID or 0 if none exists
     */
    function getMyPassportId() external view returns (uint256) {
        return ownerToPassport[msg.sender];
    }

    /**
     * @notice Checks if a passport is currently valid
     * @param _passportId The ID of the passport
     * @return true if valid, false otherwise
     */
    function isValidPassport(uint256 _passportId) external view returns (bool) {
        if (_passportId == 0 || _passportId > nextPassportId) return false;
        if (!passports[_passportId].isActive) return false;
        if (block.timestamp > passports[_passportId].expiresAt) return false;
        return true;
    }
}
