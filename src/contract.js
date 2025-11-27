export const CONTRACT_ADDRESS = "0x3d7Ce3a150a91e51fD5FbE25a539C0D2E24B009d";

export const CONTRACT_ABI = [
  "function authority() view returns (address)",
  "function nextPassportId() view returns (uint256)",
  "function issuePassport(address,uint32,uint64,uint32,string,string,uint256)",
  "function authorizeVerifier(address)",
  "function revokeVerifier(address)",
  "function requestVerification(uint256,string,bool,bool,bool)",
  "function approveVerificationRequest(uint256,uint256)",
  "function denyVerificationRequest(uint256,uint256)",
  "function verifyAge(uint256,uint32) returns (bool)",
  "function verifyNationality(uint256,uint32) returns (bool)",
  "function getMyPassportId() view returns (uint256)",
  "function getPassportInfo(uint256) view returns (bool,bool,uint256,uint256,address,string,string)",
  "function getVerificationRequestCount(uint256) view returns (uint256)",
  "function getVerificationRequest(uint256,uint256) view returns (address,string,bool,bool,bool,bool,bool,uint256)",
  "function isValidPassport(uint256) view returns (bool)",
  "function authorizedVerifiers(address) view returns (bool)",
  "event PassportIssued(uint256 indexed passportId, address indexed owner, uint256 issuedAt)",
  "event VerificationRequested(uint256 indexed passportId, address indexed requester, uint256 requestIndex)",
  "event VerificationApproved(uint256 indexed passportId, address indexed requester, uint256 requestIndex)",
  "event VerifierAuthorized(address indexed verifier)",
  "event VerifierRevoked(address indexed verifier)"
];
