const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("ConfidentialDigitalPassport", function () {
  let passport;
  let authority, citizen, verifier, other;

  beforeEach(async function () {
    [authority, citizen, verifier, other] = await ethers.getSigners();

    const ConfidentialDigitalPassport = await ethers.getContractFactory(
      "ConfidentialDigitalPassport"
    );
    passport = await ConfidentialDigitalPassport.deploy();
    await passport.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct authority", async function () {
      expect(await passport.authority()).to.equal(authority.address);
    });

    it("Should initialize nextPassportId to 1", async function () {
      expect(await passport.nextPassportId()).to.equal(1);
    });
  });

  describe("Verifier Management", function () {
    it("Should authorize a verifier", async function () {
      await passport.connect(authority).authorizeVerifier(verifier.address);
      expect(await passport.authorizedVerifiers(verifier.address)).to.be.true;
    });

    it("Should revoke a verifier", async function () {
      await passport.connect(authority).authorizeVerifier(verifier.address);
      await passport.connect(authority).revokeVerifier(verifier.address);
      expect(await passport.authorizedVerifiers(verifier.address)).to.be.false;
    });

    it("Should only allow authority to authorize verifiers", async function () {
      await expect(
        passport.connect(other).authorizeVerifier(verifier.address)
      ).to.be.revertedWith("Not authorized authority");
    });
  });

  describe("Passport Issuance", function () {
    it("Should issue a passport successfully", async function () {
      const tx = await passport.connect(authority).issuePassport(
        citizen.address,
        25,
        123456789,
        840,
        "John Doe",
        "United States",
        10
      );

      await expect(tx)
        .to.emit(passport, "PassportIssued")
        .withArgs(1, citizen.address, await ethers.provider.getBlock("latest").then(b => b.timestamp));

      expect(await passport.ownerToPassport(citizen.address)).to.equal(1);
      expect(await passport.nextPassportId()).to.equal(2);
    });

    it("Should not allow duplicate passports", async function () {
      await passport.connect(authority).issuePassport(
        citizen.address,
        25,
        123456789,
        840,
        "John Doe",
        "United States",
        10
      );

      await expect(
        passport.connect(authority).issuePassport(
          citizen.address,
          30,
          987654321,
          840,
          "John Doe",
          "United States",
          10
        )
      ).to.be.revertedWith("Owner already has passport");
    });

    it("Should only allow authority to issue passports", async function () {
      await expect(
        passport.connect(other).issuePassport(
          citizen.address,
          25,
          123456789,
          840,
          "John Doe",
          "United States",
          10
        )
      ).to.be.revertedWith("Not authorized authority");
    });
  });

  describe("Passport Information", function () {
    beforeEach(async function () {
      await passport.connect(authority).issuePassport(
        citizen.address,
        25,
        123456789,
        840,
        "John Doe",
        "United States",
        10
      );
    });

    it("Should retrieve passport information", async function () {
      const info = await passport.getPassportInfo(1);
      expect(info.isActive).to.be.true;
      expect(info.isVerified).to.be.true;
      expect(info.owner).to.equal(citizen.address);
      expect(info.encryptedName).to.equal("John Doe");
      expect(info.encryptedCountry).to.equal("United States");
    });

    it("Should check passport validity", async function () {
      expect(await passport.isValidPassport(1)).to.be.true;
    });

    it("Should get my passport ID", async function () {
      expect(await passport.connect(citizen).getMyPassportId()).to.equal(1);
    });
  });

  describe("Passport Revocation", function () {
    beforeEach(async function () {
      await passport.connect(authority).issuePassport(
        citizen.address,
        25,
        123456789,
        840,
        "John Doe",
        "United States",
        10
      );
    });

    it("Should revoke a passport", async function () {
      await passport.connect(authority).revokePassport(1);
      const info = await passport.getPassportInfo(1);
      expect(info.isActive).to.be.false;
      expect(await passport.ownerToPassport(citizen.address)).to.equal(0);
    });

    it("Should only allow authority to revoke passports", async function () {
      await expect(
        passport.connect(other).revokePassport(1)
      ).to.be.revertedWith("Not authorized authority");
    });
  });

  describe("Verification Requests", function () {
    beforeEach(async function () {
      await passport.connect(authority).issuePassport(
        citizen.address,
        25,
        123456789,
        840,
        "John Doe",
        "United States",
        10
      );
      await passport.connect(authority).authorizeVerifier(verifier.address);
    });

    it("Should request verification", async function () {
      await passport.connect(verifier).requestVerification(
        1,
        "Age verification",
        true,
        false,
        false
      );

      expect(await passport.getVerificationRequestCount(1)).to.equal(1);
    });

    it("Should get verification request details", async function () {
      await passport.connect(verifier).requestVerification(
        1,
        "Age verification",
        true,
        false,
        false
      );

      const request = await passport.getVerificationRequest(1, 0);
      expect(request.requester).to.equal(verifier.address);
      expect(request.purpose).to.equal("Age verification");
      expect(request.ageVerification).to.be.true;
      expect(request.isProcessed).to.be.false;
    });

    it("Should only allow authorized verifiers to request", async function () {
      await expect(
        passport.connect(other).requestVerification(
          1,
          "Age verification",
          true,
          false,
          false
        )
      ).to.be.revertedWith("Not authorized verifier");
    });
  });

  describe("Verification Approval", function () {
    beforeEach(async function () {
      await passport.connect(authority).issuePassport(
        citizen.address,
        25,
        123456789,
        840,
        "John Doe",
        "United States",
        10
      );
      await passport.connect(authority).authorizeVerifier(verifier.address);
      await passport.connect(verifier).requestVerification(
        1,
        "Age verification",
        true,
        false,
        false
      );
    });

    it("Should approve verification request", async function () {
      await passport.connect(citizen).approveVerificationRequest(1, 0);

      const request = await passport.getVerificationRequest(1, 0);
      expect(request.isApproved).to.be.true;
      expect(request.isProcessed).to.be.true;
    });

    it("Should deny verification request", async function () {
      await passport.connect(citizen).denyVerificationRequest(1, 0);

      const request = await passport.getVerificationRequest(1, 0);
      expect(request.isApproved).to.be.false;
      expect(request.isProcessed).to.be.true;
    });

    it("Should only allow passport owner to approve requests", async function () {
      await expect(
        passport.connect(other).approveVerificationRequest(1, 0)
      ).to.be.revertedWith("Not passport owner");
    });
  });

  describe("Authority Transfer", function () {
    it("Should update authority", async function () {
      await passport.connect(authority).updateAuthority(other.address);
      expect(await passport.authority()).to.equal(other.address);
    });

    it("Should only allow current authority to update", async function () {
      await expect(
        passport.connect(other).updateAuthority(other.address)
      ).to.be.revertedWith("Not authorized authority");
    });
  });
});
