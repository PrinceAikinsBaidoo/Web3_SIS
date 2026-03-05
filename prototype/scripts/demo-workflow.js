/**
 * Off-Chain Workflow Demo for Academic Record Management
 * 
 * This script demonstrates the complete workflow:
 * 1. Encrypt academic record (simulated)
 * 2. Upload to IPFS (simulated with local hash)
 * 3. Compute keccak256 hash for blockchain
 * 4. Interact with RecordRegistry smart contract
 * 
 * Usage:
 *   node scripts/demo-workflow.js
 * 
 * Requirements:
 *   - npm install ethers crypto axios dotenv
 *   - Configure .env with CONTRACT_ADDRESS and PRIVATE_KEY
 */

const ethers = require('ethers');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Configuration
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || '0x7FbC5257a73b51Fd01859cd50C7A1eAA5E476EA1';
const INSTITUTION_REGISTRY_ADDRESS = process.env.INSTITUTION_REGISTRY_ADDRESS || '0xcd454b704FED5744893874D70DE1A3F3C0858407';
const RPC_URL = process.env.RPC_URL || 'https://ethereum-sepolia-rpc.publicnode.com';

// ABI of RecordRegistry contract
const CONTRACT_ABI = [
  "function authorizeIssuer(address _issuer) external",
  "function issueRecord(bytes32 _recordHash, string calldata _metadata) external",
  "function revokeRecord(bytes32 _recordHash) external",
  "function getRecordStatus(bytes32 _recordHash) view returns (bool isValid, address issuer, uint256 timestamp, string memory metadata)",
  "function recordExists(bytes32 _recordHash) view returns (bool)",
  "function authorizedIssuers(address _issuer) view returns (bool)"
];

/**
 * Simulate file encryption (AES-256-GCM)
 * In production, use proper encryption with student's public key
 */
