/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_RPC_URL: process.env.NEXT_PUBLIC_RPC_URL || 'http://127.0.0.1:8545',
    recordRegistry: process.env.NEXT_PUBLIC_RECORD_REGISTRY || '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512',
  studentIdentity: process.env.NEXT_PUBLIC_STUDENT_IDENTITY || '0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0',
  verificationLog: process.env.NEXT_PUBLIC_VERIFICATION_LOG || '0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9',
  institutionRegistry: process.env.NEXT_PUBLIC_INSTITUTION_REGISTRY || '0x5FbDB2315678afecb367f032d93F642f64180aa3',
  },
}

module.exports = nextConfig
