const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  
  // Get accounts
  const [deployer] = await hre.ethers.getSigners();
  const userWallet = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
  
  console.log("=== Linking Contracts & Authorizing Wallets ===");
  console.log("Deployer:", deployer.address);
  console.log("User Wallet:", userWallet);
  console.log("");
  
  // Get contracts
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const instReg = InstitutionRegistry.attach(addresses.institutionRegistry);
  
  const RecordRegistry = await hre.ethers.getContractFactory("RecordRegistry");
  const recordReg = RecordRegistry.attach(addresses.recordRegistry);
  
  // Step 1: Link RecordRegistry to InstitutionRegistry
  console.log("1. Linking RecordRegistry to InstitutionRegistry...");
  const currentLink = await recordReg.institutionRegistryAddress();
  console.log("   Current link:", currentLink);
  
  if (currentLink === '0x0000000000000000000000000000000000000000' || 
      currentLink.toLowerCase() !== addresses.institutionRegistry.toLowerCase()) {
    const tx = await recordReg.setInstitutionRegistry(addresses.institutionRegistry);
    await tx.wait();
    console.log("   ✓ Contracts linked!");
  } else {
    console.log("   ✓ Already linked to correct address");
  }
  
  // Step 2: Add user wallet to InstitutionRegistry (as authorized wallet)
  console.log("\n2. Adding user wallet to InstitutionRegistry...");
  try {
    const isWalletAuth = await instReg.isWalletAuthorized(deployer.address, userWallet);
    console.log("   Is user wallet authorized?", isWalletAuth);
    
    if (!isWalletAuth) {
      const tx = await instReg.addAuthorizedWallet(userWallet);
      await tx.wait();
      console.log("   ✓ User wallet added to InstitutionRegistry!");
    } else {
      console.log("   ✓ User wallet already authorized");
    }
  } catch (e) {
    console.log("   Error:", e.message);
  }
  
  // Step 3: Authorize user wallet in RecordRegistry directly
  console.log("\n3. Authorizing user wallet in RecordRegistry...");
  try {
    const isUserAuth = await recordReg.isAuthorized(userWallet);
    console.log("   Is user authorized?", isUserAuth);
    
    if (!isUserAuth) {
      const tx = await recordReg.authorizeIssuer(userWallet);
      await tx.wait();
      console.log("   ✓ User wallet authorized in RecordRegistry!");
    } else {
      console.log("   ✓ User wallet already authorized");
    }
  } catch (e) {
    console.log("   Error:", e.message);
  }
  
  // Step 4: Authorize deployer in RecordRegistry
  console.log("\n4. Authorizing deployer in RecordRegistry...");
  try {
    const isDeployerAuth = await recordReg.isAuthorized(deployer.address);
    console.log("   Is deployer authorized?", isDeployerAuth);
    
    if (!isDeployerAuth) {
      const tx = await recordReg.authorizeIssuer(deployer.address);
      await tx.wait();
      console.log("   ✓ Deployer authorized in RecordRegistry!");
    } else {
      console.log("   ✓ Deployer already authorized");
    }
  } catch (e) {
    console.log("   Error:", e.message);
  }
  
  // Final status
  console.log("\n=== Final Status ===");
  console.log("InstitutionRegistry linked:", (await recordReg.institutionRegistryAddress()).toLowerCase());
  console.log("User wallet authorized (InstReg):", await instReg.isWalletAuthorized(deployer.address, userWallet));
  console.log("User wallet authorized (RecordReg):", await recordReg.isAuthorized(userWallet));
  console.log("Deployer authorized (RecordReg):", await recordReg.isAuthorized(deployer.address));
  
  console.log("\n=== Complete! ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

