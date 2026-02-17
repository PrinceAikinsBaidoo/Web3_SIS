/**
 * Link InstitutionRegistry to RecordRegistry
 * This enables institution-based authorization
 */

const hre = require("hardhat");

async function main() {
  console.log("Linking InstitutionRegistry to RecordRegistry...\n");

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Using account:", deployer.address);

  // Load contract addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  
  console.log("Contract addresses:", addresses);

  // Get contract instances
  const RecordRegistry = await hre.ethers.getContractFactory("RecordRegistry");
  const recordRegistry = RecordRegistry.attach(addresses.recordRegistry);

  // Set InstitutionRegistry address
  console.log("\nSetting InstitutionRegistry address in RecordRegistry...");
  const tx = await recordRegistry.setInstitutionRegistry(addresses.institutionRegistry);
  await tx.wait();
  
  console.log("✅ InstitutionRegistry linked successfully!");
  
  // Verify the link
  const linkedAddress = await recordRegistry.institutionRegistryAddress();
  console.log("   InstitutionRegistry address:", linkedAddress);

  // Verify deployer is still authorized
  const isAuthorized = await recordRegistry.isAuthorized(deployer.address);
  console.log("   Deployer authorized:", isAuthorized);

  console.log("\n" + "=".repeat(60));
  console.log("✅ INTEGRATION COMPLETE");
  console.log("=".repeat(60));
  console.log("You can now:");
  console.log("1. Register an institution at /institution");
  console.log("2. Add authorized wallets");
  console.log("3. Issue records from authorized wallets");
  console.log("=".repeat(60));
}

// Execute
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

