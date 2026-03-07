// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title RecordRegistry
 * @dev Smart contract for issuing, revoking, and verifying academic records
 * on a blockchain. This is the on-chain integrity layer of the hybrid blockchain
 * architecture for secure storage and verification of academic records.
 * 
 * Features:
 * - Only authorized issuers (universities) can issue records
 * - Institutions can be authorized via InstitutionRegistry
 * - Records are identified by their SHA-256 hash
 * - Revocation functionality for invalid/fraudulent records
 * - Timestamped issuance for audit trail
 * - Access control for authorization management
 */
contract RecordRegistry {
    
    // Struct to store record information
    struct Record {
        bytes32 recordHash;      // SHA-256 hash of the encrypted file
        address issuer;          // Address of the issuing university
        uint256 timestamp;       // When the record was issued
        bool isValid;            // Current validity status
        string metadata;        // Optional metadata (e.g., student ID, degree)
    }

    // Mapping from record hash to Record struct
    mapping(bytes32 => Record) public records;

    // Mapping to track authorized issuers (universities)
    mapping(address => bool) public authorizedIssuers;

    // Mapping to track issued records per issuer
    mapping(address => bytes32[]) public issuerRecords;

    // InstitutionRegistry contract address
    address public institutionRegistryAddress;

    // Event declarations for tracking actions on-chain
    event RecordIssued(bytes32 indexed recordHash, address indexed issuer, uint256 timestamp, string metadata);
    event RecordRevoked(bytes32 indexed recordHash, address indexed issuer, uint256 timestamp);
    event IssuerAuthorized(address indexed issuer);
    event IssuerRevoked(address indexed issuer);
    event InstitutionRegistrySet(address indexed registryAddress);

    // Modifier to restrict functions to authorized issuers only
    modifier onlyAuthorized() {
        require(_isAuthorized(msg.sender), "Caller is not an authorized issuer");
        _;
    }

    /**
     * @dev Internal function to check if an address is authorized
     * @param _address Address to check
     * @return bool Whether the address is authorized
     */
    function _isAuthorized(address _address) internal view returns (bool) {
        // Direct authorization (manual by owner)
        if (authorizedIssuers[_address]) {
            return true;
        }
        
        // Check via InstitutionRegistry if configured
        if (institutionRegistryAddress != address(0)) {
            // Use the helper function to check if wallet is authorized for ANY institution
            (bool success, bytes memory result) = institutionRegistryAddress.staticcall(
                abi.encodeWithSignature("isWalletAuthorizedForAny(address)", _address)
            );
            if (success && result.length > 0) {
                return abi.decode(result, (bool));
            }
        }
        
        return false;
    }

    /**
     * @dev Constructor - deployer becomes the first authorized issuer
     */
    constructor() {
        authorizedIssuers[msg.sender] = true;
        emit IssuerAuthorized(msg.sender);
    }

    /**
     * @dev Set the InstitutionRegistry contract address
     * @param _registryAddress Address of InstitutionRegistry contract
     */
    function setInstitutionRegistry(address _registryAddress) external onlyAuthorized {
        require(_registryAddress != address(0), "Invalid registry address");
        institutionRegistryAddress = _registryAddress;
        emit InstitutionRegistrySet(_registryAddress);
    }

    /**
     * @dev Check if an address is authorized (public view)
     * @param _address Address to check
     * @return bool Whether the address is authorized
     */
    function isAuthorized(address _address) external view returns (bool) {
        return _isAuthorized(_address);
    }

    /**
     * @dev Authorize a new university/issuer directly
     * @param _issuer address of the university to authorize
     */
    function authorizeIssuer(address _issuer) external onlyAuthorized {
        require(_issuer != address(0), "Invalid issuer address");
        require(!authorizedIssuers[_issuer], "Issuer already authorized");
        authorizedIssuers[_issuer] = true;
        emit IssuerAuthorized(_issuer);
    }

    /**
     * @dev Revoke authorization of an issuer
     * @param _issuer address of the issuer to revoke
     */
    function revokeIssuer(address _issuer) external onlyAuthorized {
        require(_issuer != msg.sender, "Cannot revoke yourself");
        require(authorizedIssuers[_issuer], "Issuer not authorized");
        authorizedIssuers[_issuer] = false;
        emit IssuerRevoked(_issuer);
    }

    /**
     * @dev Issue a new academic record
     * @param _recordHash SHA-256 hash of the encrypted academic record (from IPFS)
     * @param _metadata Optional metadata (student ID, degree type, etc.)
     */
    function issueRecord(bytes32 _recordHash, string calldata _metadata) 
        external 
        onlyAuthorized 
    {
        require(_recordHash != bytes32(0), "Invalid record hash");
        require(records[_recordHash].timestamp == 0, "Record already exists");

        // Create the record
        records[_recordHash] = Record({
            recordHash: _recordHash,
            issuer: msg.sender,
            timestamp: block.timestamp,
            isValid: true,
            metadata: _metadata
        });

        // Track the record for the issuer
        issuerRecords[msg.sender].push(_recordHash);

        emit RecordIssued(_recordHash, msg.sender, block.timestamp, _metadata);
    }

    /**
     * @dev Revoke an existing academic record
     * @param _recordHash Hash of the record to revoke
     */
    function revokeRecord(bytes32 _recordHash) external onlyAuthorized {
        require(records[_recordHash].issuer != address(0), "Record does not exist");
        require(records[_recordHash].isValid, "Record already revoked");
        
        // Only the original issuer can revoke their records
        require(records[_recordHash].issuer == msg.sender, "Only original issuer can revoke");

        records[_recordHash].isValid = false;
        
        emit RecordRevoked(_recordHash, msg.sender, block.timestamp);
    }

    /**
     * @dev Verify the status of an academic record
     * @param _recordHash Hash of the record to verify
     * @return isValid Whether the record is currently valid
     * @return issuer Address of the issuing university
     * @return timestamp When the record was issued
     */
    function getRecordStatus(bytes32 _recordHash) 
        external 
        view 
        returns (
            bool isValid, 
            address issuer, 
            uint256 timestamp,
            string memory metadata
        ) 
    {
        Record memory record = records[_recordHash];
        return (record.isValid, record.issuer, record.timestamp, record.metadata);
    }

    /**
     * @dev Check if a record exists in the registry
     * @param _recordHash Hash to check
     * @return bool Whether the record exists
     */
    function recordExists(bytes32 _recordHash) external view returns (bool) {
        return records[_recordHash].timestamp != 0;
    }

    /**
     * @dev Get the count of records issued by a specific issuer
     * @param _issuer Address of the issuer
     * @return uint256 Number of records issued
     */
    function getRecordCount(address _issuer) external view returns (uint256) {
        return issuerRecords[_issuer].length;
    }

    /**
     * @dev Get all records issued by a specific issuer (for auditing)
     * @param _issuer Address of the issuer
     * @return bytes32[] Array of record hashes
     */
    function getIssuerRecords(address _issuer) external view returns (bytes32[] memory) {
        return issuerRecords[_issuer];
    }
}

