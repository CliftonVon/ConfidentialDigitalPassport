// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract ConfidentialDigitalPassport is SepoliaConfig {

    address public authority;
    uint256 public nextPassportId;

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

    event PassportIssued(uint256 indexed passportId, address indexed owner, uint256 issuedAt);
    event PassportRevoked(uint256 indexed passportId, address indexed owner);
    event VerificationRequested(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerificationApproved(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerificationDenied(uint256 indexed passportId, address indexed requester, uint256 requestIndex);
    event VerifierAuthorized(address indexed verifier);
    event VerifierRevoked(address indexed verifier);

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

    constructor() {
        authority = msg.sender;
        nextPassportId = 1;
    }

    function issuePassport(
        address _owner,
        uint32 _age,
        uint64 _nationalId,
        uint32 _citizenshipCode,
        string memory _encryptedName,
        string memory _encryptedCountry,
        uint256 _validityYears
    ) external onlyAuthority {
        require(_owner != address(0), "Invalid owner address");
        require(ownerToPassport[_owner] == 0, "Owner already has passport");
        require(_validityYears > 0 && _validityYears <= 10, "Invalid validity period");

        euint32 encryptedAge = FHE.asEuint32(_age);
        euint64 encryptedNationalId = FHE.asEuint64(_nationalId);
        euint32 encryptedCitizenshipCode = FHE.asEuint32(_citizenshipCode);

        uint256 passportId = nextPassportId;
        nextPassportId++;

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

        FHE.allowThis(encryptedAge);
        FHE.allowThis(encryptedNationalId);
        FHE.allowThis(encryptedCitizenshipCode);
        FHE.allow(encryptedAge, _owner);
        FHE.allow(encryptedNationalId, _owner);
        FHE.allow(encryptedCitizenshipCode, _owner);

        emit PassportIssued(passportId, _owner, block.timestamp);
    }

    function revokePassport(uint256 _passportId) external onlyAuthority validPassport(_passportId) {
        passports[_passportId].isActive = false;
        address owner = passports[_passportId].owner;
        ownerToPassport[owner] = 0;

        emit PassportRevoked(_passportId, owner);
    }

    function requestVerification(
        uint256 _passportId,
        string memory _purpose,
        bool _ageVerification,
        bool _nationalityVerification,
        bool _identityVerification
    ) external onlyAuthorizedVerifier validPassport(_passportId) {
        require(
            _ageVerification || _nationalityVerification || _identityVerification,
            "At least one verification type required"
        );

        verificationRequests[_passportId].push(VerificationRequest({
            passportId: _passportId,
            requester: msg.sender,
            purpose: _purpose,
            ageVerification: _ageVerification,
            nationalityVerification: _nationalityVerification,
            identityVerification: _identityVerification,
            isApproved: false,
            isProcessed: false,
            requestedAt: block.timestamp
        }));

        uint256 requestIndex = verificationRequests[_passportId].length - 1;

        emit VerificationRequested(_passportId, msg.sender, requestIndex);
    }

    function approveVerificationRequest(
        uint256 _passportId,
        uint256 _requestIndex
    ) external onlyPassportOwner(_passportId) {
        require(_requestIndex < verificationRequests[_passportId].length, "Invalid request index");

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        require(!request.isProcessed, "Request already processed");

        request.isApproved = true;
        request.isProcessed = true;

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

    function denyVerificationRequest(
        uint256 _passportId,
        uint256 _requestIndex
    ) external onlyPassportOwner(_passportId) {
        require(_requestIndex < verificationRequests[_passportId].length, "Invalid request index");

        VerificationRequest storage request = verificationRequests[_passportId][_requestIndex];
        require(!request.isProcessed, "Request already processed");

        request.isProcessed = true;

        emit VerificationDenied(_passportId, request.requester, _requestIndex);
    }

    function verifyAge(uint256 _passportId, uint32 _minimumAge) external validPassport(_passportId) returns (ebool) {
        euint32 minimumAge = FHE.asEuint32(_minimumAge);
        ebool result = FHE.ge(passports[_passportId].encryptedAge, minimumAge);
        FHE.allow(result, msg.sender);
        return result;
    }

    function verifyNationality(uint256 _passportId, uint32 _countryCode) external validPassport(_passportId) returns (ebool) {
        euint32 countryCode = FHE.asEuint32(_countryCode);
        ebool result = FHE.eq(passports[_passportId].encryptedCitizenshipCode, countryCode);
        FHE.allow(result, msg.sender);
        return result;
    }

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
        string memory encryptedCountry
    ) {
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
        uint256 requestedAt
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
            request.requestedAt
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
}