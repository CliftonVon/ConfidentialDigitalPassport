import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ConfidentialDigitalPassport } from "../typechain-types";
import { time } from "@nomicfoundation/hardhat-network-helpers";

type Signers = {
  deployer: HardhatEthersSigner;
  authority: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
  charlie: HardhatEthersSigner;
  verifier: HardhatEthersSigner;
  malicious: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = await ethers.getContractFactory("ConfidentialDigitalPassport");
  const contract = (await factory.deploy()) as unknown as ConfidentialDigitalPassport;
  await contract.waitForDeployment();
  const contractAddress = await contract.getAddress();

  return { contract, contractAddress };
}

describe("ConfidentialDigitalPassport", function () {
  let signers: Signers;
  let contract: ConfidentialDigitalPassport;
  let contractAddress: string;

  const SAMPLE_AGE = 25;
  const SAMPLE_NATIONAL_ID = 123456789n;
  const SAMPLE_CITIZENSHIP_CODE = 840; // USA country code
  const SAMPLE_NAME = "encrypted_name_data";
  const SAMPLE_COUNTRY = "encrypted_country_data";
  const DEFAULT_VALIDITY = 10; // 10 years

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = {
      deployer: ethSigners[0],
      authority: ethSigners[0], // deployer is authority
      alice: ethSigners[1],
      bob: ethSigners[2],
      charlie: ethSigners[3],
      verifier: ethSigners[4],
      malicious: ethSigners[5],
    };
  });

  beforeEach(async function () {
    ({ contract, contractAddress } = await deployFixture());
  });

  describe("Deployment and Initialization", function () {
    it("should deploy successfully", async function () {
      expect(await contract.getAddress()).to.be.properAddress;
    });

    it("should set deployer as authority", async function () {
      expect(await contract.authority()).to.equal(signers.deployer.address);
    });

    it("should initialize nextPassportId to 1", async function () {
      expect(await contract.nextPassportId()).to.equal(1);
    });

    it("should have correct contract address format", async function () {
      const address = await contract.getAddress();
      expect(address).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("Passport Issuance", function () {
    it("should issue passport successfully by authority", async function () {
      const tx = await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await expect(tx)
        .to.emit(contract, "PassportIssued")
        .withArgs(1, signers.alice.address, await time.latest());
    });

    it("should increment nextPassportId after issuance", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      expect(await contract.nextPassportId()).to.equal(2);
    });

    it("should map owner to passport ID correctly", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      expect(await contract.ownerToPassport(signers.alice.address)).to.equal(1);
    });

    it("should revert when non-authority tries to issue passport", async function () {
      await expect(
        contract
          .connect(signers.bob)
          .issuePassport(
            signers.alice.address,
            SAMPLE_AGE,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            DEFAULT_VALIDITY
          )
      ).to.be.revertedWith("Not authorized authority");
    });

    it("should revert when issuing passport with zero address", async function () {
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            ethers.ZeroAddress,
            SAMPLE_AGE,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            DEFAULT_VALIDITY
          )
      ).to.be.revertedWith("Invalid owner address");
    });

    it("should revert when owner already has passport", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            30,
            987654321n,
            100,
            "other_name",
            "other_country",
            DEFAULT_VALIDITY
          )
      ).to.be.revertedWith("Owner already has passport");
    });

    it("should revert with zero validity period", async function () {
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            SAMPLE_AGE,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            0
          )
      ).to.be.revertedWith("Invalid validity period");
    });

    it("should revert with validity period over 10 years", async function () {
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            SAMPLE_AGE,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            11
          )
      ).to.be.revertedWith("Invalid validity period");
    });

    it("should issue multiple passports to different owners", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.bob.address,
          30,
          987654321n,
          100,
          "bob_encrypted",
          "bob_country",
          5
        );

      expect(await contract.ownerToPassport(signers.alice.address)).to.equal(1);
      expect(await contract.ownerToPassport(signers.bob.address)).to.equal(2);
      expect(await contract.nextPassportId()).to.equal(3);
    });

    it("should set passport as active and verified", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      const info = await contract.getPassportInfo(1);
      expect(info.isActive).to.be.true;
      expect(info.isVerified).to.be.true;
    });

    it("should set correct expiration date", async function () {
      const validityYears = 5;
      const beforeIssuance = await time.latest();

      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          validityYears
        );

      const info = await contract.getPassportInfo(1);
      const expectedExpiry = beforeIssuance + validityYears * 365 * 24 * 60 * 60;

      // Allow small time difference due to block timestamp
      expect(Number(info.expiresAt)).to.be.closeTo(expectedExpiry, 10);
    });
  });

  describe("Passport Revocation", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );
    });

    it("should revoke passport by authority", async function () {
      const tx = await contract.connect(signers.authority).revokePassport(1);

      await expect(tx)
        .to.emit(contract, "PassportRevoked")
        .withArgs(1, signers.alice.address);
    });

    it("should set passport as inactive after revocation", async function () {
      await contract.connect(signers.authority).revokePassport(1);

      const info = await contract.getPassportInfo(1);
      expect(info.isActive).to.be.false;
    });

    it("should clear owner mapping after revocation", async function () {
      await contract.connect(signers.authority).revokePassport(1);

      expect(await contract.ownerToPassport(signers.alice.address)).to.equal(0);
    });

    it("should revert when non-authority tries to revoke", async function () {
      await expect(
        contract.connect(signers.bob).revokePassport(1)
      ).to.be.revertedWith("Not authorized authority");
    });

    it("should revert when revoking invalid passport ID", async function () {
      await expect(
        contract.connect(signers.authority).revokePassport(999)
      ).to.be.revertedWith("Invalid passport ID");
    });

    it("should revert when revoking already inactive passport", async function () {
      await contract.connect(signers.authority).revokePassport(1);

      await expect(
        contract.connect(signers.authority).revokePassport(1)
      ).to.be.revertedWith("Passport not active");
    });
  });

  describe("Verifier Authorization", function () {
    it("should authorize verifier by authority", async function () {
      const tx = await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      await expect(tx)
        .to.emit(contract, "VerifierAuthorized")
        .withArgs(signers.verifier.address);
    });

    it("should set verifier as authorized", async function () {
      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      expect(await contract.authorizedVerifiers(signers.verifier.address)).to.be.true;
    });

    it("should revoke verifier authorization", async function () {
      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      const tx = await contract
        .connect(signers.authority)
        .revokeVerifier(signers.verifier.address);

      await expect(tx)
        .to.emit(contract, "VerifierRevoked")
        .withArgs(signers.verifier.address);

      expect(await contract.authorizedVerifiers(signers.verifier.address)).to.be.false;
    });

    it("should revert when non-authority tries to authorize verifier", async function () {
      await expect(
        contract.connect(signers.bob).authorizeVerifier(signers.verifier.address)
      ).to.be.revertedWith("Not authorized authority");
    });

    it("should revert when authorizing zero address", async function () {
      await expect(
        contract.connect(signers.authority).authorizeVerifier(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid verifier address");
    });

    it("should revert when non-authority tries to revoke verifier", async function () {
      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      await expect(
        contract.connect(signers.bob).revokeVerifier(signers.verifier.address)
      ).to.be.revertedWith("Not authorized authority");
    });
  });

  describe("Verification Requests", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);
    });

    it("should create verification request by authorized verifier", async function () {
      const tx = await contract
        .connect(signers.verifier)
        .requestVerification(1, "Employment verification", true, false, false);

      await expect(tx)
        .to.emit(contract, "VerificationRequested")
        .withArgs(1, signers.verifier.address, 0);
    });

    it("should allow authority to create verification request", async function () {
      const tx = await contract
        .connect(signers.authority)
        .requestVerification(1, "Government check", true, true, true);

      await expect(tx)
        .to.emit(contract, "VerificationRequested")
        .withArgs(1, signers.authority.address, 0);
    });

    it("should increment verification request count", async function () {
      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Purpose 1", true, false, false);

      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Purpose 2", false, true, false);

      expect(await contract.getVerificationRequestCount(1)).to.equal(2);
    });

    it("should revert when unauthorized verifier requests verification", async function () {
      await expect(
        contract
          .connect(signers.bob)
          .requestVerification(1, "Unauthorized request", true, false, false)
      ).to.be.revertedWith("Not authorized verifier");
    });

    it("should revert when requesting verification for invalid passport", async function () {
      await expect(
        contract
          .connect(signers.verifier)
          .requestVerification(999, "Invalid passport", true, false, false)
      ).to.be.revertedWith("Invalid passport ID");
    });

    it("should revert when requesting verification for inactive passport", async function () {
      await contract.connect(signers.authority).revokePassport(1);

      await expect(
        contract
          .connect(signers.verifier)
          .requestVerification(1, "Revoked passport", true, false, false)
      ).to.be.revertedWith("Passport not active");
    });

    it("should revert when no verification type is selected", async function () {
      await expect(
        contract
          .connect(signers.verifier)
          .requestVerification(1, "No verification type", false, false, false)
      ).to.be.revertedWith("At least one verification type required");
    });

    it("should store verification request details correctly", async function () {
      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Age and nationality check", true, true, false);

      const request = await contract.getVerificationRequest(1, 0);

      expect(request.requester).to.equal(signers.verifier.address);
      expect(request.purpose).to.equal("Age and nationality check");
      expect(request.ageVerification).to.be.true;
      expect(request.nationalityVerification).to.be.true;
      expect(request.identityVerification).to.be.false;
      expect(request.isApproved).to.be.false;
      expect(request.isProcessed).to.be.false;
    });
  });

  describe("Verification Request Approval", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Employment verification", true, false, true);
    });

    it("should approve verification request by passport owner", async function () {
      const tx = await contract
        .connect(signers.alice)
        .approveVerificationRequest(1, 0);

      await expect(tx)
        .to.emit(contract, "VerificationApproved")
        .withArgs(1, signers.verifier.address, 0);
    });

    it("should mark request as approved and processed", async function () {
      await contract.connect(signers.alice).approveVerificationRequest(1, 0);

      const request = await contract.getVerificationRequest(1, 0);
      expect(request.isApproved).to.be.true;
      expect(request.isProcessed).to.be.true;
    });

    it("should revert when non-owner tries to approve", async function () {
      await expect(
        contract.connect(signers.bob).approveVerificationRequest(1, 0)
      ).to.be.revertedWith("Not passport owner");
    });

    it("should revert when approving invalid request index", async function () {
      await expect(
        contract.connect(signers.alice).approveVerificationRequest(1, 999)
      ).to.be.revertedWith("Invalid request index");
    });

    it("should revert when approving already processed request", async function () {
      await contract.connect(signers.alice).approveVerificationRequest(1, 0);

      await expect(
        contract.connect(signers.alice).approveVerificationRequest(1, 0)
      ).to.be.revertedWith("Request already processed");
    });
  });

  describe("Verification Request Denial", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Background check", false, true, true);
    });

    it("should deny verification request by passport owner", async function () {
      const tx = await contract
        .connect(signers.alice)
        .denyVerificationRequest(1, 0);

      await expect(tx)
        .to.emit(contract, "VerificationDenied")
        .withArgs(1, signers.verifier.address, 0);
    });

    it("should mark request as processed but not approved", async function () {
      await contract.connect(signers.alice).denyVerificationRequest(1, 0);

      const request = await contract.getVerificationRequest(1, 0);
      expect(request.isApproved).to.be.false;
      expect(request.isProcessed).to.be.true;
    });

    it("should revert when non-owner tries to deny", async function () {
      await expect(
        contract.connect(signers.bob).denyVerificationRequest(1, 0)
      ).to.be.revertedWith("Not passport owner");
    });

    it("should revert when denying already processed request", async function () {
      await contract.connect(signers.alice).denyVerificationRequest(1, 0);

      await expect(
        contract.connect(signers.alice).denyVerificationRequest(1, 0)
      ).to.be.revertedWith("Request already processed");
    });
  });

  describe("Age Verification", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );
    });

    it("should verify age and return encrypted result", async function () {
      const result = await contract.verifyAge(1, 18);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    it("should revert for invalid passport in age verification", async function () {
      await expect(contract.verifyAge(999, 18)).to.be.revertedWith(
        "Invalid passport ID"
      );
    });

    it("should revert for inactive passport in age verification", async function () {
      await contract.connect(signers.authority).revokePassport(1);

      await expect(contract.verifyAge(1, 18)).to.be.revertedWith(
        "Passport not active"
      );
    });
  });

  describe("Nationality Verification", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );
    });

    it("should verify nationality and return encrypted result", async function () {
      const result = await contract.verifyNationality(1, SAMPLE_CITIZENSHIP_CODE);
      expect(result).to.not.equal(ethers.ZeroHash);
    });

    it("should revert for invalid passport in nationality verification", async function () {
      await expect(
        contract.verifyNationality(999, SAMPLE_CITIZENSHIP_CODE)
      ).to.be.revertedWith("Invalid passport ID");
    });
  });

  describe("Passport Information Queries", function () {
    beforeEach(async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );
    });

    it("should get passport info correctly", async function () {
      const info = await contract.getPassportInfo(1);

      expect(info.isActive).to.be.true;
      expect(info.isVerified).to.be.true;
      expect(info.owner).to.equal(signers.alice.address);
      expect(info.encryptedName).to.equal(SAMPLE_NAME);
      expect(info.encryptedCountry).to.equal(SAMPLE_COUNTRY);
    });

    it("should get passport ID by owner address", async function () {
      const passportId = await contract.getMyPassportId();
      expect(passportId).to.equal(0); // Deployer has no passport

      const alicePassportId = await contract
        .connect(signers.alice)
        .getMyPassportId();
      expect(alicePassportId).to.equal(1);
    });

    it("should check if passport is valid", async function () {
      expect(await contract.isValidPassport(1)).to.be.true;
      expect(await contract.isValidPassport(999)).to.be.false;
    });

    it("should return false for revoked passport validity", async function () {
      await contract.connect(signers.authority).revokePassport(1);

      expect(await contract.isValidPassport(1)).to.be.false;
    });

    it("should return false for expired passport", async function () {
      // Issue passport with 1 year validity
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.bob.address,
          30,
          987654321n,
          100,
          "bob_name",
          "bob_country",
          1
        );

      // Fast forward time by 2 years
      await time.increase(2 * 365 * 24 * 60 * 60);

      expect(await contract.isValidPassport(2)).to.be.false;
    });

    it("should revert when getting info for invalid passport", async function () {
      await expect(contract.getPassportInfo(999)).to.be.revertedWith(
        "Invalid passport ID"
      );
    });
  });

  describe("Authority Management", function () {
    it("should update authority by current authority", async function () {
      await contract
        .connect(signers.authority)
        .updateAuthority(signers.bob.address);

      expect(await contract.authority()).to.equal(signers.bob.address);
    });

    it("should revert when non-authority tries to update authority", async function () {
      await expect(
        contract.connect(signers.bob).updateAuthority(signers.charlie.address)
      ).to.be.revertedWith("Not authorized authority");
    });

    it("should revert when updating to zero address", async function () {
      await expect(
        contract.connect(signers.authority).updateAuthority(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid authority address");
    });

    it("should allow new authority to issue passports", async function () {
      await contract
        .connect(signers.authority)
        .updateAuthority(signers.bob.address);

      await expect(
        contract
          .connect(signers.bob)
          .issuePassport(
            signers.charlie.address,
            28,
            111222333n,
            200,
            "charlie_name",
            "charlie_country",
            5
          )
      ).to.not.be.reverted;
    });

    it("should prevent old authority from issuing passports", async function () {
      await contract
        .connect(signers.authority)
        .updateAuthority(signers.bob.address);

      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.charlie.address,
            28,
            111222333n,
            200,
            "charlie_name",
            "charlie_country",
            5
          )
      ).to.be.revertedWith("Not authorized authority");
    });
  });

  describe("Edge Cases and Security", function () {
    it("should handle maximum uint32 age value", async function () {
      const maxUint32 = 4294967295;
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            maxUint32,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            DEFAULT_VALIDITY
          )
      ).to.not.be.reverted;
    });

    it("should handle maximum uint64 national ID value", async function () {
      const maxUint64 = 18446744073709551615n;
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            SAMPLE_AGE,
            maxUint64,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            DEFAULT_VALIDITY
          )
      ).to.not.be.reverted;
    });

    it("should handle zero age value", async function () {
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            0,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            SAMPLE_NAME,
            SAMPLE_COUNTRY,
            DEFAULT_VALIDITY
          )
      ).to.not.be.reverted;
    });

    it("should handle empty string for encrypted name", async function () {
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            SAMPLE_AGE,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            "",
            SAMPLE_COUNTRY,
            DEFAULT_VALIDITY
          )
      ).to.not.be.reverted;
    });

    it("should handle very long encrypted strings", async function () {
      const longString = "a".repeat(1000);
      await expect(
        contract
          .connect(signers.authority)
          .issuePassport(
            signers.alice.address,
            SAMPLE_AGE,
            SAMPLE_NATIONAL_ID,
            SAMPLE_CITIZENSHIP_CODE,
            longString,
            longString,
            DEFAULT_VALIDITY
          )
      ).to.not.be.reverted;
    });

    it("should maintain state consistency after multiple operations", async function () {
      // Issue passport
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      // Authorize verifier
      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      // Request verification
      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Test", true, true, true);

      // Approve request
      await contract.connect(signers.alice).approveVerificationRequest(1, 0);

      // Verify state
      expect(await contract.nextPassportId()).to.equal(2);
      expect(await contract.ownerToPassport(signers.alice.address)).to.equal(1);
      expect(await contract.authorizedVerifiers(signers.verifier.address)).to.be
        .true;
      expect(await contract.getVerificationRequestCount(1)).to.equal(1);

      const request = await contract.getVerificationRequest(1, 0);
      expect(request.isApproved).to.be.true;
      expect(request.isProcessed).to.be.true;
    });
  });

  describe("Gas Optimization", function () {
    it("should have reasonable gas cost for passport issuance", async function () {
      const tx = await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      const receipt = await tx.wait();
      console.log("      Gas used for passport issuance:", receipt?.gasUsed.toString());

      // Should be less than 1M gas
      expect(receipt?.gasUsed).to.be.lt(1000000);
    });

    it("should have reasonable gas cost for verification request", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      const tx = await contract
        .connect(signers.verifier)
        .requestVerification(1, "Employment check", true, false, false);

      const receipt = await tx.wait();
      console.log("      Gas used for verification request:", receipt?.gasUsed.toString());

      // Should be less than 500k gas
      expect(receipt?.gasUsed).to.be.lt(500000);
    });

    it("should have reasonable gas cost for approval", async function () {
      await contract
        .connect(signers.authority)
        .issuePassport(
          signers.alice.address,
          SAMPLE_AGE,
          SAMPLE_NATIONAL_ID,
          SAMPLE_CITIZENSHIP_CODE,
          SAMPLE_NAME,
          SAMPLE_COUNTRY,
          DEFAULT_VALIDITY
        );

      await contract
        .connect(signers.authority)
        .authorizeVerifier(signers.verifier.address);

      await contract
        .connect(signers.verifier)
        .requestVerification(1, "Test", true, true, true);

      const tx = await contract
        .connect(signers.alice)
        .approveVerificationRequest(1, 0);

      const receipt = await tx.wait();
      console.log("      Gas used for approval:", receipt?.gasUsed.toString());

      // Should be less than 400k gas
      expect(receipt?.gasUsed).to.be.lt(400000);
    });
  });
});
