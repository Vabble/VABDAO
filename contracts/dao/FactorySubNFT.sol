// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IOwnablee.sol";
import "./VabbleNFT.sol";

contract FactorySubNFT is IERC721Receiver, ReentrancyGuard {

    event SubscriptionERC721Created(address nftCreator, address nftContract, uint256 deployTime);
    event SubscriptionERC721Minted(address receiver, uint256 subscriptionPeriod, uint256 indexed tokenId, uint256 mintTime);   
    event SubscriptionNFTLocked(uint256 indexed tokenId, uint256 lockPeriod, address owner, uint256 lockTime);    
    event SubscriptionNFTUnLocked(uint256 indexed tokenId, address owner, uint256 unlockTime);

    struct Mint {
        uint256 maxMintAmount;    // mint amount(ex: 10000 nft)
        uint256 mintPrice;        // ex: 1 usdc = 1*1e6
        uint256 lockPeriod;       // ex: 15 days
    }

    struct Lock {
        uint256 subscriptionPeriod;
        uint256 lockPeriod;
        uint256 lockTime;
        uint256 category;
        address minter;
    }
    
    string public baseUri;                     // Base URI    
    string public collectionUri;               // Collection URI   

    mapping(uint256 => Mint) private mintInfo;              // (category => AdminMint)
    mapping(uint256 => Lock) private lockInfo;        // (tokenId => SubLock)
    mapping(address => uint256[]) public subNFTTokenList;   // (user => minted tokenId list)
    // TODO - N2-2 updated(remove userNFTContractList)
    uint256[] public categoryList;
    VabbleNFT private subNFTContract;

    address public subNFTAddress;
    address private immutable OWNABLE;         // Ownablee contract address
    address private immutable UNI_HELPER;      // UniHelper contract address

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    receive() external payable {}
    constructor(
        address _ownable,        
        address _uniHelper
    ) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable; 
        require(_uniHelper != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelper;   
    }

    /// @notice Set baseURI by Auditor.
    function setBaseURI(
        string memory _baseUri,        
        string memory _collectionUri
    ) external onlyAuditor {
        bytes memory baseUriByte = bytes(_baseUri);
        require(baseUriByte.length > 0, "empty baseUri");

        bytes memory collectionUriByte = bytes(_collectionUri);
        require(collectionUriByte.length > 0, "empty collectionUri");

        baseUri = _baseUri;
        collectionUri = _collectionUri;
    }

    /// @notice Set subscription nft mint information by Auditor.
    function setMintInfo(
        uint256 _mintAmount, 
        uint256 _mintPrice, 
        uint256 _lockPeriod, 
        uint256 _category
    ) external onlyAuditor {
        require(_mintAmount > 0, "setAdminMint: zero mint amount");
        require(_category > 0, "setAdminMint: zero category");
        
        Mint storage amInfo = mintInfo[_category];
        // TODO - N3 updated(add condition)
        if(amInfo.maxMintAmount == 0) {
            categoryList.push(_category);
        }

        amInfo.maxMintAmount = _mintAmount;
        amInfo.mintPrice = _mintPrice;
        amInfo.lockPeriod = _lockPeriod;
    }

    /// @notice Audio deploy a nft contract for subscription
    function deploySubNFTContract(
        string memory _name,
        string memory _symbol
    ) external onlyAuditor nonReentrant {   

        subNFTContract = new VabbleNFT(baseUri, collectionUri, _name, _symbol, address(this));

        subNFTAddress = address(subNFTContract);

        emit SubscriptionERC721Created(msg.sender, subNFTAddress, block.timestamp);
    }

    // TODO - PVE001 updated(private)
    /// @notice User mint the subscription NFTs to "_to" address
    function __mint(
        address _token, 
        address _to,
        uint256 _subPeriod, 
        uint256 _category
    ) private {
        if(_token != IOwnablee(OWNABLE).PAYOUT_TOKEN() && _token != address(0)) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "mint: not allowed asset"); 
        }
        require(subNFTAddress != address(0), "mint: not deploy yet");        
        require(mintInfo[_category].maxMintAmount > 0, "mint: no admin mint info");
        require(mintInfo[_category].maxMintAmount > getTotalSupply(), "mint: exceed max mint amount");   

        uint256 nftLockPeriod = mintInfo[_category].lockPeriod;
        address receiver = _to;
        if(nftLockPeriod > 0) receiver = address(this);

        uint256 tokenId = subNFTContract.mintTo(receiver);

        Lock storage sInfo = lockInfo[tokenId];
        sInfo.subscriptionPeriod = _subPeriod;
        sInfo.lockPeriod = nftLockPeriod;
        sInfo.minter = msg.sender;
        sInfo.category = _category;
        if(nftLockPeriod > 0) sInfo.lockTime = block.timestamp;

        subNFTTokenList[receiver].push(tokenId);
        
        emit SubscriptionERC721Minted(receiver, _subPeriod, tokenId, block.timestamp);    
    }
    // TODO - PVE003 updated(payable)
    function mintToBatch(
        address _token, 
        address[] calldata _toList, 
        uint256[] calldata _periodList, 
        uint256[] calldata _categoryList
    ) external payable nonReentrant {
        require(_toList.length > 0, "batchMint: zero item length");
        require(_toList.length == _periodList.length, "batchMint: bad item-1 length");
        require(_toList.length == _categoryList.length, "batchMint: bad item-2 length");

        __handleMintPay(_token, _periodList, _categoryList);     

        for(uint256 i = 0; i < _toList.length; ++i) {
            __mint(_token, _toList[i], _periodList[i], _categoryList[i]);
        }
    }

    function __handleMintPay(
        address _payToken, 
        uint256[] calldata _periodList, 
        uint256[] calldata _categoryList
    ) private {
        uint256 expectAmount;        
        for(uint256 i = 0; i < _periodList.length; ++i) {
            uint256 price = mintInfo[_categoryList[i]].mintPrice;
            expectAmount += getExpectedTokenAmount(_payToken, _periodList[i] * price);
        }

        // Return remain ETH to user back if case of ETH and Transfer Asset from buyer to this contract
        if(_payToken == address(0)) {
            require(msg.value >= expectAmount, "handlePay: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
            // Send ETH from this contract to UNI_HELPER contract
            Helper.safeTransferETH(UNI_HELPER, expectAmount);
        } else {
            Helper.safeTransferFrom(_payToken, msg.sender, address(this), expectAmount);
            if(IERC20(_payToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_payToken, UNI_HELPER, IERC20(_payToken).totalSupply());
            }
        } 

        uint256 usdcAmount;
        address usdcToken = IOwnablee(OWNABLE).USDC_TOKEN();                
        if(_payToken == usdcToken) {
            usdcAmount = expectAmount;
        } else {
            bytes memory swapArgs = abi.encode(expectAmount, _payToken, usdcToken);
            usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);                
        }
        
        // Transfer USDC to wallet
        if(usdcAmount > 0) Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
    }

    /// @notice Lock subscription NFT for some period (transfer nft from owner wallet to this contract)
    function lockNFT(uint256 _tokenId) external nonReentrant {
        require(msg.sender == subNFTContract.ownerOf(_tokenId), "lock: not token owner"); 
        require(msg.sender == lockInfo[_tokenId].minter, "lock: not token minter"); 
        
        subNFTContract.transferNFT(_tokenId, address(this));

        uint256 categoryNum = lockInfo[_tokenId].category;
        uint256 nftLockPeriod = mintInfo[categoryNum].lockPeriod;
        lockInfo[_tokenId].lockPeriod = nftLockPeriod;
        lockInfo[_tokenId].lockTime = block.timestamp;

        emit SubscriptionNFTLocked(_tokenId, nftLockPeriod, msg.sender, block.timestamp);
    }

    /// @notice unlock subscription NFT (transfer nft from this contract to owner wallet)
    function unlockNFT(uint256 _tokenId) external nonReentrant {
        require(address(this) == subNFTContract.ownerOf(_tokenId), "unlock: not token owner"); 
        require(msg.sender == lockInfo[_tokenId].minter, "unlock: not token minter"); 

        Lock memory sInfo = lockInfo[_tokenId];
        require(block.timestamp > sInfo.lockPeriod + sInfo.lockTime, "unlock: locked yet");

        subNFTContract.transferNFT(_tokenId, msg.sender);

        lockInfo[_tokenId].lockPeriod = 0;
        lockInfo[_tokenId].lockTime = 0;

        emit SubscriptionNFTUnLocked(_tokenId, msg.sender, block.timestamp);
    }
    
    function getExpectedTokenAmount(
        address _token, 
        uint256 _usdcAmount
    ) public view returns (uint256 amount_) {
        amount_ = _usdcAmount;
        if(_token != IOwnablee(OWNABLE).USDC_TOKEN()) {
            amount_ = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IOwnablee(OWNABLE).USDC_TOKEN(), _token); 
        }
    }

    function getNFTOwner(uint256 _tokenId) external view returns (address owner_) {
        require(_tokenId > 0, "get: zero token id"); 
        owner_ = subNFTContract.ownerOf(_tokenId);
    }
    
    function getTotalSupply() public view returns (uint256) {
        return subNFTContract.totalSupply();
    }

    function getUserTokenIdList(address _owner) external view returns (uint256[] memory tokenIds_) {
        require(_owner != address(0), "get: zero owner"); 
        tokenIds_ = subNFTContract.userTokenIdList(_owner);
    }

    function getTokenUri(uint256 _tokenId) external view returns (string memory tokeUri_) {
        require(_tokenId > 0, "get: zero token id"); 
        tokeUri_ = subNFTContract.tokenURI(_tokenId);
    }
    
    /// @notice Get mint information per category
    function getMintInfo(uint256 _category) external view 
    returns (
        uint256 mintAmount_, 
        uint256 mintPrice_, 
        uint256 lockPeriod_
    ) {
        require(_category > 0, "get: zero category"); 
        Mint memory info = mintInfo[_category];
        mintAmount_ = info.maxMintAmount;
        mintPrice_ = info.mintPrice;
        lockPeriod_ = info.lockPeriod;
    } 

    /// @notice Get lock information per tokenId
    function getLockInfo(uint256 _tokenId) external view 
    returns (
        uint256 subPeriod_,
        uint256 lockPeriod_,
        uint256 lockTime_,
        uint256 category_,
        address minter_
    ) {
        require(_tokenId > 0, "get: zero tokenId"); 

        Lock memory sInfo = lockInfo[_tokenId];
        subPeriod_ = sInfo.subscriptionPeriod;
        lockPeriod_ = sInfo.lockPeriod;
        lockTime_ = sInfo.lockTime;
        category_ = sInfo.category;
        minter_ = sInfo.minter;
    } 

    /// @notice Needed to mint to this contract the NFT
    function onERC721Received(
        address,
        address,
        uint256,
        bytes calldata
    ) external pure override returns (bytes4) {
        return IERC721Receiver.onERC721Received.selector;
    }
}