// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../libraries/Helper.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFund.sol";
import "./VabbleNFT.sol";

contract FactoryFilmNFT is ReentrancyGuard {

    event FilmERC721Created(address nftCreator, address nftContract, uint indexed filmId, uint deployTime);
    event FilmERC721Minted(address nftContract, uint256 indexed filmId, uint256 indexed tokenId, address receiver, uint mintTime);
    event MintInfoSetted(address filmOwner, uint indexed filmId, uint tier, uint mintAmount, uint mintPrice, uint setTime);

    struct Mint {
        uint256 tier;             // Tier 1 (1000 NFT’s for 1 ETH), Tier 2 (5000 NFT’s for 0.5 ETH), Tier 3 (10000 NFT’s for 0.1 ETH)
        uint256 maxMintAmount;    // mint amount(ex: 10000 nft)
        uint256 price;            // mint price in usdc(ex: 5 usdc = 5*1e6)
        address nft;
        address studio;
    }

    struct FilmNFT {
        string name;
        string symbol;
    }
    
    string public baseUri;                     // Base URI    
    string public collectionUri;               // Collection URI   

    mapping(uint256 => Mint) private mintInfo;                 // (filmId => Mint)
    mapping(address => FilmNFT) public nftInfo;                // (nft address => FilmNFT)
    mapping(uint256 => uint256[]) private filmNFTTokenList;    // (filmId => minted tokenId list)    
    mapping(address => address[]) public studioNFTAddressList;     
    mapping(uint256 => VabbleNFT) public filmNFTContract;      // (filmId => nft contract)     
    
    address private OWNABLE;         // Ownablee contract address
    address private VABBLE_DAO;      // VabbleDAO contract address
    address private VABBLE_FUND;     // VabbleFund contract address

    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    receive() external payable {}

    constructor(address _ownable) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable; 
    }

    function initialize(
        address _vabbleDAO,
        address _vabbleFund
    ) external onlyDeployer {     
        // require(VABBLE_DAO == address(0), "initialize: already initialized");

        require(_vabbleDAO != address(0), "daoContract: Zero address");
        VABBLE_DAO = _vabbleDAO; 
        require(_vabbleFund != address(0), "fundContract: Zero address");
        VABBLE_FUND = _vabbleFund; 
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

    /// @notice onlyStudio set mint info for his films
    function setMintInfo(
        uint256 _filmId,
        uint256 _tier,
        uint256 _amount, 
        uint256 _price 
    ) external nonReentrant {            
        require(_amount > 0 && _price > 0 && _tier > 0, "setMint: Zero value");     

        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        require(owner == msg.sender, "setMint: not film owner");

        // TODO - PVE005-1 updated(add below line)
        require(mintInfo[_filmId].price == 0, "setMint: already setup for film");

        Mint storage mInfo = mintInfo[_filmId];
        mInfo.tier = _tier;                     // 1, 2, 3, , ,
        mInfo.maxMintAmount = _amount;          // 100
        mInfo.price = _price;                   // 5 usdc = 5 * 1e6
        mInfo.studio = msg.sender;

        emit MintInfoSetted(msg.sender, _filmId, _tier, _amount, _price, block.timestamp);
    }    

    /// @notice Studio deploy a nft contract per filmId
    function deployFilmNFTContract(
        uint256 _filmId,
        string memory _name,
        string memory _symbol
    ) external nonReentrant {        
        require(IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId) == msg.sender, "deployNFT: not film owner");

        (, , uint256 fundType, ) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        require(fundType == 2 || fundType == 3, "deployNFT: not fund type by NFT");

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.APPROVED_FUNDING, "deployNFT: filmId not approved for funding");
        
        // TODO - PVE005-2 updated(add below line)
        require(mintInfo[_filmId].nft == address(0), "deployNFT: already deployed for film");

        VabbleNFT t = new VabbleNFT(baseUri, collectionUri, _name, _symbol, address(this));
        filmNFTContract[_filmId] = t;

        Mint storage mInfo = mintInfo[_filmId];
        mInfo.nft = address(t);
        mInfo.studio = msg.sender;        

        studioNFTAddressList[msg.sender].push(address(t));             

        FilmNFT storage nInfo = nftInfo[address(t)];
        nInfo.name = _name;
        nInfo.symbol = _symbol;
        
        emit FilmERC721Created(msg.sender, address(t), _filmId, block.timestamp);
    }  
        
    function claimNft(uint256 _filmId) external nonReentrant {
        require(mintInfo[_filmId].nft != address(0), "claimNft: not deployed for film");

        uint256 count = IVabbleFund(VABBLE_FUND).getAllowUserNftCount(_filmId, msg.sender);
        require(count > 0, "claimNft: zero count");
        require(IVabbleFund(VABBLE_FUND).isRaisedFullAmount(_filmId), "claimNft: not full raised");

        for(uint256 i = 0; i < count; i++) {
            __mint(_filmId);
        }
    }

    function __mint(uint256 _filmId) private {            
        VabbleNFT t = filmNFTContract[_filmId];
        uint256 tokenId = t.mintTo(msg.sender);

        filmNFTTokenList[_filmId].push(tokenId);

        emit FilmERC721Minted(address(t), _filmId, tokenId, msg.sender, block.timestamp);
    }       

    function getNFTOwner(uint256 _filmId, uint256 _tokenId) external view returns (address) {
        return filmNFTContract[_filmId].ownerOf(_tokenId);
    }

    function getTotalSupply(uint256 _filmId) public view returns (uint256) {
        return filmNFTContract[_filmId].totalSupply();
    }

    function getUserTokenIdList(uint256 _filmId, address _owner) public view returns (uint256[] memory) {
        return filmNFTContract[_filmId].userTokenIdList(_owner);
    }

    function getTokenUri(uint256 _filmId, uint256 _tokenId) external view returns (string memory) {
        return filmNFTContract[_filmId].tokenURI(_tokenId);
    }
    
    /// @notice Get mint information per filmId
    function getMintInfo(uint256 _filmId) external view 
    returns (
        uint256 tier_,
        uint256 maxMintAmount_,
        uint256 mintPrice_,
        address nft_,
        address studio_
    ) {
        Mint memory info = mintInfo[_filmId];
        tier_ = info.tier;
        maxMintAmount_ = info.maxMintAmount;
        mintPrice_ = info.price;
        nft_ = info.nft;
        studio_ = info.studio;
    } 

    function getFilmNFTTokenList(uint256 _filmId) external view returns (uint256[] memory) {
        return filmNFTTokenList[_filmId];
    }

    function getVabbleDAO() public view returns (address dao_) {        
        dao_ = VABBLE_DAO;
    } 
}