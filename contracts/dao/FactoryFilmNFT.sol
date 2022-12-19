// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleDAO.sol";
import "./VabbleNFT.sol";
import "hardhat/console.sol";

contract FactoryFilmNFT is ReentrancyGuard {

    event ERC721Created(address nftCreator, address nftContract);
    event ERC721Minted(address nftContract, uint256 tokenId);    

    struct Mint {
        uint256 tier;             // Tier 1 (1000 NFT’s for 1 ETH), Tier 2 (5000 NFT’s for 0.5 ETH), Tier 3 (10000 NFT’s for 0.1 ETH)
        uint256 maxMintAmount;    // mint amount(ex: 10000 nft)
        uint256 price;            // mint price in usdc(ex: 5 usdc = 5*1e6)
        uint256 feePercent;       // it will be send to reward pool(2% max=10%)
        uint256 revenuePercent;   // studio define a % revenue for each NFT based on its tier
        address nft;
        address studio;
    }

    struct NFTInfo {
        string name;
        string symbol;
    }
    
    string public baseUri;                     // Base URI    

    mapping(uint256 => Mint) private mintInfo;              // (filmId => Mint)
    mapping(address => NFTInfo) private nftInfo;            // (nft address => NFTI)
    mapping(uint256 => uint256[]) private filmNFTTokenList; // (filmId => minted tokenId list)

    mapping(uint256 => address) public indexToContract;     //index to contract address mapping
    mapping(uint256 => address) public indexToCreator;      //index to ERC721 creator address
    mapping(address => address[]) public userNFTContractList; //
    
    VabbleNFT[] private filmNFTContractList;

    address private OWNABLE;         // Ownablee contract address
    address private STAKING_POOL;    // StakingPool contract address
    address private UNI_HELPER;      // UniHelper contract address
    address private DAO_PROPERTY;    // Property contract address
    address private VABBLE_DAO;      // VabbleDAO contract address
    address private SUBSCRIPTION;    // Subscription contract address 
    address private VAB_WALLET;      // Vabble wallet

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
        address _stakingContract,
        address _uniHelperContract,
        address _daoProperty,
        address _daoContract, 
        address _subscriptionContract,       
        address _vabbleWallet
    ) external onlyAuditor {         
        require(_stakingContract != address(0), "stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;   
        require(_daoProperty != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _daoProperty; 
        require(_daoContract != address(0), "daoContract: Zero address");
        VABBLE_DAO = _daoContract;  
        require(_subscriptionContract != address(0), "setupSubscription: zero contract address");
        SUBSCRIPTION = _subscriptionContract;      
        require(_vabbleWallet != address(0), "vabbleWallet: Zero address");
        VAB_WALLET = _vabbleWallet; 
    } 

    /// @notice Set baseURI by Auditor.
    function setBaseURI(string memory _baseUri) external onlyAuditor {
        baseUri = _baseUri;
    }

    /// @notice onlyStudio set mint info for his films
    // maxMintCount * (mintPrice - mintPrice * feePercent) > fundRaiseAmount 
    function setMintInfo(bytes[] calldata _mintData) external {
        for (uint256 i; i < _mintData.length; i++) {  
            (
                uint256 _filmId,
                uint256 _tier,
                uint256 _amount, 
                uint256 _price, 
                uint256 _feePercent,
                uint256 _revenuePercent
            ) = abi.decode(_mintData[i], (uint256, uint256, uint256, uint256, uint256, uint256));
            
            require(_amount > 0 && _price > 0 && _tier > 0, "setMint: Zero value");        
            require(_feePercent <= IProperty(DAO_PROPERTY).maxMintFeePercent(), "setMint: over max mint fee");
            require(_revenuePercent < 1e10, "setMint: over 100%");   

            address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
            require(owner == msg.sender, "setMint: not film owner");

            (uint256 raiseAmount, , , uint256 fundType) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
            if(fundType > 0) { // case of funding film
                require(_amount * _price * (1 - _feePercent / 1e10) > raiseAmount, "setMint: many amount");
            }

            Mint storage mInfo = mintInfo[_filmId];
            mInfo.tier = _tier;                   // 1, 2, 3, , ,
            mInfo.maxMintAmount = _amount;        // 100
            mInfo.price = _price;                 // 5 usdc = 5 * 1e6
            mInfo.feePercent = _feePercent;       // 2% = 2 * 1e8(1% = 1e8, 100% = 1e10)
            mInfo.revenuePercent = _revenuePercent; // any %(1% = 1e8, 100% = 1e10)
            mInfo.studio = msg.sender;
        }
    }

    /// @notice Studio deploy a nft contract per filmId
    function deployFilmNFTContract(
        uint256 _filmId,
        string memory _name,
        string memory _symbol
    ) public {        
        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        require(owner == msg.sender, "deployNFT: not film owner");

        VabbleNFT t = new VabbleNFT(
            OWNABLE, STAKING_POOL, UNI_HELPER, DAO_PROPERTY, VABBLE_DAO, SUBSCRIPTION, VAB_WALLET, baseUri, _name, _symbol
        );
        filmNFTContractList.push(t);
        
        indexToContract[filmNFTContractList.length - 1] = address(t);
        indexToCreator[filmNFTContractList.length - 1] = tx.origin; //msg.sender
        userNFTContractList[msg.sender].push(address(t));

        NFTInfo storage nInfo = nftInfo[address(t)];
        nInfo.name = _name;
        nInfo.symbol = _symbol;

        Mint storage mInfo = mintInfo[_filmId];
        mInfo.nft = address(t);
        mInfo.studio = msg.sender;
        
        emit ERC721Created(msg.sender, address(t));
    }

    function mint(
        uint256 _index, 
        uint256 _filmId, 
        address _to, 
        address _payToken
    ) public payable {
        require(IOwnablee(OWNABLE).isDepositAsset(_payToken), "mint: not allowed asset");    
        require(mintInfo[_filmId].maxMintAmount > 0, "mint: no mint info");     
        require(mintInfo[_filmId].maxMintAmount > getTotalSupply(_index), "mint: exceed mint amount");        

        __handleMintPay(_filmId, _payToken);    

        uint256 tokenId = filmNFTContractList[_index].mintTo(_to);
        filmNFTTokenList[_filmId].push(tokenId);

        emit ERC721Minted(indexToContract[_index], tokenId);
    }

    function mintToBatch(
        uint256 _index, 
        uint256[] memory _filmIdList, 
        address[] memory _toList, 
        address _payToken
    ) external {
        require(_toList.length > 0, "mintBatch: zero item length");
        require(_toList.length == _filmIdList.length, "mintBatch: bad item length");

        for(uint256 i; i < _toList.length; i++) {
            mint(_index, _filmIdList[i], _toList[i], _payToken);
        }
    }

    function __handleMintPay(uint256 _filmId, address _payToken) private {
        uint256 expectAmount = getExpectedTokenAmount(_payToken, mintInfo[_filmId].price);
        __transferInto(_payToken, expectAmount);                        

        address vab = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        if(IERC20(vab).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vab, STAKING_POOL, IERC20(vab).totalSupply());
        } 

        // Add VAB token to rewardPool after swap feeAmount(2%) from UniswapV2
        uint256 feeAmount = expectAmount * mintInfo[_filmId].feePercent / 1e10;       
        if(_payToken == vab) {
            IStakingPool(STAKING_POOL).addRewardToPool(feeAmount);
        } else {
            __addReward(feeAmount, _payToken);        
        }

        // Transfer remain token amount to "film owner" address
        Helper.safeTransferAsset(_payToken, IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId), expectAmount - feeAmount);
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

    /// @dev Add fee amount to rewardPool after swap from uniswap if not VAB token
    function __addReward(uint256 _feeAmount, address _payToken) private {
        if(_payToken == address(0)) {
            Helper.safeTransferETH(UNI_HELPER, _feeAmount);
        } else {
            if(IERC20(_payToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_payToken, UNI_HELPER, IERC20(_payToken).totalSupply());
            }
        }         
        bytes memory swapArgs = abi.encode(_feeAmount, _payToken, IProperty(DAO_PROPERTY).PAYOUT_TOKEN());
        uint256 feeVABAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);        

        // Transfer it(VAB token) to rewardPool
        IStakingPool(STAKING_POOL).addRewardToPool(feeVABAmount);
    }

    function getExpectedTokenAmount(address _token, uint256 _usdcAmount) public view returns (uint256 tokenAmount_) {
        tokenAmount_ = IUniHelper(UNI_HELPER).expectedAmount(_usdcAmount, IProperty(DAO_PROPERTY).USDC_TOKEN(), _token);
    }

    function getNFTOwner(uint256 _index, uint256 _tokenId) external view returns (address owner_) {
        owner_ = filmNFTContractList[_index].ownerOf(_tokenId);
    }

    function getTotalSupply(uint256 _index) public view returns (uint256) {
        return filmNFTContractList[_index].totalSupply();
    }

    function getFilmTokenIdList(uint256 _filmId) external view returns (uint256[] memory) {
        return filmNFTTokenList[_filmId];
    }

    function getUserTokenIdList(uint256 _index, address _owner) external view returns (uint256[] memory tokenIds_) {
        tokenIds_ = filmNFTContractList[_index].userTokenIdList(_owner);
    }

    function getTokenUri(uint256 _index, uint256 _tokenId) external view returns (string memory tokeUri_) {
        tokeUri_ = filmNFTContractList[_index].tokenURI(_tokenId);
    }
    
    /// @notice Get nft name and symbol
    function getNFTInfo(address _nft) external view returns (string memory name_, string memory symbol_) {
        name_ = nftInfo[_nft].name;
        symbol_ = nftInfo[_nft].symbol;
    } 

    /// @notice Get mint information per filmId
    function getMintInfo(uint256 _filmId) external view 
    returns (
        uint256 tier_,
        uint256 maxMintAmount_,
        uint256 mintPrice_,
        uint256 feePercent_,
        uint256 revenuePercent_,
        address nft_,
        address studio_
    ) {
        Mint memory info = mintInfo[_filmId];
        tier_ = info.tier;
        maxMintAmount_ = info.maxMintAmount;
        mintPrice_ = info.price;
        feePercent_ = info.feePercent;
        revenuePercent_ = info.revenuePercent;
        nft_ = info.nft;
        studio_ = info.studio;
    } 
}