// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StudentIdentity
 * @dev Smart contract for managing student identity and wallet associations
 * on the blockchain. Part of the hybrid blockchain architecture for academic records.
 * 
 * Features:
 * - Students can register their Ethereum wallet
 * - Link wallet to off-chain encrypted student ID
 * - Students can authorize/revoke verification access
 * - Privacy-preserving design (no PII on-chain)
 */
contract StudentIdentity {
    
    // Struct to store student identity information
    struct Student {
        address walletAddress;     // Student's Ethereum wallet
        bytes32 identityHash;     // Hash of encrypted off-chain identity data
        uint256 registrationTime; // When the student registered
        bool isRegistered;        // Registration status
        bool isActive;            // Active status (can be deactivated)
    }

    // Mapping from wallet address to Student struct
    mapping(address => Student) public students;

    // Mapping from student ID hash to wallet address (for lookups)
    mapping(bytes32 => address) public identityToWallet;

    // Mapping to track authorized verifiers per student
    mapping(address => mapping(address => bool)) public authorizedVerifiers;

    // Event declarations
    event StudentRegistered(address indexed wallet, bytes32 identityHash, uint256 timestamp);
    event StudentDeactivated(address indexed wallet, uint256 timestamp);
    event StudentReactivated(address indexed wallet, uint256 timestamp);
    event VerifierAuthorized(address indexed student, address indexed verifier);
    event VerifierRevoked(address indexed student, address indexed verifier);
    event IdentityUpdated(address indexed wallet, bytes32 newIdentityHash);

    // Modifier to check if student is registered
    modifier onlyRegistered() {
        require(students[msg.sender].isRegistered, "Student not registered");
        require(students[msg.sender].isActive, "Student account is inactive");
        _;
    }

    /**
     * @dev Register a new student with their wallet
     * @param _identityHash SHA-256 hash of encrypted off-chain student ID data
     */
    function register(bytes32 _identityHash) external {
        require(_identityHash != bytes32(0), "Invalid identity hash");
        require(!students[msg.sender].isRegistered, "Already registered");
        
        // Check if identity hash is already used
        if (identityToWallet[_identityHash] != address(0)) {
            revert("Identity hash already registered");
        }

        students[msg.sender] = Student({
            walletAddress: msg.sender,
            identityHash: _identityHash,
            registrationTime: block.timestamp,
            isRegistered: true,
            isActive: true
        });

        identityToWallet[_identityHash] = msg.sender;

        emit StudentRegistered(msg.sender, _identityHash, block.timestamp);
    }

    /**
     * @dev Update the identity hash (for updating off-chain data)
     * @param _newIdentityHash New hash of encrypted off-chain student ID data
     */
    function updateIdentity(bytes32 _newIdentityHash) external onlyRegistered {
        require(_newIdentityHash != bytes32(0), "Invalid identity hash");
        
        // Clear old identity mapping
        identityToWallet[students[msg.sender].identityHash] = address(0);
        
        // Update to new identity
        students[msg.sender].identityHash = _newIdentityHash;
        identityToWallet[_newIdentityHash] = msg.sender;

        emit IdentityUpdated(msg.sender, _newIdentityHash);
    }

    /**
     * @dev Deactivate student account (student controls can be revoked)
     */
    function deactivate() external onlyRegistered {
        students[msg.sender].isActive = false;
        emit StudentDeactivated(msg.sender, block.timestamp);
    }

    /**
     * @dev Reactivate student account
     */
    function reactivate() external onlyRegistered {
        require(!students[msg.sender].isActive, "Already active");
        students[msg.sender].isActive = true;
        emit StudentReactivated(msg.sender, block.timestamp);
    }

    /**
     * @dev Authorize a verifier to access student's records
     * @param _verifier Address of the authorized verifier
     */
    function authorizeVerifier(address _verifier) external onlyRegistered {
        require(_verifier != address(0), "Invalid verifier address");
        require(_verifier != msg.sender, "Cannot verify self");
        authorizedVerifiers[msg.sender][_verifier] = true;
        emit VerifierAuthorized(msg.sender, _verifier);
    }

    /**
     * @dev Revoke a verifier's access
     * @param _verifier Address of the verifier to revoke
     */
    function revokeVerifier(address _verifier) external onlyRegistered {
        require(authorizedVerifiers[msg.sender][_verifier], "Verifier not authorized");
        authorizedVerifiers[msg.sender][_verifier] = false;
        emit VerifierRevoked(msg.sender, _verifier);
    }

    /**
     * @dev Check if a verifier is authorized for a student
     * @param _student Student wallet address
     * @param _verifier Verifier wallet address
     * @return bool Whether the verifier is authorized
     */
    function isVerifierAuthorized(address _student, address _verifier) 
        external 
        view 
        returns (bool) 
    {
        return authorizedVerifiers[_student][_verifier];
    }

    /**
     * @dev Get student information
     * @param _wallet Student wallet address
     * @return identityHash Hash of encrypted identity
     * @return registrationTime When student registered
     * @return isActive Whether student is active
     */
    function getStudentInfo(address _wallet) 
        external 
        view 
        returns (
            bytes32 identityHash,
            uint256 registrationTime,
            bool isActive
        ) 
    {
        Student memory student = students[_wallet];
        require(student.isRegistered, "Student not registered");
        return (student.identityHash, student.registrationTime, student.isActive);
    }

    /**
     * @dev Check if a wallet is registered
     * @param _wallet Wallet address to check
     * @return bool Whether the wallet is registered
     */
    function isRegistered(address _wallet) external view returns (bool) {
        return students[_wallet].isRegistered && students[_wallet].isActive;
    }

    /**
     * @dev Get wallet by identity hash
     * @param _identityHash Identity hash to look up
     * @return address Associated wallet address
     */
    function getWalletByIdentity(bytes32 _identityHash) external view returns (address) {
        return identityToWallet[_identityHash];
    }

    /**
     * @dev Batch authorize multiple verifiers
     * @param _verifiers Array of verifier addresses
     */
    function batchAuthorizeVerifiers(address[] calldata _verifiers) external onlyRegistered {
        for (uint i = 0; i < _verifiers.length; i++) {
            if (_verifiers[i] != address(0) && _verifiers[i] != msg.sender) {
                authorizedVerifiers[msg.sender][_verifiers[i]] = true;
                emit VerifierAuthorized(msg.sender, _verifiers[i]);
            }
        }
    }

    /**
     * @dev Batch revoke multiple verifiers
     * @param _verifiers Array of verifier addresses
     */
    function batchRevokeVerifiers(address[] calldata _verifiers) external onlyRegistered {
        for (uint i = 0; i < _verifiers.length; i++) {
            if (authorizedVerifiers[msg.sender][_verifiers[i]]) {
                authorizedVerifiers[msg.sender][_verifiers[i]] = false;
                emit VerifierRevoked(msg.sender, _verifiers[i]);
            }
        }
    }
}

