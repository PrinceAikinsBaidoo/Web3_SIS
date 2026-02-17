const hre = require("hardhat");

async function main() {
  console.log("Deploying Hybrid Blockchain Academic Records Contracts...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Account balance:", (await deployer.getBalance()).toString());
  console.log("");

  // Deploy InstitutionRegistry first
  console.log("1. Deploying InstitutionRegistry...");
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const institutionRegistry = await InstitutionRegistry.deploy();
  await institutionRegistry.deployed();
  console.log("   InstitutionRegistry deployed to:", institutionRegistry.address);

  // Deploy RecordRegistry
  console.log("\n2. Deploying RecordRegistry...");
  const RecordRegistry = await hre.ethers.getContractFactory("RecordRegistry");
  const recordRegistry = await RecordRegistry.deploy();
  await recordRegistry.deployed();
  console.log("   RecordRegistry deployed to:", recordRegistry.address);

  // Deploy StudentIdentity
  console.log("\n3. Deploying StudentIdentity...");
  const StudentIdentity = await hre.ethers.getContractFactory("StudentIdentity");
  const studentIdentity = await StudentIdentity.deploy();
  await studentIdentity.deployed();
  console.log("   StudentIdentity deployed to:", studentIdentity.address);

  // Deploy VerificationLog
  console.log("\n4. Deploying VerificationLog...");
  const VerificationLog = await hre.ethers.getContractFactory("VerificationLog");
  const verificationLog = await VerificationLog.deploy();
  await verificationLog.deployed();
  console.log("   VerificationLog deployed to:", verificationLog.address);

  // Authorize deployer as issuer in RecordRegistry
  const isAuthorized = await recordRegistry.authorizedIssuers(deployer.address);
  console.log("\n   Deployer authorized as issuer:", isAuthorized);

  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log("InstitutionRegistry:", institutionRegistry.address);
  console.log("RecordRegistry:    ", recordRegistry.address);
  console.log("StudentIdentity:    ", studentIdentity.address);
  console.log("VerificationLog:   ", verificationLog.address);
  console.log("=".repeat(60));

  // Save contract addresses to a file for frontend
  const fs = require('fs');
  const config = {
    institutionRegistry: institutionRegistry.address,
    recordRegistry: recordRegistry.address,
    studentIdentity: studentIdentity.address,
    verificationLog: verificationLog.address,
    network: hre.network.name
  };
  
  fs.writeFileSync(
    './contract-addresses.json',
    JSON.stringify(config, null, 2)
  );
  console.log("\nContract addresses saved to contract-addresses.json");

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\n--- Contract Deployment Complete ---");
    console.log("Network:", hre.network.name);
    console.log("Save these addresses for interacting with the contracts!");
  }
}

// Execute the deployment
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

