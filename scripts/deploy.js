const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

/**
 * Deployment script for Confidential Digital Passport system
 * This script deploys the main contract to the specified network
 */
async function main() {
  console.log("Starting deployment process...\n");

  // Get network information
  const network = await hre.ethers.provider.getNetwork();
  console.log(`Deploying to network: ${network.name} (Chain ID: ${network.chainId})`);

  // Get deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deployer address: ${deployer.address}`);

  // Check deployer balance
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${hre.ethers.formatEther(balance)} ETH\n`);

  if (balance === 0n) {
    throw new Error("Deployer account has no ETH balance");
  }

  // Deploy ConfidentialDigitalPassport contract
  console.log("Deploying ConfidentialDigitalPassport contract...");

  const ConfidentialDigitalPassport = await hre.ethers.getContractFactory("ConfidentialDigitalPassport");

  const startTime = Date.now();
  const passport = await ConfidentialDigitalPassport.deploy();

  await passport.waitForDeployment();
  const contractAddress = await passport.getAddress();

  const deployTime = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\n✅ Contract deployed successfully!`);
  console.log(`Contract address: ${contractAddress}`);
  console.log(`Deployment time: ${deployTime}s`);
  console.log(`Transaction hash: ${passport.deploymentTransaction().hash}`);

  // Get deployment block information
  const deploymentReceipt = await passport.deploymentTransaction().wait();
  console.log(`Block number: ${deploymentReceipt.blockNumber}`);
  console.log(`Gas used: ${deploymentReceipt.gasUsed.toString()}`);

  // Verify authority is set correctly
  const authority = await passport.authority();
  console.log(`\nContract authority: ${authority}`);
  console.log(`Authority matches deployer: ${authority === deployer.address}`);

  // Save deployment information
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployerAddress: deployer.address,
    authorityAddress: authority,
    transactionHash: passport.deploymentTransaction().hash,
    blockNumber: deploymentReceipt.blockNumber,
    gasUsed: deploymentReceipt.gasUsed.toString(),
    deploymentTime: new Date().toISOString(),
    contractName: "ConfidentialDigitalPassport",
  };

  // Create deployments directory if it doesn't exist
  const deploymentsDir = path.join(__dirname, "../deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  // Save deployment info to file
  const deploymentFile = path.join(
    deploymentsDir,
    `${network.name}-${Date.now()}.json`
  );
  fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`\nDeployment info saved to: ${deploymentFile}`);

  // Save latest deployment info
  const latestFile = path.join(deploymentsDir, `${network.name}-latest.json`);
  fs.writeFileSync(latestFile, JSON.stringify(deploymentInfo, null, 2));
  console.log(`Latest deployment info saved to: ${latestFile}`);

  // Display next steps
  console.log("\n" + "=".repeat(60));
  console.log("NEXT STEPS:");
  console.log("=".repeat(60));
  console.log(`\n1. Verify the contract on Etherscan:`);
  console.log(`   npx hardhat verify --network ${network.name} ${contractAddress}`);
  console.log(`\n2. Interact with the contract:`);
  console.log(`   npx hardhat run scripts/interact.js --network ${network.name}`);
  console.log(`\n3. Run simulations:`);
  console.log(`   npx hardhat run scripts/simulate.js --network ${network.name}`);
  console.log("\n" + "=".repeat(60) + "\n");

  return {
    contract: passport,
    address: contractAddress,
    deploymentInfo,
  };
}

// Execute deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

module.exports = { main };
