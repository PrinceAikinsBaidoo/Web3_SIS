const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  
  // Get accounts
  const [deployer] = await hre.ethers.getSigners();
  const userWallet = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
  
  console.log("=== Setting up Issuer Environment ===");
  console.log("Deployer:", deployer.address);
  console.log("User Wallet:", userWallet);
  console.log("");
  
  // Get contracts
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const instReg = InstitutionRegistry.attach(addresses.institutionRegistry);
  
  const RecordRegistry = await hre.ethers.getContractFactory("RecordRegistry");
  const recordReg = RecordRegistry.attach(addresses.recordRegistry);
  
  // Step 1: Register Institution (if not already registered)
  console.log("1. Checking if institution is registered...");
  const isRegistered = await instReg.isRegistered(deployer.address);
  
  if (!isRegistered) {
    console.log("   Registering institution...");
    const tx1 = await instReg.registerInstitution(
      "KNUST",
      "knust.edu.gh",
      "ACC-4UF3J0-0011",
      JSON.stringify({ description: "Demo institution for testing" })
    );
    await tx1.wait();
    console.log("   ✓ Institution registered!");
  } else {
    console.log("   ✓ Institution already registered");
  }
  
  // Step 2: Self-Accredit (for demo purposes)
  console.log("\n2. Checking accreditation status...");
  const isAccredited = await instReg.isAccredited(deployer.address);
  
  if (!isAccredited) {
    console.log("   Self-accrediting...");
    const tx2 = await instReg.selfAccredit("ACC-4UF3J0-0011");
    await tx2.wait();
    console.log("   ✓ Self-accredited!");
  } else {
    console.log("   ✓ Already accredited");
  }
  
  // Step 3: Link RecordRegistry to InstitutionRegistry
  console.log("\n3. Linking RecordRegistry to InstitutionRegistry...");
  const currentLink = await recordReg.institutionRegistryAddress();
  
  if (currentLink === '0x0000000000000000000000000000000000000000') {
    const tx3 = await recordReg.setInstitutionRegistry(addresses.institutionRegistry);
    await tx3.wait();
    console.log("   ✓ Contracts linked!");
  } else {
    console.log("   ✓ Already linked");
  }
  
  // Step 4: Add user wallet as authorized in InstitutionRegistry
  console.log("\n4. Adding user wallet as authorized in InstitutionRegistry...");
  const isWalletAuth = await instReg.isWalletAuthorized(deployer.address, userWallet);
  
  if (!isWalletAuth) {
    const tx4 = await instReg.addAuthorizedWallet(userWallet);
    await tx4.wait();
    console.log("   ✓ User wallet authorized in InstitutionRegistry!");
  } else {
    console.log("   ✓ User wallet already authorized in InstitutionRegistry");
  }
  
  // Step 5: Authorize user wallet directly in RecordRegistry
  console.log("\n5. Authorizing user wallet in RecordRegistry...");
  const isUserDirectAuth = await recordReg.isAuthorized(userWallet);
  
  if (!isUserDirectAuth) {
    const tx5 = await recordReg.authorizeIssuer(userWallet);
    await tx5.wait();
    console.log("   ✓ User wallet authorized in RecordRegistry!");
  } else {
    console.log("   ✓ User wallet already authorized in RecordRegistry");
  }
  
  // Step 6: Also authorize the DEPLOYER in RecordRegistry
  console.log("\n6. Authorizing deployer in RecordRegistry...");
  const isDeployerAuth = await recordReg.isAuthorized(deployer.address);
  
  if (!isDeployerAuth) {
    const tx6 = await recordReg.authorizeIssuer(deployer.address);
    await tx6.wait();
    console.log("   ✓ Deployer authorized in RecordRegistry!");
  } else {
    console.log("   ✓ Deployer already authorized in RecordRegistry");
  }
  
  // Final Verification
  console.log("\n=== Final Status ===");
  console.log("Institution registered:", await instReg.isRegistered(deployer.address));
  console.log("Institution accredited:", await instReg.isAccredited(deployer.address));
  console.log("RecordRegistry linked:", (await recordReg.institutionRegistryAddress()) !== '0x0000000000000000000000000000000000000000');
  console.log("User wallet authorized (InstitutionRegistry):", await instReg.isWalletAuthorized(deployer.address, userWallet));
  console.log("User wallet authorized (RecordRegistry):", await recordReg.isAuthorized(userWallet));
  console.log("Deployer authorized (RecordRegistry):", await recordReg.isAuthorized(deployer.address));
  
  console.log("\n=== Setup Complete! ===");
  console.log("The user can now issue credentials.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

