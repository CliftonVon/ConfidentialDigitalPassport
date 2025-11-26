const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Contract interaction script
 * This script provides examples of interacting with the deployed contract
 */

async function main() {
  console.log("Starting contract interaction...\n");

  // Get network information
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Connected to network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get signers
  const [deployer, citizen, verifier] = await hre.ethers.getSigners();
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Citizen: ${citizen.address}`);
  console.log(`Verifier: ${verifier.address}\n`);

  // Load deployment information
  const deploymentsDir = path.join(__dirname, "../deployments");
  const latestFile = path.join(deploymentsDir, `${network.name}-latest.json`);

  if (!fs.existsSync(latestFile)) {
    throw new Error(
      `No deployment found for network ${network.name}. Please deploy the contract first using: npx hardhat run scripts/deploy.js --network ${network.name}`
    );
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(latestFile, "utf8"));
  const contractAddress = deploymentInfo.contractAddress;

  console.log(`Contract address: ${contractAddress}\n`);

  // Connect to deployed contract
  const ConfidentialDigitalPassport = await hre.ethers.getContractFactory(
    "ConfidentialDigitalPassport"
  );
  const passport = ConfidentialDigitalPassport.attach(contractAddress);

  // Verify authority
  const authority = await passport.authority();
  console.log(`Contract authority: ${authority}`);
  console.log(`Authority is deployer: ${authority === deployer.address}\n`);

  // Display menu
  console.log("=".repeat(60));
  console.log("AVAILABLE INTERACTIONS");
  console.log("=".repeat(60));
  console.log("\n1. View Contract Information");
  console.log("2. Authorize Verifier");
  console.log("3. Issue Passport");
  console.log("4. Get Passport Information");
  console.log("5. Request Verification");
  console.log("6. Approve Verification Request");
  console.log("7. Verify Age");
  console.log("8. Verify Nationality");
  console.log("\n" + "=".repeat(60) + "\n");

  // Example 1: View Contract Information
  console.log("📋 1. VIEWING CONTRACT INFORMATION");
  console.log("-".repeat(60));
  const nextPassportId = await passport.nextPassportId();
  console.log(`Next passport ID: ${nextPassportId}`);
  console.log(`Total passports issued: ${nextPassportId - 1n}\n`);

  // Example 2: Authorize Verifier
  console.log("🔐 2. AUTHORIZING VERIFIER");
  console.log("-".repeat(60));
  const isAuthorizedBefore = await passport.authorizedVerifiers(verifier.address);
  console.log(`Verifier authorized (before): ${isAuthorizedBefore}`);

  if (!isAuthorizedBefore) {
    console.log(`Authorizing verifier: ${verifier.address}`);
    const authTx = await passport.connect(deployer).authorizeVerifier(verifier.address);
    await authTx.wait();
    console.log(`✅ Transaction hash: ${authTx.hash}`);
  }

  const isAuthorizedAfter = await passport.authorizedVerifiers(verifier.address);
  console.log(`Verifier authorized (after): ${isAuthorizedAfter}\n`);

  // Example 3: Issue Passport (if citizen doesn't have one)
  console.log("📜 3. ISSUING PASSPORT");
  console.log("-".repeat(60));
  const existingPassportId = await passport.ownerToPassport(citizen.address);

  if (existingPassportId === 0n) {
    console.log(`Issuing passport to: ${citizen.address}`);
    const issueTx = await passport.connect(deployer).issuePassport(
      citizen.address,
      25, // age
      123456789, // national ID
      840, // citizenship code (USA: 840)
      "John Doe", // encrypted name (in production, this would be encrypted)
      "United States", // encrypted country (in production, this would be encrypted)
      10 // validity in years
    );

    const receipt = await issueTx.wait();
    console.log(`✅ Transaction hash: ${issueTx.hash}`);
    console.log(`Gas used: ${receipt.gasUsed.toString()}`);

    // Get the issued passport ID from events
    const issueEvent = receipt.logs.find(
      (log) => log.topics[0] === passport.interface.getEvent("PassportIssued").topicHash
    );

    if (issueEvent) {
      const decodedEvent = passport.interface.decodeEventLog(
        "PassportIssued",
        issueEvent.data,
        issueEvent.topics
      );
      console.log(`Passport ID: ${decodedEvent.passportId}`);
    }
  } else {
    console.log(`Citizen already has passport ID: ${existingPassportId}`);
  }
  console.log();

  // Example 4: Get Passport Information
  console.log("ℹ️  4. GETTING PASSPORT INFORMATION");
  console.log("-".repeat(60));
  const passportId = await passport.ownerToPassport(citizen.address);

  if (passportId > 0n) {
    const passportInfo = await passport.getPassportInfo(passportId);
    console.log(`Passport ID: ${passportId}`);
    console.log(`Owner: ${passportInfo.owner}`);
    console.log(`Active: ${passportInfo.isActive}`);
    console.log(`Verified: ${passportInfo.isVerified}`);
    console.log(`Issued at: ${new Date(Number(passportInfo.issuedAt) * 1000).toISOString()}`);
    console.log(`Expires at: ${new Date(Number(passportInfo.expiresAt) * 1000).toISOString()}`);
    console.log(`Name (encrypted): ${passportInfo.encryptedName}`);
    console.log(`Country (encrypted): ${passportInfo.encryptedCountry}`);

    // Check validity
    const isValid = await passport.isValidPassport(passportId);
    console.log(`Is valid: ${isValid}`);
  } else {
    console.log("No passport found for citizen");
  }
  console.log();

  // Example 5: Request Verification
  console.log("📨 5. REQUESTING VERIFICATION");
  console.log("-".repeat(60));
  if (passportId > 0n) {
    const requestCountBefore = await passport.getVerificationRequestCount(passportId);
    console.log(`Verification requests (before): ${requestCountBefore}`);

    console.log(`Requesting age verification...`);
    const requestTx = await passport.connect(verifier).requestVerification(
      passportId,
      "Age verification for service access",
      true, // age verification
      false, // nationality verification
      false // identity verification
    );

    const receipt = await requestTx.wait();
    console.log(`✅ Transaction hash: ${requestTx.hash}`);

    const requestCountAfter = await passport.getVerificationRequestCount(passportId);
    console.log(`Verification requests (after): ${requestCountAfter}`);

    if (requestCountAfter > 0n) {
      const requestIndex = requestCountAfter - 1n;
      const request = await passport.getVerificationRequest(passportId, requestIndex);
      console.log(`\nRequest details:`);
      console.log(`  Requester: ${request.requester}`);
      console.log(`  Purpose: ${request.purpose}`);
      console.log(`  Age verification: ${request.ageVerification}`);
      console.log(`  Approved: ${request.isApproved}`);
      console.log(`  Processed: ${request.isProcessed}`);
    }
  }
  console.log();

  // Example 6: Approve Verification Request
  console.log("✅ 6. APPROVING VERIFICATION REQUEST");
  console.log("-".repeat(60));
  if (passportId > 0n) {
    const requestCount = await passport.getVerificationRequestCount(passportId);
    if (requestCount > 0n) {
      const lastRequestIndex = requestCount - 1n;
      const request = await passport.getVerificationRequest(passportId, lastRequestIndex);

      if (!request.isProcessed) {
        console.log(`Approving verification request ${lastRequestIndex}...`);
        const approveTx = await passport
          .connect(citizen)
          .approveVerificationRequest(passportId, lastRequestIndex);

        await approveTx.wait();
        console.log(`✅ Transaction hash: ${approveTx.hash}`);

        const updatedRequest = await passport.getVerificationRequest(passportId, lastRequestIndex);
        console.log(`Request approved: ${updatedRequest.isApproved}`);
        console.log(`Request processed: ${updatedRequest.isProcessed}`);
      } else {
        console.log("Request already processed");
      }
    }
  }
  console.log();

  // Display summary
  console.log("=".repeat(60));
  console.log("INTERACTION SUMMARY");
  console.log("=".repeat(60));
  console.log(`✅ Successfully interacted with contract at: ${contractAddress}`);
  console.log(`✅ Network: ${network.name}`);
  console.log(`✅ All operations completed successfully`);
  console.log("=".repeat(60) + "\n");
}

// Execute interactions
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Interaction failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = { main };
