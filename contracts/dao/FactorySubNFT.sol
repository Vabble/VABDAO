// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IOwnablee.sol";
import "../libraries/Helper.sol";
import "./VabbleNFT.sol";

/**
 * @title FactorySubNFT Contract
 * @dev A factory contract for managing subscription NFTs.
 *      Users can mint subscription NFTs, lock and unlock them based on predefined
 *      categories and parameters. Payment can be made in either ETH or allowed ERC20 tokens.
 *      This contract interfaces with Ownablee and UniHelper contracts for configuration
 *      and asset management.
 *
 */
contract FactorySubNFT is IERC721Receiver, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct containing minting parameters for each category of subscription NFTs.
     * @param maxMintAmount Maximum number of NFTs that can be minted in this category.
     * @param mintPrice Price in USDC (scaled by 1e6) to mint one NFT in this category.
     * @param lockPeriod Lock period in seconds after which the NFT can be unlocked.
     */
    struct Mint {
        uint256 maxMintAmount;
        uint256 mintPrice;
        uint256 lockPeriod;
    }

    /**
     * @dev Struct containing locking parameters for each subscription NFT.
     * @param subscriptionPeriod Subscription period associated with the NFT.
     * @param lockPeriod Lock period in seconds for this NFT.
     * @param lockTime Timestamp when the NFT was locked.
     * @param category Category of the NFT.
     * @param minter Address of the user who minted the NFT.
     */
    struct Lock {
        uint256 subscriptionPeriod;
        uint256 lockPeriod;
        uint256 lockTime;
        uint256 category;
        address minter;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @notice Address of the Ownable contract
    address private immutable OWNABLE;

    /// @notice Address of the UniHelper contract
    address private immutable UNI_HELPER;

    /// @notice Address of the deployed subscription NFT contract
    address public subNFTAddress;

    /// @notice Instance of the VabbleNFT contract used for subscription NFTs
    VabbleNFT private subNFTContract;

    /// @notice Base URI for the subscription NFTs
    string public baseUri;

    /// @notice Collection URI for the subscription NFTs
    string public collectionUri;

    /**
     * @notice Mapping of category IDs to minting information
     * @dev Maps each category ID to its corresponding minting information
     */
    mapping(uint256 => Mint) private mintInfo;

    /**
     * @notice Mapping of token IDs to locking information
     * @dev Maps each token ID to its corresponding locking information
     */
    mapping(uint256 => Lock) private lockInfo;

    /**
     * @notice Mapping of user addresses to lists of minted token IDs
     * @dev Maps each user address to a list of token IDs they have minted
     */
    mapping(address => uint256[]) public subNFTTokenList;

    /// @notice List of all category IDs with configured minting information
    uint256[] public categoryList;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Emitted when a new subscription ERC721 NFT contract is deployed.
     * @param nftCreator The address of the creator of the ERC721 contract
     * @param nftContract The address of the deployed ERC721 contract
     */
    event SubscriptionERC721Created(address indexed nftCreator, address nftContract);

    /**
     * @notice Emitted when a new subscription NFT is minted.
     * @param receiver The address that received the minted NFT
     * @param subscriptionPeriod The subscription period associated with the minted NFT
     * @param tokenId The ID of the minted NFT
     */
    event SubscriptionERC721Minted(address receiver, uint256 subscriptionPeriod, uint256 indexed tokenId);

    /**
     * @notice Emitted when a subscription NFT is locked.
     * @param tokenId The ID of the locked NFT
     * @param lockPeriod The lock period associated with the NFT
     * @param owner The current owner of the NFT
     */
    event SubscriptionNFTLocked(uint256 indexed tokenId, uint256 lockPeriod, address owner);

    /**
     * @notice Emitted when a subscription NFT is unlocked.
     * @param tokenId The ID of the unlocked NFT
     * @param owner The owner who unlocked the NFT
     */
    event SubscriptionNFTUnLocked(uint256 indexed tokenId, address owner);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the current Auditor.
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize the contract with addresses of the Ownablee and UniHelper contracts.
     * @param _ownable Address of the Ownablee contract.
     * @param _uniHelper Address of the UniHelper contract.
     */
    constructor(address _ownable, address _uniHelper) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;
        require(_uniHelper != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelper;
    }

    receive() external payable { }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Set baseURI and collectionURI for the subscription NFTs.
     * Can only be called by the auditor.
     * @param _baseUri Base URI for the NFT metadata.
     * @param _collectionUri Collection URI for the NFT metadata.
     */
    function setBaseURI(string memory _baseUri, string memory _collectionUri) external onlyAuditor {
        bytes memory baseUriByte = bytes(_baseUri);
        require(baseUriByte.length != 0, "empty baseUri");

        bytes memory collectionUriByte = bytes(_collectionUri);
        require(collectionUriByte.length != 0, "empty collectionUri");

        baseUri = _baseUri;
        collectionUri = _collectionUri;
    }

    /**
     * @notice Set minting information for a specific category of subscription NFTs.
     * Can only be called by the auditor.
     * @param _mintAmount Maximum number of NFTs that can be minted in this category.
     * @param _mintPrice Price in USDC to mint one NFT in this category.
     * @param _lockPeriod Lock period in seconds after which the NFT can be unlocked.
     * @param _category Category ID for which to set the minting information.
     */
    function setMintInfo(
        uint256 _mintAmount,
        uint256 _mintPrice,
        uint256 _lockPeriod,
        uint256 _category
    )
        external
        onlyAuditor
    {
        require(_mintAmount != 0, "setAdminMint: zero mint amount");
        require(_category != 0, "setAdminMint: zero category");

        Mint storage amInfo = mintInfo[_category];
        // TODO - N3 updated(add condition)
        if (amInfo.maxMintAmount == 0) {
            categoryList.push(_category);
        }

        amInfo.maxMintAmount = _mintAmount;
        amInfo.mintPrice = _mintPrice;
        amInfo.lockPeriod = _lockPeriod;
    }

    /**
     * @notice Deploy a new subscription NFT contract.
     * Can only be called by the auditor.
     * @param _name Name of the new NFT contract.
     * @param _symbol Symbol of the new NFT contract.
     */
    function deploySubNFTContract(string memory _name, string memory _symbol) external onlyAuditor nonReentrant {
        subNFTContract = new VabbleNFT(baseUri, collectionUri, _name, _symbol, address(this));

        subNFTAddress = address(subNFTContract);

        emit SubscriptionERC721Created(msg.sender, subNFTAddress);
    }

    /**
     * @notice Mint multiple subscription NFTs to multiple addresses.
     * @param _token Address of the token used for payment.
     * @param _toList Array of recipient addresses to receive the NFTs.
     * @param _periodList Array of subscription periods for each NFT.
     * @param _categoryList Array of category IDs for each NFT.
     */
    function mintToBatch(
        address _token,
        address[] calldata _toList,
        uint256[] calldata _periodList,
        uint256[] calldata _categoryList
    )
        external
        payable
        nonReentrant
    {
        uint256 len = _toList.length;
        require(len != 0 && len < 1000, "batchMint: zero item length");
        require(len == _periodList.length, "batchMint: bad item-1 length");
        require(len == _categoryList.length, "batchMint: bad item-2 length");

        __handleMintPay(_token, _periodList, _categoryList);

        for (uint256 i = 0; i < len; ++i) {
            __mint(_token, _toList[i], _periodList[i], _categoryList[i]);
        }
    }

    /**
     * @notice Lock a subscription NFT for the specified period.
     * Only the owner of the NFT can lock it.
     * Transfers the NFT from the owner to this contract.
     * @param _tokenId ID of the subscription NFT to be locked.
     */
    function lockNFT(uint256 _tokenId) external nonReentrant {
        require(msg.sender == subNFTContract.ownerOf(_tokenId), "lock: not token owner");
        require(msg.sender == lockInfo[_tokenId].minter, "lock: not token minter");

        subNFTContract.transferNFT(_tokenId, address(this));

        uint256 categoryNum = lockInfo[_tokenId].category;
        uint256 nftLockPeriod = mintInfo[categoryNum].lockPeriod;
        lockInfo[_tokenId].lockPeriod = nftLockPeriod;
        lockInfo[_tokenId].lockTime = block.timestamp;

        emit SubscriptionNFTLocked(_tokenId, nftLockPeriod, msg.sender);
    }

    /**
     * @notice Unlock a subscription NFT and transfer it from this contract to the owner's wallet.
     * @dev Requires that the caller is the minter of the NFT and that the lock period has expired.
     * @param _tokenId The ID of the subscription NFT to unlock
     */
    function unlockNFT(uint256 _tokenId) external nonReentrant {
        require(address(this) == subNFTContract.ownerOf(_tokenId), "unlock: not token owner");
        require(msg.sender == lockInfo[_tokenId].minter, "unlock: not token minter");

        Lock memory sInfo = lockInfo[_tokenId];
        require(block.timestamp > sInfo.lockPeriod + sInfo.lockTime, "unlock: locked yet");

        subNFTContract.transferNFT(_tokenId, msg.sender);

        lockInfo[_tokenId].lockPeriod = 0;
        lockInfo[_tokenId].lockTime = 0;

        emit SubscriptionNFTUnLocked(_tokenId, msg.sender);
    }

    /**
     * @notice Get lock information for a specific subscription NFT.
     * @param _tokenId The ID of the subscription NFT to query
     * @return subPeriod_ The subscription period associated with the NFT
     * @return lockPeriod_ The lock period associated with the NFT
     * @return lockTime_ The timestamp when the NFT was locked
     * @return category_ The category of the NFT
     * @return minter_ The address of the minter of the NFT
     */
    function getLockInfo(uint256 _tokenId)
        external
        view
        returns (uint256 subPeriod_, uint256 lockPeriod_, uint256 lockTime_, uint256 category_, address minter_)
    {
        require(_tokenId != 0, "get: zero tokenId");

        Lock memory sInfo = lockInfo[_tokenId];
        subPeriod_ = sInfo.subscriptionPeriod;
        lockPeriod_ = sInfo.lockPeriod;
        lockTime_ = sInfo.lockTime;
        category_ = sInfo.category;
        minter_ = sInfo.minter;
    }

    /**
     * @notice Get the owner of a specific subscription NFT.
     * @param _tokenId The ID of the subscription NFT to query
     * @return owner_ The address of the current owner of the NFT
     */
    function getNFTOwner(uint256 _tokenId) external view returns (address owner_) {
        require(_tokenId != 0, "get: zero token id");
        owner_ = subNFTContract.ownerOf(_tokenId);
    }

    /**
     * @notice Get the list of token IDs minted by a specific user.
     * @param _owner The address of the user to query
     * @return tokenIds_ An array of token IDs minted by the user
     */
    function getUserTokenIdList(address _owner) external view returns (uint256[] memory tokenIds_) {
        require(_owner != address(0), "get: zero owner");
        tokenIds_ = subNFTContract.userTokenIdList(_owner);
    }

    /**
     * @notice Get the URI of a specific subscription NFT.
     * @param _tokenId The ID of the subscription NFT to query
     * @return tokeUri_ The URI of the NFT's metadata
     */
    function getTokenUri(uint256 _tokenId) external view returns (string memory tokeUri_) {
        require(_tokenId != 0, "get: zero token id");
        tokeUri_ = subNFTContract.tokenURI(_tokenId);
    }

    /**
     * @notice Get mint information for a specific category.
     * @param _category The category ID to query
     * @return mintAmount_ The maximum mint amount allowed for the category
     * @return mintPrice_ The mint price for the category
     * @return lockPeriod_ The lock period associated with the category
     */
    function getMintInfo(uint256 _category)
        external
        view
        returns (uint256 mintAmount_, uint256 mintPrice_, uint256 lockPeriod_)
    {
        require(_category != 0, "get: zero category");
        Mint memory info = mintInfo[_category];
        mintAmount_ = info.maxMintAmount;
        mintPrice_ = info.mintPrice;
        lockPeriod_ = info.lockPeriod;
    }

    /// @inheritdoc IERC721Receiver
    function onERC721Received(address, address, uint256, bytes calldata) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get the expected amount of tokens needed for minting based on the provided payment token and amount.
     * @param _token The address of the payment token
     * @param _usdcAmount The amount in USDC equivalent to calculate against
     * @return amount_ The expected amount of tokens required for minting
     */
    function getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 amount_) {
        amount_ = _usdcAmount;
        if (_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            amount_ = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _token);
        }
    }

    /**
     * @notice Get the total supply of subscription NFTs.
     * @return The total supply of subscription NFTs
     */
    function getTotalSupply() public view returns (uint256) {
        return subNFTContract.totalSupply();
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Function to mint subscription NFTs to a specified address.
     * @dev Allows minting with optional lock period based on the category of NFT.
     * @param _token The address of the payment token for minting
     * @param _to The address to mint the subscription NFTs to
     * @param _subPeriod The subscription period associated with the minted NFTs
     * @param _category The category of the subscription NFTs to mint
     */
    function __mint(address _token, address _to, uint256 _subPeriod, uint256 _category) private {
        if (_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "mint: not allowed asset");
        }
        require(subNFTAddress != address(0), "mint: not deploy yet");
        require(mintInfo[_category].maxMintAmount != 0, "mint: no admin mint info");
        require(mintInfo[_category].maxMintAmount > getTotalSupply(), "mint: exceed max mint amount");

        uint256 nftLockPeriod = mintInfo[_category].lockPeriod;
        address receiver = _to;
        if (nftLockPeriod != 0) receiver = address(this);

        uint256 tokenId = subNFTContract.mintTo(receiver);

        Lock storage sInfo = lockInfo[tokenId];
        sInfo.subscriptionPeriod = _subPeriod;
        sInfo.lockPeriod = nftLockPeriod;
        sInfo.minter = msg.sender;
        sInfo.category = _category;
        if (nftLockPeriod != 0) sInfo.lockTime = block.timestamp;

        subNFTTokenList[receiver].push(tokenId);

        emit SubscriptionERC721Minted(receiver, _subPeriod, tokenId);
    }

    /**
     * @notice Function to handle payment and minting process.
     * @dev Handles payment in either ETH or ERC20 tokens, calculates expected amount,
     * swaps assets if necessary, and transfers USDC to the `Ownablee::VAB_WALLET`.
     * @param _payToken The address of the payment token
     * @param _periodList An array of subscription periods for minting
     * @param _categoryList An array of categories for minting
     */
    function __handleMintPay(
        address _payToken,
        uint256[] calldata _periodList,
        uint256[] calldata _categoryList
    )
        private
    {
        uint256 expectAmount;
        uint256 len = _periodList.length;
        require(len < 1000, "bad array");

        for (uint256 i = 0; i < len; ++i) {
            uint256 price = mintInfo[_categoryList[i]].mintPrice;
            expectAmount += getExpectedTokenAmount(_payToken, _periodList[i] * price);
        }

        // Return remain ETH to user back if case of ETH and Transfer Asset from buyer to this contract
        if (_payToken == address(0)) {
            require(msg.value >= expectAmount, "handlePay: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
            // Send ETH from this contract to UNI_HELPER contract
            Helper.safeTransferETH(UNI_HELPER, expectAmount);
        } else {
            Helper.safeTransferFrom(_payToken, msg.sender, address(this), expectAmount);
            if (IERC20(_payToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_payToken, UNI_HELPER, IERC20(_payToken).totalSupply());
            }
        }

        uint256 usdcAmount;
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();
        if (_payToken == usdcToken) {
            usdcAmount = expectAmount;
        } else {
            bytes memory swapArgs = abi.encode(expectAmount, _payToken, usdcToken);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);
        }

        // Transfer USDC to wallet
        if (usdcAmount != 0) Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
    }
}
