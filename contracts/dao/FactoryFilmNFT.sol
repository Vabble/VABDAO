// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFunding.sol";
import "./VabbleNFT.sol";
// import "hardhat/console.sol";

contract FactoryFilmNFT {

    event FilmERC721Created(address nftCreator, address nftContract, uint filmId);
    event FilmERC721Minted(address nftContract, uint256 tokenId);
    event MintInfoSetted(address filmOwner, uint filmId, uint tier, uint mintAmount, uint mintPrice, uint feePercent, uint revenuePercent);

    struct Mint {
        uint256 tier;             // Tier 1 (1000 NFT’s for 1 ETH), Tier 2 (5000 NFT’s for 0.5 ETH), Tier 3 (10000 NFT’s for 0.1 ETH)
        uint256 maxMintAmount;    // mint amount(ex: 10000 nft)
        uint256 price;            // mint price in usdc(ex: 5 usdc = 5*1e6)
        uint256 feePercent;       // it will be send to reward pool(2% max=10%)
        uint256 revenuePercent;   // studio define a % revenue for each NFT based on its tier
        address nft;
        address studio;
    }

    struct FilmNFT {
        string name;
        string symbol;
    }
    
    string public baseUri;                     // Base URI    

    mapping(uint256 => Mint) private mintInfo;              // (filmId => Mint)
    mapping(address => FilmNFT) public nftInfo;             // (nft address => FilmNFT)
    mapping(uint256 => uint256[]) private filmNFTTokenList; // (filmId => minted tokenId list)    
    mapping(uint256 => uint256) private filmFundRaiseByNFT; // (filmId => total fund amount by mint)
    mapping(address => address[]) public studioNFTAddressList;     
    mapping(uint256 => VabbleNFT) public filmNFTContract; // (filmId => nft contract)

    address private OWNABLE;         // Ownablee contract address
    address private STAKING_POOL;    // StakingPool contract address
    address private UNI_HELPER;      // UniHelper contract address
    address private DAO_PROPERTY;    // Property contract address
    address private VABBLE_DAO;      // VabbleDAO contract address
    address private FUNDING;         // Funding contract address

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

    function initializeFactory(
        address _vabbleDAO,
        address _funding,
        address _staking,        
        address _property
    ) external onlyAuditor {     
        require(_vabbleDAO != address(0), "daoContract: Zero address");
        VABBLE_DAO = _vabbleDAO; 
        require(_funding != address(0), "fundingContract: Zero address");
        FUNDING = _funding;       
        require(_staking != address(0), "stakingContract: Zero address");
        STAKING_POOL = _staking; 
        require(_property != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _property; 
    } 

    /// @notice Set baseURI by Auditor.
    function setBaseURI(string memory _baseUri) external onlyAuditor {
        baseUri = _baseUri;
    }

    /// @notice onlyStudio set mint info for his films
    // maxMintCount * (mintPrice - mintPrice * feePercent) > fundRaiseAmount 
    function setMintInfo(
        uint256 _filmId,
        uint256 _tier,
        uint256 _amount, 
        uint256 _price, 
        uint256 _feePercent,
        uint256 _revenuePercent
    ) external {            
        require(_amount > 0 && _price > 0 && _tier > 0, "setMint: Zero value");        
        require(_feePercent <= IProperty(DAO_PROPERTY).maxMintFeePercent(), "setMint: over max mint fee");
        require(_revenuePercent < 1e10, "setMint: over 100%");   

        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        require(owner == msg.sender, "setMint: not film owner");

        (uint256 raiseAmount, , uint256 fundType) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if(fundType > 0) { // case of funding film
            require(_amount * _price * (1 - _feePercent / 1e10) > raiseAmount, "setMint: many amount");
        }

        Mint storage mInfo = mintInfo[_filmId];
        mInfo.tier = _tier;                     // 1, 2, 3, , ,
        mInfo.maxMintAmount = _amount;          // 100
        mInfo.price = _price;                   // 5 usdc = 5 * 1e6
        mInfo.feePercent = _feePercent;         // 2% = 2 * 1e8(1% = 1e8, 100% = 1e10)
        mInfo.revenuePercent = _revenuePercent; // any %(1% = 1e8, 100% = 1e10)
        mInfo.studio = msg.sender;

        emit MintInfoSetted(msg.sender, _filmId, _tier, _amount, _price, _feePercent, _revenuePercent);
    }    

    /// @notice Studio deploy a nft contract per filmId
    function deployFilmNFTContract(
        uint256 _filmId,
        string memory _name,
        string memory _symbol
    ) public {        
        require(IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId) == msg.sender, "deployNFT: not film owner");

        VabbleNFT t = new VabbleNFT(baseUri, _name, _symbol);
        filmNFTContract[_filmId] = t;

        Mint storage mInfo = mintInfo[_filmId];
        mInfo.nft = address(t);
        mInfo.studio = msg.sender;        

        studioNFTAddressList[msg.sender].push(address(t));             

        FilmNFT storage nInfo = nftInfo[address(t)];
        nInfo.name = _name;
        nInfo.symbol = _symbol;
        
        emit FilmERC721Created(msg.sender, address(t), _filmId);
    }  

    function mintToBatch(
        uint256[] memory _filmIdList, 
        address[] memory _toList, 
        address _payToken
    ) external {
        require(_toList.length > 0, "mintBatch: zero item length");
        require(_toList.length == _filmIdList.length, "mintBatch: bad item length");

        for(uint256 i; i < _toList.length; i++) {
            mint(_filmIdList[i], _toList[i], _payToken);
        }
    }

    function mint(
        uint256 _filmId, 
        address _to, 
        address _payToken
    ) public payable {
        if(_payToken != IOwnablee(OWNABLE).PAYOUT_TOKEN()) {
            require(IOwnablee(OWNABLE).isDepositAsset(_payToken), "mint: not allowed asset");    
        }
        require(mintInfo[_filmId].maxMintAmount > 0, "mint: no mint info");     
        require(mintInfo[_filmId].maxMintAmount > getTotalSupply(_filmId), "mint: exceed mint amount");        

        (, uint256 fundPeriod, uint256 fundType) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        if(fundType > 0) { // case of funding film                    
            require(fundType == 2 || fundType == 3, "mint: not fund type by NFT");

            Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
            require(status == Helper.Status.APPROVED_FUNDING, "mint: filmId not approved for funding");

            (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
            require(fundPeriod >= block.timestamp - pApproveTime, "mint: passed funding period"); 

            filmFundRaiseByNFT[_filmId] += mintInfo[_filmId].price;
        }
        
        __handleMintPay(_filmId, _payToken);    

        VabbleNFT t = filmNFTContract[_filmId];
        uint256 tokenId = t.mintTo(_to);
        filmNFTTokenList[_filmId].push(tokenId);

        emit FilmERC721Minted(address(t), tokenId);
    }    

    function __handleMintPay(
        uint256 _filmId, 
        address _payToken
    ) private {
        uint256 expectAmount = getExpectedTokenAmount(_payToken, mintInfo[_filmId].price);
        __transferIntoThis(_payToken, expectAmount);                        

        address vabToken = IOwnablee(OWNABLE).PAYOUT_TOKEN();
        if(IERC20(vabToken).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(vabToken, STAKING_POOL, IERC20(vabToken).totalSupply());
        } 

        // Add VAB token to rewardPool after swap feeAmount(2%) from UniswapV2
        uint256 feeAmount = expectAmount * mintInfo[_filmId].feePercent / 1e10;       
        if(_payToken == vabToken) {
            IStakingPool(STAKING_POOL).addRewardToPool(feeAmount);
        } else {
            __addReward(feeAmount, _payToken);        
        }

        // Transfer remain token amount to "film owner" address
        Helper.safeTransferAsset(_payToken, IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId), expectAmount - feeAmount);
    }

    function __transferIntoThis(
        address _payToken, 
        uint256 _amount
    ) private {
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
    function __addReward(
        uint256 _feeAmount, 
        address _payToken
    ) private {
        if(_payToken == address(0)) {
            Helper.safeTransferETH(UNI_HELPER, _feeAmount);
        } else {
            if(IERC20(_payToken).allowance(address(this), UNI_HELPER) == 0) {
                Helper.safeApprove(_payToken, UNI_HELPER, IERC20(_payToken).totalSupply());
            }
        }         
        bytes memory swapArgs = abi.encode(_feeAmount, _payToken, IOwnablee(OWNABLE).PAYOUT_TOKEN());
        uint256 feeVABAmount = IUniHelper(UNI_HELPER).swapAsset(swapArgs);        

        // Transfer it(VAB token) to rewardPool
        IStakingPool(STAKING_POOL).addRewardToPool(feeVABAmount);
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

    function getNFTOwner(
        uint256 _filmId, 
        uint256 _tokenId 
    ) external view returns (address) {
        return filmNFTContract[_filmId].ownerOf(_tokenId);
    }

    function getTotalSupply(uint256 _filmId) public view returns (uint256) {
        return filmNFTContract[_filmId].totalSupply();
    }

    function getFilmTokenIdList(uint256 _filmId) external view returns (uint256[] memory) {
        return filmNFTTokenList[_filmId];
    }

    function getUserTokenIdList(
        uint256 _filmId, 
        address _owner 
    ) public view returns (uint256[] memory) {
        return filmNFTContract[_filmId].userTokenIdList(_owner);
    }

    function getTokenUri(
        uint256 _filmId, 
        uint256 _tokenId 
    ) external view returns (string memory) {
        return filmNFTContract[_filmId].tokenURI(_tokenId);
    }
    
    function getRaisedAmountByNFT(uint256 _filmId) external view returns (uint256) {
        return filmFundRaiseByNFT[_filmId];
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