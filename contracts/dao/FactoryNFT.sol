// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "../libraries/Helper.sol";
import "../interfaces/IUniHelper.sol";
import "../interfaces/IStakingPool.sol";
import "../interfaces/IProperty.sol";
import "../interfaces/IOwnablee.sol";
import "hardhat/console.sol";

contract FactoryNFT is ERC721, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    event BatchMinted(address from, address to, uint256 mintAmount, uint256 revenueAmount);

    struct Mint {
        uint256 maxMintAmount;    // mint amount(ex: 10000 nft)
        uint256 mintPrice;        // mint price in usdc(ex: 5 usdc = 5*1e6)
        uint256 feePercent;       // it will be send to reward pool(2% max=10%)
        uint256 mintedAmount;     // current minted amount(<= maxMintAmount)
    }

    address private immutable OWNABLE;         // Ownablee contract address
    address private immutable STAKING_POOL;    // StakingPool contract address
    address private immutable UNI_HELPER;      // UniHelper contract address
    address private immutable DAO_PROPERTY;    // Property contract address

    Counters.Counter private nftCount;
    string public baseUri;                     // Base URI    

    mapping(uint256 => string) private tokenUriInfo; // (tokenId => tokenUri)    
    mapping(address => Mint) private mintInfo;       // (studio => Mint)

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    modifier onlyStudio() {
        require(IOwnablee(OWNABLE).isStudio(msg.sender), "caller is not the studio");
        _;
    }

    receive() external payable {}

    constructor(
        address _ownableContract,
        address _stakingContract,
        address _uniHelperContract,
        address _daoProperty,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        require(_ownableContract != address(0), "ownableContract: Zero address");
        OWNABLE = _ownableContract;  
        require(_stakingContract != address(0), "stakingContract: Zero address");
        STAKING_POOL = _stakingContract;
        require(_uniHelperContract != address(0), "uniHelperContract: Zero address");
        UNI_HELPER = _uniHelperContract;   
        require(_daoProperty != address(0), "daoProperty: Zero address");
        DAO_PROPERTY = _daoProperty;    
    }

    /// @notice Set baseURI by Auditor.
    function setBaseURI(string memory _baseUri) external onlyAuditor {
        baseUri = _baseUri;
    }

    /// @notice Set mint info by Studio
    function setMintInfo(uint256 _amount, uint256 _price, uint256 _percent) external onlyStudio nonReentrant {
        require(_amount > 0 && _price > 0 && _percent > 0, "setMint: Zero value");        
        require(_percent <= IProperty(DAO_PROPERTY).maxMintFeePercent(), "setMint: over max mint fee");

        Mint storage _mintInfo = mintInfo[msg.sender];
        _mintInfo.maxMintAmount = _amount; // 100
        _mintInfo.mintPrice = _price;      // 5 usdc = 5 * 1e6
        _mintInfo.feePercent = _percent;   // 2% = 2 * 1e9(1% = 1e9, 100% = 1e10)
    }    

    /// @notice Mint the multiple tokens to _to address
    function batchMintTo(
        address _to, 
        address _studio,
        address _payToken,
        uint256 _mintAmount, 
        string memory _tokenUri
    ) public payable nonReentrant {
        uint256 maxMintAmount = mintInfo[_studio].maxMintAmount;
        uint256 currentMintedAmount = mintInfo[_studio].mintedAmount;
        require(maxMintAmount > 0, "batchMintTo: should set mint info by studio");
        require(maxMintAmount >= _mintAmount + currentMintedAmount, "batchMintTo: exceed mint amount");

        uint256 totalMintPrice = mintInfo[_studio].mintPrice * _mintAmount;        
        uint256 expectAmount = IUniHelper(UNI_HELPER).expectedAmount(totalMintPrice, IProperty(DAO_PROPERTY).USDC_TOKEN(), _payToken);
        
        // Return remain ETH to user back if case of ETH
        // Transfer Asset from buyer to this contract
        if(_payToken == address(0)) {
            require(msg.value >= expectAmount, "batchMintTo: Insufficient paid");
            if (msg.value > expectAmount) {
                Helper.safeTransferETH(msg.sender, msg.value - expectAmount);
            }
        } else {
            Helper.safeTransferFrom(_payToken, msg.sender, address(this), expectAmount);
        }                

        address payout_token = IProperty(DAO_PROPERTY).PAYOUT_TOKEN();
        // Approve VAB token to StakingPool contract
        if(IERC20(payout_token).allowance(address(this), STAKING_POOL) == 0) {
            Helper.safeApprove(payout_token, STAKING_POOL, IERC20(payout_token).totalSupply());
        } 

        // Add VAB token to rewardPool after swap feeAmount(2%) from UniswapV2
        uint256 feeAmount = expectAmount * mintInfo[_studio].feePercent / 1e10;       
        if(_payToken == payout_token) {
            IStakingPool(STAKING_POOL).addRewardToPool(feeAmount);
        } else {
            __addReward(feeAmount, _payToken);        
        }

        // Transfer token to "_studio" address
        uint256 revenueAmount = expectAmount - feeAmount;
        Helper.safeTransferAsset(_payToken, _studio, revenueAmount);
        
        // Mint nft to "_to" address
        for(uint256 i = 0; i < _mintAmount; i++) {
            __mintTo(_to, _studio, _tokenUri);
        }
        emit BatchMinted(_studio, _to, _mintAmount, revenueAmount);
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

    /// @dev Mint the token to _to address
    function __mintTo(
        address _to, 
        address _studio,
        string memory _tokenUri
    ) private returns (uint256 newTokenId_) {
        newTokenId_ = __getNextTokenId();
        _safeMint(_to, newTokenId_);
        __setTokenURI(newTokenId_, _tokenUri);

        mintInfo[_studio].mintedAmount += 1;
    }

    function __getNextTokenId() private returns (uint256 newTokenId_) {
        nftCount.increment();
        newTokenId_ = nftCount.current();
    }

    function __setTokenURI(uint256 _tokenId, string memory _tokenUri) private {
        require(_exists(_tokenId), "ERC721Metadata: URI set of nonexistent token");
        tokenUriInfo[_tokenId] = _tokenUri;
    }

    /// @notice Set tokenURI in all available cases
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");
        
        string memory tokenUri = tokenUriInfo[_tokenId];
        
        // If there is no base URI, return the token URI.
        if (bytes(baseUri).length == 0) return tokenUri;

        // If both are set, concatenate the baseURI and tokenURI (via abi.encodePacked).
        if (bytes(tokenUri).length > 0) return string(abi.encodePacked(baseUri, tokenUri));

        // If there is a baseURI but no tokenURI, concatenate the tokenID to the baseURI.
        return string(abi.encodePacked(baseUri, _tokenId.toString()));
    }

    /// @notice Return total minited NFT count
    function totalSupply() public view returns (uint256) {
        return nftCount.current();
    }

    /// @notice Get mint information per studio
    function getMintInfo(address _studio) public view 
    returns (
        uint256 maxMintAmount_,
        uint256 mintPrice_,
        uint256 feePercent_,
        uint256 mintedAmount_
    ) {
        Mint storage info = mintInfo[_studio];
        maxMintAmount_ = info.maxMintAmount;
        mintPrice_ = info.mintPrice;
        feePercent_ = info.feePercent;
        mintedAmount_ = info.mintedAmount;
    }    
}