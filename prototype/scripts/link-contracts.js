const hre = require("hardhat");
const fs = require('fs');

async function main() {
  // Load deployed contract addresses
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  
  console.log("Current contract addresses:", addresses);
  console.log("Network:", hre.network.name);
  
  // Get the deployer (first account from Hardhat)
  const [deployer] = await hre.ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);
  
  // Get contract instances
  const RecordRegistry = await hre.ethers.getContractFactory("RecordRegistry");
  const recordRegistry = RecordRegistry.attach(addresses.recordRegistry);
  
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const institutionRegistry = InstitutionRegistry.attach(addresses.institutionRegistry);
  
  // Step 1: Check if deployer is authorized in RecordRegistry
  const isAuthorized = await recordRegistry.authorizedIssuers(deployer.address);
  console.log("\n1. Deployer authorized in RecordRegistry:", isAuthorized);
  
  if (!isAuthorized) {
    console.log("   Authorizing deployer in RecordRegistry...");
    const tx = await recordRegistry.authorizeIssuer(deployer.address);
    await tx.wait();
    console.log("   Deployer authorized successfully!");
  }
  
  // Step 2: Set InstitutionRegistry address in RecordRegistry
  console.log("\n2. Setting InstitutionRegistry in RecordRegistry...");
  const currentRegistryAddress = await recordRegistry.institutionRegistryAddress();
  console.log("   Current InstitutionRegistry address:", currentRegistryAddress);
  
  if (currentRegistryAddress === '0x0000000000000000000000000000000000000000' || 
      currentRegistryAddress === '0x') {
    const tx = await recordRegistry.setInstitutionRegistry(addresses.institutionRegistry);
    await tx.wait();
    console.log("   InstitutionRegistry linked successfully!");
  } else {
    console.log("   InstitutionRegistry already linked!");
  }
  
  // Step 3: Register deployer's institution if not registered
  // NOTE: This is optional - set SKIP_REGISTRATION=true to skip auto-registration
  const skipRegistration = process.env.SKIP_REGISTRATION === 'true';
  
  console.log("\n3. Checking institution registration...");
  const isInstRegistered = await institutionRegistry.isRegistered(deployer.address);
  console.log("   Institution registered:", isInstRegistered);
  
  if (!isInstRegistered && !skipRegistration) {
    console.log("   Registering institution...");
    // Get institution name from environment or use defaults
    const instName = process.env.INSTITUTION_NAME || "My University";
    const instDomain = process.env.INSTITUTION_DOMAIN || "university.edu";
    const accId = process.env.ACCREDITATION_ID || "ACC-" + Date.now().toString().slice(-6);
    
    const tx = await institutionRegistry.registerInstitution(
      instName,
      instDomain,
      accId,
      JSON.stringify({ description: "Institution registered via link-contracts" })
    );
    await tx.wait();
    console.log("   Institution registered!");
  } else if (skipRegistration) {
    console.log("   Skipping registration (SKIP_REGISTRATION=true)");
  }
  
  // Step 4: Self-accredit the institution
  // NOTE: This is also optional - set SKIP_ACCREDITATION=true to skip
  const skipAccreditation = process.env.SKIP_ACCREDITATION === 'true';
  
  console.log("\n4. Checking accreditation...");
  const isAccredited = await institutionRegistry.isAccredited(deployer.address);
  console.log("   Institution accredited:", isAccredited);
  
  if (!isAccredited && !skipAccreditation) {
    console.log("   Self-accrediting institution...");
    try {
      const tx = await institutionRegistry.selfAccredit("ACC-" + Date.now().toString().slice(-6));
      await tx.wait();
      console.log("   Institution accredited!");
    } catch (e) {
      console.log("   Accreditation may already be done or failed:", e.message);
    }
  } else if (skipAccreditation) {
    console.log("   Skipping accreditation (SKIP_ACCREDITATION=true)");
  }
  
  // Step 5: Add deployer as authorized wallet for the institution
  // NOTE: This is also optional - set SKIP_WALLET_AUTH=true to skip
  const skipWalletAuth = process.env.SKIP_WALLET_AUTH === 'true';
  
  console.log("\n5. Checking wallet authorization...");
  const isWalletAuthorized = await institutionRegistry.isWalletAuthorized(deployer.address, deployer.address);
  console.log("   Wallet authorized for institution:", isWalletAuthorized);
  
  if (!isWalletAuthorized && !skipWalletAuth) {
    console.log("   Adding wallet as authorized...");
    const tx = await institutionRegistry.addAuthorizedWallet(deployer.address);
    await tx.wait();
    console.log("   Wallet authorized!");
  } else if (skipWalletAuth) {
    console.log("   Skipping wallet authorization (SKIP_WALLET_AUTH=true)");
  }
  
  // Final status
  console.log("\n" + "=".repeat(60));
  console.log("LINKING COMPLETE");
  console.log("=".repeat(60));
  console.log("Deployer:", deployer.address);
  console.log("Authorized in RecordRegistry:", await recordRegistry.authorizedIssuers(deployer.address));
  console.log("InstitutionRegistry linked:", (await recordRegistry.institutionRegistryAddress()) !== '0x0000000000000000000000000000000000000000');
  console.log("Institution registered:", await institutionRegistry.isRegistered(deployer.address));
  console.log("Institution accredited:", await institutionRegistry.isAccredited(deployer.address));
  console.log("Wallet authorized:", await institutionRegistry.isWalletAuthorized(deployer.address, deployer.address));
  console.log("=".repeat(60));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