function encryptFile(filePath) {
  console.log(`\n📄 Step 1: Encrypting file: ${filePath}`);
  
  const key = crypto.randomBytes(32); // 256-bit key
  const iv = crypto.randomBytes(16);   // 128-bit IV
  
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(fs.readFileSync(filePath), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();
  
  console.log(`   ✅ File encrypted successfully`);
  console.log(`   📝 AES-256-GCM Key: ${key.toString('hex').substring(0, 16)}...`);
  console.log(`   🔒 IV: ${iv.toString('hex')}`);
  console.log(`   🏷️  Auth Tag: ${authTag.toString('hex').substring(0, 16)}...`);
  
  return { encrypted, key: key.toString('hex'), iv: iv.toString('hex'), authTag: authTag.toString('hex') };
}

/**
 * Simulate IPFS upload
 * In production, use actual IPFS client (e.g., ipfs-http-client or Pinata API)
 */
function uploadToIPFS(encryptedData) {
  console.log(`\n☁️  Step 2: Uploading to IPFS (simulated)`);
  
  // In production, this would upload to actual IPFS node
  // For demo, we generate a simulated CID
  const simulatedCID = 'Qm' + crypto.randomBytes(20).toString('base64').replace(/[/+=]/g, '').substring(0, 44);
  
  console.log(`   ✅ Encrypted data uploaded to IPFS`);
  console.log(`   🔗 CID: ${simulatedCID}`);
  
  return simulatedCID;
}

/**
 * Compute keccak256 hash of encrypted data
 * This hash is what gets stored on-chain
 */
function computeOnChainHash(encryptedData) {
  console.log(`\n🔐 Step 3: Computing keccak256 hash for blockchain`);
  
  const hash = crypto.createHash('sha256').update(encryptedData).digest('hex');
  const bytes32Hash = '0x' + hash;
  
  console.log(`   ✅ Hash computed: ${bytes32Hash}`);
  console.log(`   📝 This hash will be stored on the blockchain`);
  
  return bytes32Hash;
}

/**
 * Interact with the smart contract
 */
async function interactWithContract() {
  console.log(`\n⛓️  Step 4: Interacting with RecordRegistry smart contract`);
  
  // Connect to the blockchain
  const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
  
  // Check if we have a private key for signing transactions
  let wallet;
  if (process.env.PRIVATE_KEY) {
    wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log(`   👤 Connected with wallet: ${wallet.address}`);
  } else {
    console.log(`   ⚠️  No PRIVATE_KEY in .env - will use provider only for reads`);
    console.log(`   💡 To write to blockchain, add PRIVATE_KEY to .env file`);
  }
  
  // Create contract instance
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  
  console.log(`   📍 Contract address: ${CONTRACT_ADDRESS}`);
  console.log(`   🌐 Network: ${(await provider.getNetwork()).name}`);
  
  return { provider, wallet, contract };
}

/**
 * Demo the complete workflow with sample data
 */
async function runDemo() {
  console.log('='.repeat(60));
  console.log('🔬 HYBRID BLOCKCHAIN ACADEMIC RECORDS - PROTOTYPE DEMO');
  console.log('='.repeat(60));
  
  // Create a sample academic record for testing
  const sampleRecord = {
    studentId: 'STU2024001',
    studentName: 'John Doe',
    degree: 'Bachelor of Computer Science',
    graduationYear: '2024',
    cwa: '85',
    issueDate: new Date().toISOString(),
    issuer: 'Demo University'
  };
  
  const recordPath = path.join(__dirname, '../data/sample-record.json');
  
  // Ensure data directory exists
  const dataDir = path.dirname(recordPath);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  // Write sample record
  fs.writeFileSync(recordPath, JSON.stringify(sampleRecord, null, 2));
  console.log(`\n📝 Sample academic record created at: ${recordPath}`);
  
  // Step 1: Encrypt the file
  const { encrypted, key, iv, authTag } = encryptFile(recordPath);
  
  // Step 2: Upload to IPFS (simulated)
  const cid = uploadToIPFS(encrypted);
  
  // Step 3: Compute hash for blockchain
  const onChainHash = computeOnChainHash(encrypted);
  
  // Step 4: Interact with smart contract
  console.log('\n⏳ Connecting to blockchain...');
  try {
    const { provider, wallet, contract } = await interactWithContract();
    
    // If we have a wallet, demonstrate the full workflow
    if (wallet) {
      const contractWithSigner = contract.connect(wallet);
      
      console.log('\n--- 📋 ISSUING A RECORD ---');
      
      // Issue the record on-chain
      const metadata = JSON.stringify({
        studentId: sampleRecord.studentId,
        degree: sampleRecord.degree,
        cid: cid
      });
      
      const tx = await contractWithSigner.issueRecord(onChainHash, metadata);
      console.log(`   📝 Transaction sent: ${tx.hash}`);
      console.log(`   ⏳ Waiting for confirmation...`);
      
      const receipt = await tx.wait();
      console.log(`   ✅ Record issued! Block: ${receipt.blockNumber}`);
      
      console.log('\n--- 🔍 VERIFYING THE RECORD ---');
      
      // Verify the record
      const [isValid, issuer, timestamp, recordMetadata] = await contract.getRecordStatus(onChainHash);
      console.log(`   ✅ Record exists: ${isValid ? 'VALID' : 'INVALID'}`);
      console.log(`   🏛️  Issuer: ${issuer}`);
      console.log(`   📅 Issued at: ${new Date(timestamp * 1000).toISOString()}`);
      
      console.log('\n--- 🔐 TAMPER RESISTANCE TEST ---');
      
      // Simulate tampering: compute hash of modified data
      const tamperedData = encrypted + 'TAMPERED';
      const tamperedHash = computeOnChainHash(tamperedData);
      
      const [tamperedValid] = await contract.getRecordStatus(tamperedHash);
      console.log(`   ✅ Tampered hash check: ${tamperedValid ? 'VALID (should be false!)' : 'NOT FOUND (correct!)'}`);
      
      console.log('\n--- ❌ REVOKING THE RECORD ---');
      
      // Revoke the record
      const revokeTx = await contractWithSigner.revokeRecord(onChainHash);
      console.log(`   📝 Revoke transaction sent: ${revokeTx.hash}`);
      
      const revokeReceipt = await revokeTx.wait();
      console.log(`   ✅ Record revoked! Block: ${revokeReceipt.blockNumber}`);
      
      // Verify it's revoked
      const [afterRevoke] = await contract.getRecordStatus(onChainHash);
      console.log(`   📊 Record status after revocation: ${afterRevoke ? 'VALID' : 'INVALID'}`);
      
    } else {
      console.log('\n⚠️  Skipping blockchain interactions (no wallet configured)');
      console.log('   To test full workflow:');
      console.log('   1. Deploy contract: npx hardhat run scripts/deploy.js');
      console.log('   2. Add PRIVATE_KEY to .env');
      console.log('   3. Run this script again');
    }
    
  } catch (error) {
    console.error('\n❌ Error interacting with contract:', error.message);
    console.log('\n💡 Make sure:');
    console.log('   1. Contract is deployed (run: npx hardhat run scripts/deploy.js)');
    console.log('   2. Blockchain is running (npx hardhat node)');
    console.log('   3. CONTRACT_ADDRESS is correct in this script');
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 DEMO COMPLETE');
  console.log('='.repeat(60));
  
  console.log('\n🔑 Key Outputs:');
  console.log(`   • On-chain hash: ${computeOnChainHash(encrypted)}`);
  console.log(`   • IPFS CID: ${cid}`);
  console.log(`   • Encryption key: ${key.substring(0, 8)}...`);
  
  console.log('\n📝 Next Steps:');
  console.log('   1. Deploy to testnet: npx hardhat run scripts/deploy.js --network sepolia');
  console.log('   2. Build frontend: Create React/Vue app with Web3.js');
  console.log('   3. Integrate real IPFS: Use Pinata or Infura API');
  console.log('   4. Add proper key management: Student wallet integration');
}

// Run the demo
runDemo().catch(console.error);

