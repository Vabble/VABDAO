// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFund.sol";
import "./VabbleNFT.sol";

contract FactoryTierNFT is ReentrancyGuard {

    event TierERC721Created(address nftCreator, address nftContract, uint indexed tier);// if tier != 0 then tierNFTContract
    event TierERC721Minted(address nftContract, uint256 indexed tokenId, address receiver);
    event TierInfoSetted(address filmOwner, uint256 indexed filmId, uint256 tierCount);

    struct TierNFT {
        string name;
        string symbol;
    }

    struct Tier {
        uint256 maxAmount;    // invested min amount(ex: $1000)
        uint256 minAmount;    // invested max amount(ex: $50)
    }
    
    string public baseUri;                     // Base URI    
    string public collectionUri;               // Collection URI  

    mapping(address => TierNFT) public nftInfo;             // (nft address => TierNFT)
    mapping(address => address[]) private userTierNFTs;          // (user => tier nft address list)
    mapping(uint256 => mapping(uint256 => Tier)) public tierInfo;              // (filmId => (tier number => Tier))
    mapping(uint256 => uint256) public tierCount;                              // (filmId => tier count)
    mapping(uint256 => mapping(uint256 => VabbleNFT)) public tierNFTContract;  // (filmId => (tier number => nft contract))
    mapping(uint256 => mapping(uint256 => uint256[])) public tierNFTTokenList; // (filmId => (tier number => minted tokenId list))
    
    address private immutable OWNABLE;          // Ownablee contract address
    address private immutable VABBLE_DAO;       // VabbleDAO contract address
    address private immutable VABBLE_FUND;      // VabbleFund contract address

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    receive() external payable {}

    constructor(
        address _ownable,
        address _vabbleDAO,
        address _vabbleFund
    ) {
        require(_ownable != address(0), "ownableContract: zero address");
        OWNABLE = _ownable; 
        require(_vabbleDAO != address(0), "daoContract: zero address");
        VABBLE_DAO = _vabbleDAO; 
        require(_vabbleFund!= address(0), "vabbleFund: zero address");
        VABBLE_FUND = _vabbleFund;  
    }

    /// @notice Set baseURI by Auditor.
    function setBaseURI(
        string memory _baseUri,
        string memory _collectionUri
    ) external onlyAuditor {
        bytes memory baseUriByte = bytes(_baseUri);
        require(baseUriByte.length != 0, "empty baseUri");

        bytes memory collectionUriByte = bytes(_collectionUri);
        require(collectionUriByte.length != 0, "empty collectionUri");

        baseUri = _baseUri;
        collectionUri = _collectionUri;
    }

    /// @notice onlyStudio set tier info for his films
    function setTierInfo(
        uint256 _filmId,
        uint256[] calldata _minAmounts,
        uint256[] calldata _maxAmounts
    ) external nonReentrant {                    
        require(_minAmounts.length != 0 && _minAmounts.length < 1000, "setTier: bad minAmount length");        
        require(_minAmounts.length == _maxAmounts.length, "setTier: bad maxAmount length");        
        require(IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId) == msg.sender, "setTier: not film owner");

        (uint256 raiseAmount, uint256 fundPeriod, uint256 fundType, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(fundPeriod < block.timestamp - pApproveTime, "setTier: fund period yet"); 
        require(fundType != 0, "setTier: not fund film"); 

        uint256 raisedAmount = IVabbleFund(VABBLE_FUND).getTotalFundAmountPerFilm(_filmId);        
        require(raisedAmount != 0 && raisedAmount >= raiseAmount, "setTier: not raised yet");
        
        uint256 amountsLength = _minAmounts.length;
        for(uint256 i = 0; i < amountsLength; ++i) {
            require(_minAmounts[i] != 0, "setTier: zero value");        
            // TODO - N3-2 updated(add below line)
            require(_minAmounts[i] < _maxAmounts[i] || _maxAmounts[i] == 0, "setTier: invalid min/max value");        

            tierInfo[_filmId][i+1].minAmount = _minAmounts[i];
            tierInfo[_filmId][i+1].maxAmount = _maxAmounts[i];
        }

        tierCount[_filmId] = amountsLength;

        emit TierInfoSetted(msg.sender, _filmId, tierCount[_filmId]);
    }

    /// @notice Studio deploy a nft contract per filmId
    function deployTierNFTContract(
        uint256 _filmId,
        uint256 _tier,      // tier = 0 => filmNFT and tier != 0 => tierNFT
        string memory _name,
        string memory _symbol
    ) external nonReentrant {        
        require(IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId) == msg.sender, "deployTier: not film owner");
        require(_tier != 0, "deployTier: zero tier");
        require(tierInfo[_filmId][_tier].minAmount != 0, "deployTier: not set tier");

        VabbleNFT t = new VabbleNFT(baseUri, collectionUri, _name, _symbol, address(this));
        tierNFTContract[_filmId][_tier] = t;

        userTierNFTs[msg.sender].push(address(t));             

        TierNFT storage nInfo = nftInfo[address(t)];
        nInfo.name = _name;
        nInfo.symbol = _symbol;
        
        emit TierERC721Created(msg.sender, address(t), _tier);
    }  

    /// @notice Should be called //before fundProcess() of VabbleDAO contract
    function mintTierNft(uint256 _filmId) external nonReentrant  {        
        require(tierCount[_filmId] != 0, "mintTier: not set tier");
        require(IVabbleDAO(VABBLE_DAO).isEnabledClaimer(_filmId), "deployTier: not allow to mint tierNft");

        uint256 tier = 0;
        uint256 fund = IVabbleFund(VABBLE_FUND).getUserFundAmountPerFilm(msg.sender, _filmId);
        for(uint256 i = 1; i <= tierCount[_filmId]; ++i) {
            if(tierInfo[_filmId][i].maxAmount == 0) {
                if(tierInfo[_filmId][i].minAmount >= fund) {
                    tier = i;
                    break;
                }    
            } else {
                if(fund >= tierInfo[_filmId][i].minAmount && fund < tierInfo[_filmId][i].maxAmount) {
                    tier = i;
                    break;
                }    
            }            
        }
        
        require(tier != 0, "mintTier: bad investor");
        uint256[] memory list = getUserTokenIdList(_filmId, msg.sender, tier);
        require(list.length == 0, "mintTier: already minted"); 

        VabbleNFT t = tierNFTContract[_filmId][tier];
        uint256 tokenId = t.mintTo(msg.sender);
        tierNFTTokenList[_filmId][tier].push(tokenId);

        emit TierERC721Minted(address(t), tokenId, msg.sender);
    }

    /// @notice userTierNFTs
    function getUserTierNFTs(address _user) external view returns (address[] memory) {
        return userTierNFTs[_user];
    }

    function getNFTOwner(
        uint256 _filmId, 
        uint256 _tokenId, 
        uint256 _tier
    ) external view returns (address) {
        return tierNFTContract[_filmId][_tier].ownerOf(_tokenId);
    }

    function getTotalSupply(
        uint256 _filmId, 
        uint256 _tier
    ) public view returns (uint256) {
        return tierNFTContract[_filmId][_tier].totalSupply();
    }

    function getTierTokenIdList(
        uint256 _filmId, 
        uint256 _tier
    ) external view returns (uint256[] memory) {
        return tierNFTTokenList[_filmId][_tier];
    }

    function getUserTokenIdList(
        uint256 _filmId, 
        address _owner, 
        uint256 _tier
    ) public view returns (uint256[] memory) {
        return tierNFTContract[_filmId][_tier].userTokenIdList(_owner);
    }

    function getTokenUri(
        uint256 _filmId, 
        uint256 _tokenId, 
        uint256 _tier
    ) external view returns (string memory) {
        return tierNFTContract[_filmId][_tier].tokenURI(_tokenId);
    }
}