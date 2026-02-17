// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title InstitutionRegistry
 * @dev Smart contract for managing university/issuer registration and accreditation
 * on the blockchain. Part of the hybrid blockchain architecture for academic records.
 * 
 * Features:
 * - Universities can register with details
 * - Accreditation status management
 * - Multi-sig support for institutional wallets
 * - Public verification of institutional legitimacy
 */
contract InstitutionRegistry {
    
    // Struct to store institution information
    struct Institution {
        string name;                    // University/Institution name
        string domain;                  // Official domain (for verification)
        string accreditationId;         // Accreditation reference number
        uint256 registrationTime;       // When the institution registered
        bool isRegistered;              // Registration status
        bool isAccredited;             // Accreditation status
        address[] authorizedWallets;   // Wallets authorized to issue records
        string metadata;               // Additional institution info (JSON)
    }

    // Mapping from address to Institution struct
    mapping(address => Institution) public institutions;

    // Mapping from domain to institution address
    mapping(string => address) public domainToInstitution;

    // Mapping to track if domain is taken
    mapping(string => bool) public registeredDomains;

    // Array of all registered institution addresses
    address[] public registeredInstitutions;

    // Event declarations
    event InstitutionRegistered(
        address indexed institutionAddress,
        string name,
        string domain,
        uint256 timestamp
    );
    event InstitutionUpdated(
        address indexed institutionAddress,
        string name,
        uint256 timestamp
    );
    event AccreditationUpdated(
        address indexed institutionAddress,
        bool isAccredited,
        uint256 timestamp
    );
    event WalletAdded(
        address indexed institutionAddress,
        address indexed wallet,
        uint256 timestamp
    );
    event WalletRemoved(
        address indexed institutionAddress,
        address indexed wallet,
        uint256 timestamp
    );
    event InstitutionDeactivated(
        address indexed institutionAddress,
        uint256 timestamp
    );
    event InstitutionReactivated(
        address indexed institutionAddress,
        uint256 timestamp
    );

    // Modifier to check if institution is registered
    modifier onlyRegistered() {
        require(institutions[msg.sender].isRegistered, "Institution not registered");
        _;
    }

    /**
     * @dev Register a new institution
     * @param _name Institution name
     * @param _domain Official domain
     * @param _accreditationId Accreditation reference
     * @param _metadata Additional info (JSON string)
     */
    function registerInstitution(
        string calldata _name,
        string calldata _domain,
        string calldata _accreditationId,
        string calldata _metadata
    ) external {
        require(bytes(_name).length > 0, "Name required");
        require(bytes(_domain).length > 0, "Domain required");
        require(!institutions[msg.sender].isRegistered, "Already registered");
        require(!registeredDomains[_domain], "Domain already taken");

        Institution storage inst = institutions[msg.sender];
        inst.name = _name;
        inst.domain = _domain;
        inst.accreditationId = _accreditationId;
        inst.registrationTime = block.timestamp;
        inst.isRegistered = true;
        inst.isAccredited = false; // Requires separate accreditation process
        inst.metadata = _metadata;

        // Add deployer as first authorized wallet
        inst.authorizedWallets.push(msg.sender);

        registeredDomains[_domain] = true;
        domainToInstitution[_domain] = msg.sender;
        registeredInstitutions.push(msg.sender);

        emit InstitutionRegistered(msg.sender, _name, _domain, block.timestamp);
    }

    /**
     * @dev Update institution information
     * @param _name New name
     * @param _domain New domain
     * @param _metadata New metadata
     */
    function updateInstitution(
        string calldata _name,
        string calldata _domain,
        string calldata _metadata
    ) external onlyRegistered {
        require(bytes(_name).length > 0, "Name required");
        
        Institution storage inst = institutions[msg.sender];

        // Handle domain change
        if (keccak256(abi.encodePacked(inst.domain)) != keccak256(abi.encodePacked(_domain))) {
            require(!registeredDomains[_domain], "New domain already taken");
            
            // Free old domain
            registeredDomains[inst.domain] = false;
            domainToInstitution[inst.domain] = address(0);
            
            // Set new domain
            inst.domain = _domain;
            registeredDomains[_domain] = true;
            domainToInstitution[_domain] = msg.sender;
        }

        inst.name = _name;
        inst.metadata = _metadata;

        emit InstitutionUpdated(msg.sender, _name, block.timestamp);
    }

    /**
     * @dev Update accreditation status (could be called by accreditation authority)
     * @param _institutionAddress Institution to update
     * @param _isAccredited New accreditation status
     */
    function updateAccreditation(address _institutionAddress, bool _isAccredited) external {
        require(institutions[_institutionAddress].isRegistered, "Institution not registered");
        require(institutions[_institutionAddress].isRegistered, "Not a registered institution");
        
        // In production, this would have access control (only accreditation authority)
        institutions[_institutionAddress].isAccredited = _isAccredited;

        emit AccreditationUpdated(_institutionAddress, _isAccredited, block.timestamp);
    }

    /**
     * @dev Self-accreditation (for demo purposes - in production would require verification)
     * @param _accreditationId Accreditation ID to set
     */
    function selfAccredit(string calldata _accreditationId) external onlyRegistered {
        require(bytes(_accreditationId).length > 0, "Accreditation ID required");
        institutions[msg.sender].isAccredited = true;
        institutions[msg.sender].accreditationId = _accreditationId;

        emit AccreditationUpdated(msg.sender, true, block.timestamp);
    }

    /**
     * @dev Add an authorized wallet to the institution
     * @param _wallet Wallet address to add
     */
    function addAuthorizedWallet(address _wallet) external onlyRegistered {
        require(_wallet != address(0), "Invalid wallet address");
        
        Institution storage inst = institutions[msg.sender];
        
        // Check if wallet already authorized
        for (uint i = 0; i < inst.authorizedWallets.length; i++) {
            require(inst.authorizedWallets[i] != _wallet, "Wallet already authorized");
        }

        inst.authorizedWallets.push(_wallet);

        emit WalletAdded(msg.sender, _wallet, block.timestamp);
    }

    /**
     * @dev Remove an authorized wallet from the institution
     * @param _wallet Wallet address to remove
     */
    function removeAuthorizedWallet(address _wallet) external onlyRegistered {
        require(_wallet != msg.sender, "Cannot remove self");
        
        Institution storage inst = institutions[msg.sender];
        
        // Find and remove wallet
        bool found = false;
        for (uint i = 0; i < inst.authorizedWallets.length; i++) {
            if (inst.authorizedWallets[i] == _wallet) {
                // Swap with last element and pop
                inst.authorizedWallets[i] = inst.authorizedWallets[inst.authorizedWallets.length - 1];
                inst.authorizedWallets.pop();
                found = true;
                break;
            }
        }

        require(found, "Wallet not authorized");

        emit WalletRemoved(msg.sender, _wallet, block.timestamp);
    }

    /**
     * @dev Check if a wallet is authorized for an institution
     * @param _institution Institution address
     * @param _wallet Wallet address to check
     * @return bool Whether the wallet is authorized
     */
    function isWalletAuthorized(address _institution, address _wallet) 
        external 
        view 
        returns (bool) 
    {
        Institution storage inst = institutions[_institution];
        
        for (uint i = 0; i < inst.authorizedWallets.length; i++) {
            if (inst.authorizedWallets[i] == _wallet) {
                return true;
            }
        }
        return false;
    }

    /**
     * @dev Get institution information
     * @param _address Institution address
     * @return name Institution name
     * @return domain Institution domain
     * @return _isAccredited Accreditation status
     * @return authorizedWalletCount Number of authorized wallets
     */
    function getInstitutionInfo(address _address) 
        external 
        view 
        returns (
            string memory name,
            string memory domain,
            bool _isAccredited,
            uint256 authorizedWalletCount
        ) 
    {
        Institution memory inst = institutions[_address];
        require(inst.isRegistered, "Institution not registered");
        
        return (
            inst.name,
            inst.domain,
            inst.isAccredited,
            inst.authorizedWallets.length
        );
    }

    /**
     * @dev Get all authorized wallets for an institution
     * @param _address Institution address
     * @return address[] Array of authorized wallet addresses
     */
    function getAuthorizedWallets(address _address) 
        external 
        view 
        returns (address[] memory) 
    {
        require(institutions[_address].isRegistered, "Institution not registered");
        return institutions[_address].authorizedWallets;
    }

    /**
     * @dev Get institution by domain
     * @param _domain Domain to look up
     * @return address Institution address
     */
    function getInstitutionByDomain(string calldata _domain) 
        external 
        view 
        returns (address) 
    {
        return domainToInstitution[_domain];
    }

    /**
     * @dev Get total number of registered institutions
     * @return uint256 Count
     */
    function getInstitutionCount() external view returns (uint256) {
        return registeredInstitutions.length;
    }

    /**
     * @dev Get paginated list of institutions
     * @param _start Start index
     * @param _count Number to retrieve
     * @return address[] Array of institution addresses
     */
    function getInstitutions(uint256 _start, uint256 _count) 
        external 
        view 
        returns (address[] memory) 
    {
        require(_start < registeredInstitutions.length, "Start out of bounds");
        
        uint256 end = _start + _count;
        if (end > registeredInstitutions.length) {
            end = registeredInstitutions.length;
        }
        
        uint256 resultLength = end - _start;
        address[] memory result = new address[](resultLength);
        
        for (uint256 i = _start; i < end; i++) {
            result[i - _start] = registeredInstitutions[i];
        }
        
        return result;
    }

    /**
     * @dev Check if institution is registered
     * @param _address Address to check
     * @return bool Registration status
     */
    function isRegistered(address _address) external view returns (bool) {
        return institutions[_address].isRegistered;
    }

    /**
     * @dev Check if institution is accredited
     * @param _address Address to check
     * @return bool Accreditation status
     */
    function isAccredited(address _address) external view returns (bool) {
        return institutions[_address].isRegistered && institutions[_address].isAccredited;
    }
}
