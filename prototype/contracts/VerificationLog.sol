// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title VerificationLog
 * @dev Smart contract for logging and auditing verification requests
 * on the blockchain. Creates an immutable audit trail for compliance.
 * 
 * Features:
 * - Logs all verification requests with timestamp
 * - Tracks who verified which record and when
 * - Immutable audit trail for regulatory compliance
 * - Supports both successful and failed verifications
 */
contract VerificationLog {
    
    // Struct to store verification log entry
    struct VerificationEntry {
        bytes32 recordHash;        // Hash of the academic record
        address verifier;          // Who performed the verification
        address issuer;            // Who issued the record
        uint256 timestamp;        // When verification occurred
        bool result;               // Verification result (valid/invalid)
        string metadata;          // Additional verification metadata
    }

    // Array to store all verification logs
    VerificationEntry[] public verificationLogs;

    // Mapping to track verification count per record
    mapping(bytes32 => uint256[]) public recordVerificationIndices;

    // Mapping to track verifications by a specific verifier
    mapping(address => uint256[]) public verifierLogs;

    // Mapping to track if record has been verified at least once
    mapping(bytes32 => bool) public hasBeenVerified;

    // Event declarations
    event VerificationLogged(
        bytes32 indexed recordHash,
        address indexed verifier,
        address indexed issuer,
        uint256 timestamp,
        bool result
    );

    // Event for batch verification
    event BatchVerificationLogged(
        address indexed verifier,
        uint256 count,
        uint256 timestamp
    );

    // Counter for total verifications
    uint256 public totalVerifications;

    // Maximum logs per batch (to prevent gas limits)
    uint256 public constant MAX_BATCH_SIZE = 100;

    /**
     * @dev Log a verification attempt
     * @param _recordHash Hash of the academic record being verified
     * @param _issuer Address of the record issuer
     * @param _result Verification result (true = valid, false = invalid)
     * @param _metadata Additional metadata about the verification
     */
    function logVerification(
        bytes32 _recordHash,
        address _issuer,
        bool _result,
        string calldata _metadata
    ) external {
        require(_recordHash != bytes32(0), "Invalid record hash");
        require(_issuer != address(0), "Invalid issuer address");

        verificationLogs.push(VerificationEntry({
            recordHash: _recordHash,
            verifier: msg.sender,
            issuer: _issuer,
            timestamp: block.timestamp,
            result: _result,
            metadata: _metadata
        }));

        uint256 logIndex = verificationLogs.length - 1;
        
        recordVerificationIndices[_recordHash].push(logIndex);
        verifierLogs[msg.sender].push(logIndex);
        
        hasBeenVerified[_recordHash] = true;
        totalVerifications++;

        emit VerificationLogged(
            _recordHash,
            msg.sender,
            _issuer,
            block.timestamp,
            _result
        );
    }

    /**
     * @dev Log a verification without requiring issuer address
     * @param _recordHash Hash of the academic record being verified
     * @param _result Verification result
     * @param _metadata Additional metadata
     */
    function logSimpleVerification(
        bytes32 _recordHash,
        bool _result,
        string calldata _metadata
    ) external {
        require(_recordHash != bytes32(0), "Invalid record hash");

        verificationLogs.push(VerificationEntry({
            recordHash: _recordHash,
            verifier: msg.sender,
            issuer: address(0), // Will be updated if record exists
            timestamp: block.timestamp,
            result: _result,
            metadata: _metadata
        }));

        uint256 logIndex = verificationLogs.length - 1;
        
        recordVerificationIndices[_recordHash].push(logIndex);
        verifierLogs[msg.sender].push(logIndex);
        
        hasBeenVerified[_recordHash] = true;
        totalVerifications++;

        emit VerificationLogged(
            _recordHash,
            msg.sender,
            address(0),
            block.timestamp,
            _result
        );
    }

    /**
     * @dev Batch log multiple verifications (for efficiency)
     * @param _recordHashes Array of record hashes
     * @param _results Array of verification results
     * @param _metadataArray Array of metadata strings
     */
    function batchLogVerification(
        bytes32[] calldata _recordHashes,
        bool[] calldata _results,
        string[] calldata _metadataArray
    ) external {
        require(_recordHashes.length <= MAX_BATCH_SIZE, "Batch size too large");
        require(_recordHashes.length == _results.length, "Length mismatch");
        require(_recordHashes.length == _metadataArray.length, "Length mismatch");

        for (uint i = 0; i < _recordHashes.length; i++) {
            require(_recordHashes[i] != bytes32(0), "Invalid record hash");

            verificationLogs.push(VerificationEntry({
                recordHash: _recordHashes[i],
                verifier: msg.sender,
                issuer: address(0),
                timestamp: block.timestamp,
                result: _results[i],
                metadata: _metadataArray[i]
            }));

            uint256 logIndex = verificationLogs.length - 1;
            
            recordVerificationIndices[_recordHashes[i]].push(logIndex);
            verifierLogs[msg.sender].push(logIndex);
            
            hasBeenVerified[_recordHashes[i]] = true;
            totalVerifications++;

            emit VerificationLogged(
                _recordHashes[i],
                msg.sender,
                address(0),
                block.timestamp,
                _results[i]
            );
        }

        emit BatchVerificationLogged(msg.sender, _recordHashes.length, block.timestamp);
    }

    /**
     * @dev Get total number of verification logs
     * @return uint256 Total count
     */
    function getTotalLogs() external view returns (uint256) {
        return verificationLogs.length;
    }

    /**
     * @dev Get verification logs for a specific record
     * @param _recordHash Hash of the record
     * @return VerificationEntry[] Array of verification entries
     */
    function getRecordVerifications(bytes32 _recordHash) 
        external 
        view 
        returns (VerificationEntry[] memory) 
    {
        uint256[] memory indices = recordVerificationIndices[_recordHash];
        VerificationEntry[] memory result = new VerificationEntry[](indices.length);
        
        for (uint i = 0; i < indices.length; i++) {
            result[i] = verificationLogs[indices[i]];
        }
        
        return result;
    }

    /**
     * @dev Get verification count for a record
     * @param _recordHash Hash of the record
     * @return uint256 Number of verifications
     */
    function getRecordVerificationCount(bytes32 _recordHash) 
        external 
        view 
        returns (uint256) 
    {
        return recordVerificationIndices[_recordHash].length;
    }

    /**
     * @dev Get all verifications performed by a specific verifier
     * @param _verifier Verifier address
     * @return VerificationEntry[] Array of verification entries
     */
    function getVerifierLogs(address _verifier) 
        external 
        view 
        returns (VerificationEntry[] memory) 
    {
        uint256[] memory indices = verifierLogs[_verifier];
        VerificationEntry[] memory result = new VerificationEntry[](indices.length);
        
        for (uint i = 0; i < indices.length; i++) {
            result[i] = verificationLogs[indices[i]];
        }
        
        return result;
    }

    /**
     * @dev Get verification count for a verifier
     * @param _verifier Verifier address
     * @return uint256 Number of verifications
     */
    function getVerifierLogCount(address _verifier) 
        external 
        view 
        returns (uint256) 
    {
        return verifierLogs[_verifier].length;
    }

    /**
     * @dev Check if a record has been verified at least once
     * @param _recordHash Hash of the record
     * @return bool Whether the record has been verified
     */
    function recordVerified(bytes32 _recordHash) external view returns (bool) {
        return hasBeenVerified[_recordHash];
    }

    /**
     * @dev Get paginated verification logs (for efficient querying)
     * @param _start Start index
     * @param _count Number of logs to retrieve
     * @return VerificationEntry[] Array of verification entries
     */
    function getVerificationLogs(uint256 _start, uint256 _count) 
        external 
        view 
        returns (VerificationEntry[] memory) 
    {
        require(_start < verificationLogs.length, "Start index out of bounds");
        
        uint256 end = _start + _count;
        if (end > verificationLogs.length) {
            end = verificationLogs.length;
        }
        
        uint256 resultLength = end - _start;
        VerificationEntry[] memory result = new VerificationEntry[](resultLength);
        
        for (uint256 i = _start; i < end; i++) {
            result[i - _start] = verificationLogs[i];
        }
        
        return result;
    }

    /**
     * @dev Get recent verification logs (most recent first)
     * @param _count Number of logs to retrieve
     * @return VerificationEntry[] Array of recent verification entries
     */
    function getRecentVerifications(uint256 _count) 
        external 
        view 
        returns (VerificationEntry[] memory) 
    {
        if (_count > verificationLogs.length) {
            _count = verificationLogs.length;
        }
        
        VerificationEntry[] memory result = new VerificationEntry[](_count);
        uint256 startIndex = verificationLogs.length - _count;
        
        for (uint256 i = 0; i < _count; i++) {
            result[i] = verificationLogs[startIndex + i];
        }
        
        return result;
    }
}

