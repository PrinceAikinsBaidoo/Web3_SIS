const hre = require("hardhat");
const fs = require('fs');

async function main() {
  const addresses = JSON.parse(fs.readFileSync('./contract-addresses.json', 'utf8'));
  
  // Wallet to add - the user's wallet from the error
  const walletToAdd = "0xFABB0ac9d68B0B445fB7357272Ff202C5651694a";
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Adding wallet:", walletToAdd);
  
  const InstitutionRegistry = await hre.ethers.getContractFactory("InstitutionRegistry");
  const instReg = InstitutionRegistry.attach(addresses.institutionRegistry);
  
  // Add the wallet as authorized
  const tx = await instReg.addAuthorizedWallet(walletToAdd);
  await tx.wait();
  
  console.log("Wallet added successfully!");
  
  // Verify
  const isAuthorized = await instReg.isWalletAuthorized(deployer.address, walletToAdd);
  console.log("Wallet authorized:", isAuthorized);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

