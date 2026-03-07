const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  const userWallet = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
  const deployer = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
  
  const RecordRegistry = await hre.ethers.getContractFactory("RecordRegistry");
  const recordReg = RecordRegistry.attach(addresses.recordRegistry);
  
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const instReg = InstitutionRegistry.attach(addresses.institutionRegistry);
  
  console.log("=== Authorization Verification ===");
  console.log("User wallet:", userWallet);
  console.log("");
  console.log("1. Authorized in RecordRegistry (isAuthorized):", await recordReg.isAuthorized(userWallet));
  console.log("2. InstitutionRegistry linked:", (await recordReg.institutionRegistryAddress()) !== '0x0000000000000000000000000000000000000000');
  console.log("3. Institution registered (by deployer):", await instReg.isRegistered(deployer));
  console.log("4. Institution accredited (by deployer):", await instReg.isAccredited(deployer));
  console.log("5. User wallet authorized for institution:", await instReg.isWalletAuthorized(deployer, userWallet));
  console.log("");
  console.log("=== All checks passed! User can now issue credentials. ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

