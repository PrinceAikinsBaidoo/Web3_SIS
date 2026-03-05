const hre = require("hardhat");

async function main() {
  console.log("Checking contract state...\n");

  // Load contract addresses
  const fs = require('fs');
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  
  console.log("Contract addresses:", addresses);

  // Get contract instances
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const institutionRegistry = InstitutionRegistry.attach(addresses.institutionRegistry);

  // Check institution count
  const count = await institutionRegistry.getInstitutionCount();
  console.log("Institution count:", count.toString());

  // Get all institutions
  if (count > 0) {
    const institutions = await institutionRegistry.getInstitutions(0, count);
    console.log("Registered institutions:", institutions);
    
    for (const addr of institutions) {
      const info = await institutionRegistry.getInstitutionInfo(addr);
      console.log(`\nInstitution ${addr}:`);
      console.log("  Name:", info.name);
      console.log("  Domain:", info.domain);
      console.log("  Is Accredited:", info.isAccredited);
    }
  }

  // Check deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);
  
  const isRegistered = await institutionRegistry.isRegistered(deployer.address);
  console.log("Is deployer registered:", isRegistered);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
