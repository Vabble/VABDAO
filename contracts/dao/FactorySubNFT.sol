// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "./VabbleNFT.sol";

contract FactorySubNFT is IERC721Receiver, ReentrancyGuard {

    event SubscriptionERC721Created(address nftCreator, address nftContract);
    event SubscriptionERC721Minted(address receiver, uint256 subscriptionPeriod, uint256 tokenId);   
    event SubscriptionNFTLocked(uint256 tokenId, uint256 lockPeriod, address owner);    
    event SubscriptionNFTUnLocked(uint256 tokenId, address owner);

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

    mapping(uint256 => Mint) private mintInfo;              // (category => AdminMint)
    mapping(uint256 => Lock) private lockInfo;        // (tokenId => SubLock)
    mapping(address => uint256[]) public subNFTTokenList;   // (user => minted tokenId list)
    mapping(address => address[]) public userNFTContractList; //
    
    uint256[] public categoryList;
    VabbleNFT private subNFTContract;
    address public subNFTAddress;

    address private OWNABLE;         // Ownablee contract address
    address private UNI_HELPER;      // UniHelper contract address
    address private DAO_PROPERTY;    // Property contract address

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    receive() external payable {}
    constructor(address _ownableContract) {
        require(_ownableContract != address(0), "ownableContract: Zero address");
        OWNABLE = _ownableContract; 
    }

    function initializeFactory(
        address _uniHelperContract,
        address _daoProperty
    ) external onlyAuditor {  
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;   
        require(_daoProperty != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _daoProperty; 
    } 

    /// @notice Set baseURI by Auditor.
    function setBaseURI(string memory _baseUri) external onlyAuditor {
        baseUri = _baseUri;
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
        amInfo.maxMintAmount = _mintAmount;
        amInfo.mintPrice = _mintPrice;
        amInfo.lockPeriod = _lockPeriod;

        categoryList.push(_category);
    }

    /// @notice Audio deploy a nft contract for subscription
    function deploySubNFTContract(
        string memory _name,
        string memory _symbol
    ) public onlyAuditor {   

        subNFTContract = new VabbleNFT(baseUri, _name, _symbol);

        subNFTAddress = address(subNFTContract);

        emit SubscriptionERC721Created(msg.sender, subNFTAddress);
    }

    /// @notice User mint the subscription NFTs to "_to" address
    function mint(
        address _token, 
        address _to,
        uint256 _subPeriod, 
        uint256 _category
    ) public payable nonReentrant {
        if(_token != IProperty(DAO_PROPERTY).PAYOUT_TOKEN()) {
            require(IOwnablee(OWNABLE).isDepositAsset(_token), "mint: not allowed asset"); 
        }
        require(subNFTAddress != address(0), "mint: not deploy yet");        
        require(mintInfo[_category].maxMintAmount > 0, "mint: no admin mint info");
        require(mintInfo[_category].maxMintAmount > getTotalSupply(), "mint: exceed max mint amount");

        __handleMintPay(_token, _subPeriod, _category);        

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
        
        emit SubscriptionERC721Minted(receiver, _subPeriod, tokenId);    
    }
    
    function mintToBatch(
        address _token, 
        address[] memory _toList, 
        uint256[] memory _periodList, 
        uint256[] memory _categoryList
    ) external {
        require(_toList.length > 0, "batchMint: zero item length");
        require(_toList.length == _periodList.length, "batchMint: bad item-1 length");
        require(_toList.length == _categoryList.length, "batchMint: bad item-2 length");

        for(uint256 i; i < _toList.length; i++) {
            mint(_token, _toList[i], _periodList[i], _categoryList[i]);
        }
    }

    function __handleMintPay(address _token, uint256 _period, uint256 _category) private {
        uint256 price = mintInfo[_category].mintPrice;
        uint256 expectAmount = getExpectedTokenAmount(_token, _period * price);
        __transferInto(_token, expectAmount);   

        // Send ETH from this contract to UNI_HELPER contract
        if(_token == address(0)) Helper.safeTransferETH(UNI_HELPER, expectAmount);

        address usdcToken = IProperty(DAO_PROPERTY).USDC_TOKEN();        
        bytes memory swapArgs = abi.encode(expectAmount, _token, usdcToken);
        uint256 usdcAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);                
        // Transfer USDC to wallet
        Helper.safeTransfer(usdcToken, IOwnablee(OWNABLE).VAB_WALLET(), usdcAmount);
    }

    function __transferInto(address _payToken, uint256 _amount) private {
        // Return remain ETH to user back if case of ETH and Transfer Asset from buyer to this contract
        if(_payToken == address(0)) {
            require(msg.value >= _amount, "handlePay: Insufficient paid");
            if (msg.value > _amount) {
                Helper.safeTransferETH(msg.sender, msg.value - _amount);
            }
        } else {
            Helper.safeTransferFrom(_payToken, msg.sender, address(this), _amount);
            if(IERC20(_payToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_payToken, UNI_HELPER, IERC20(_payToken).totalSupply());
            }
        }
    }

    /// @notice Lock subscription NFT for some period (transfer nft from owner wallet to this contract)
    function lockNFT(uint256 _tokenId) public nonReentrant {
        require(msg.sender == subNFTContract.ownerOf(_tokenId), "lock: not token owner"); 
        require(msg.sender == lockInfo[_tokenId].minter, "lock: not token minter"); 
        
        subNFTContract.transferNFT(_tokenId, address(this));

        uint256 categoryNum = lockInfo[_tokenId].category;
        uint256 nftLockPeriod = mintInfo[categoryNum].lockPeriod;
        lockInfo[_tokenId].lockPeriod = nftLockPeriod;
        lockInfo[_tokenId].lockTime = block.timestamp;

        emit SubscriptionNFTLocked(_tokenId, nftLockPeriod, msg.sender);
    }

    /// @notice unlock subscription NFT (transfer nft from this contract to owner wallet)
    function unlockNFT(uint256 _tokenId) public nonReentrant {
        require(address(this) == subNFTContract.ownerOf(_tokenId), "unlock: not token owner"); 
        require(msg.sender == lockInfo[_tokenId].minter, "unlock: not token minter"); 

        Lock storage sInfo = lockInfo[_tokenId];
        require(block.timestamp > sInfo.lockPeriod + sInfo.lockTime, "unlock: locked yet");

        subNFTContract.transferNFT(_tokenId, msg.sender);

        lockInfo[_tokenId].lockPeriod = 0;
        lockInfo[_tokenId].lockTime = 0;

        emit SubscriptionNFTUnLocked(_tokenId, msg.sender);
    }
    
    function getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 tokenAmount_) {
        tokenAmount_ = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IProperty(DAO_PROPERTY).USDC_TOKEN(), _token);
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