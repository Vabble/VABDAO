// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFund.sol";
import "../interfaces/IFactoryFilmNFT.sol";
import "../libraries/Helper.sol";
import "./VabbleNFT_.sol";

/**
 * @title FactoryFilmNFT
 * @notice This contract manages the creation and management of film-specific NFTs.
 * It allows studios to deploy NFT contracts for their films, set minting parameters,
 * and manage ownership of the NFT contracts. Users can claim allocated NFTs once
 * funding for a film is fully raised. The contract integrates with VabbleDAO and
 * VabbleFund contracts to validate ownership, funding status, and other parameters.
 */
contract FactoryFilmNFT_ is IFactoryFilmNFT, ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct containing minting parameters for each film.
     * @param tier Tier of the minting configuration (e.g., 1, 2, 3).
     * @param maxMintAmount Maximum number of NFTs that can be minted for this film.
     * @param price Price in USDC (scaled by 1e6) to mint one NFT for this film.
     * @param nft Address of the deployed NFT contract for this film.
     * @param studio Address of the studio that owns this film's NFT.
     */
    struct Mint {
        uint256 tier;
        uint256 maxMintAmount;
        uint256 price;
        address nft;
        address studio;
    }

    /**
     * @dev Struct containing basic information about a film's NFT.
     * @param name Name of the NFT associated with the film.
     * @param symbol Symbol of the NFT associated with the film.
     */
    struct FilmNFT {
        string name;
        string symbol;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev Address of the Ownablee contract
    address private immutable OWNABLE;

    /// @dev Address of the VabbleDAO contract
    address private VABBLE_DAO;

    /// @dev Address of the VabbleFund contract
    address private VABBLE_FUND;

    /// @notice Base URI for the metadata of all NFTs created by this contract.
    string public baseUri;

    /// @notice Collection URI for the metadata of all NFTs created by this contract.
    string public collectionUri;

    /// @notice Mapping to store information about each deployed NFT contract.
    mapping(address => FilmNFT) public nftInfo;

    /// @notice Mapping to store a list of NFT contract addresses deployed by each studio.
    mapping(address => address[]) public studioNFTAddressList;

    /// @notice Mapping to store deployed VabbleNFT contracts for each film ID.
    mapping(uint256 => VabbleNFT_) public filmNFTContract;

    /// @dev Mapping to store a list of token IDs minted for each film ID.
    mapping(uint256 => uint256[]) private filmNFTTokenList;

    /// @dev Mapping to store minting information for each film ID.
    mapping(uint256 => Mint) private mintInfo;

    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a new film-specific ERC721 contract is created.
     * @param nftCreator Address of the studio creating the NFT contract.
     * @param nftContract Address of the newly created NFT contract.
     * @param filmId ID of the film associated with the NFT contract.
     */
    event FilmERC721Created(address nftCreator, address nftContract, uint256 indexed filmId);

    /**
     * @dev Emitted when a film-specific ERC721 token is minted.
     * @param nftContract Address of the NFT contract.
     * @param filmId ID of the film associated with the NFT.
     * @param tokenId ID of the minted token.
     * @param receiver Address of the receiver of the minted token.
     */
    event FilmERC721Minted(address nftContract, uint256 indexed filmId, uint256 indexed tokenId, address receiver);

    /**
     * @dev Emitted when minting information is set for a film.
     * @param filmOwner Address of the studio setting the minting information.
     * @param filmId ID of the film associated with the minting information.
     * @param tier Tier of the minting configuration.
     * @param mintAmount Maximum number of NFTs that can be minted.
     * @param mintPrice Price in USDC to mint one NFT.
     */
    event MintInfoSetted(
        address filmOwner, uint256 indexed filmId, uint256 tier, uint256 mintAmount, uint256 mintPrice
    );

    /**
     * @dev Emitted when the ownership of a film's ERC721 contract changes.
     * @param filmId ID of the film associated with the ERC721 contract.
     * @param oldOwner Address of the previous owner of the ERC721 contract.
     * @param newOwner Address of the new owner of the ERC721 contract.
     */
    event ChangeERC721FilmOwner(uint256 indexed filmId, address indexed oldOwner, address indexed newOwner);

    /*//////////////////////////////////////////////////////////////
                               MODIFIERS
    //////////////////////////////////////////////////////////////*/

    /// @dev Restricts access to the current Auditor.
    modifier onlyAuditor() {
        require(msg.sender == IOwnablee(OWNABLE).auditor(), "caller is not the auditor");
        _;
    }

    /// @dev Restricts access to the deployer of the ownable contract.
    modifier onlyDeployer() {
        require(msg.sender == IOwnablee(OWNABLE).deployer(), "caller is not the deployer");
        _;
    }

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Constructor to initialize the FactoryFilmNFT contract.
     * @param _ownable Address of the Ownablee contract.
     */
    constructor(address _ownable) {
        require(_ownable != address(0), "ownableContract: Zero address");
        OWNABLE = _ownable;
    }

    // receive() external payable {}

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Initialize the addresses of VabbleDAO and VabbleFund contracts.
     * @dev Only callable by the deployer of the Ownablee contract.
     * @param _vabbleDAO Address of the VabbleDAO contract.
     * @param _vabbleFund Address of the VabbleFund contract.
     */
    function initialize(address _vabbleDAO, address _vabbleFund) external onlyDeployer {
        require(VABBLE_DAO == address(0), "initialize: already initialized");

        require(_vabbleDAO != address(0), "daoContract: Zero address");
        VABBLE_DAO = _vabbleDAO;
        require(_vabbleFund != address(0), "fundContract: Zero address");
        VABBLE_FUND = _vabbleFund;
    }

    /**
     * @notice Set baseURI and collectionURI for all NFTs created by this contract.
     * @dev Only callable by the Auditor.
     * @param _baseUri Base URI for all NFTs.
     * @param _collectionUri Collection URI for all NFTs.
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
     * @notice Set minting information for a film.
     * @dev Only callable by the owner of the film.
     * @param _filmId ID of the film.
     * @param _tier Tier of the minting configuration.
     * @param _amount Maximum number of NFTs that can be minted.
     * @param _price Price in USDC to mint one NFT.
     */
    function setMintInfo(uint256 _filmId, uint256 _tier, uint256 _amount, uint256 _price) external nonReentrant {
        require(_amount != 0 && _price != 0 && _tier != 0, "setMint: Zero value");

        address owner = IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId);
        require(owner == msg.sender, "setMint: not film owner");

        // TODO - PVE005-1 updated(add below line)
        require(mintInfo[_filmId].price == 0, "setMint: already setup for film");

        Mint storage mInfo = mintInfo[_filmId];
        mInfo.tier = _tier; // 1, 2, 3, , ,
        mInfo.maxMintAmount = _amount; // 100
        mInfo.price = _price; // 5 usdc = 5 * 1e6
        mInfo.studio = msg.sender;

        emit MintInfoSetted(msg.sender, _filmId, _tier, _amount, _price);
    }

    /**
     * @notice Studio deploys an NFT contract for a specific film.
     * @dev Only callable by the owner of the film and when the film is approved for NFT funding.
     * @param _filmId ID of the film.
     * @param _name Name of the NFT contract.
     * @param _symbol Symbol of the NFT contract.
     */
    function deployFilmNFTContract(uint256 _filmId, string memory _name, string memory _symbol) external nonReentrant {
        require(IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId) == msg.sender, "deployNFT: not film owner");

        (,, uint256 fundType,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        require(fundType == 2 || fundType == 3, "deployNFT: not fund type by NFT");

        Helper.Status status = IVabbleDAO(VABBLE_DAO).getFilmStatus(_filmId);
        require(status == Helper.Status.APPROVED_FUNDING, "deployNFT: filmId not approved for funding");

        require(mintInfo[_filmId].nft == address(0), "deployNFT: already deployed for film");

        //@audit-issue -low who tf names his variable "t" ????
        VabbleNFT_ t = new VabbleNFT_(baseUri, collectionUri, _name, _symbol, address(this));
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

    /**
     * @notice Claim NFTs allocated for the caller for a specific film.
     * @dev Only callable when NFTs are deployed for the film, caller has allocated NFTs, and funding is fully raised.
     * @param _filmId ID of the film.
     */
    function claimNft(uint256 _filmId) external nonReentrant {
        require(mintInfo[_filmId].nft != address(0), "claimNft: not deployed for film");

        uint256 count = IVabbleFund(VABBLE_FUND).getAllowUserNftCount(_filmId, msg.sender);
        require(count != 0, "claimNft: zero count");
        require(IVabbleFund(VABBLE_FUND).isRaisedFullAmount(_filmId), "claimNft: not full raised");

        for (uint256 i = 0; i < count; ++i) {
            __mint(_filmId);
        }
    }

    /**
     * @notice Change the owner of a film's ERC721 contract.
     * @dev Only callable by the current owner of the film's ERC721 contract.
     * @param _filmId ID of the film.
     * @param newOwner Address of the new owner.
     * @return success Boolean indicating whether the owner change was successful.
     */
    function changeOwner(uint256 _filmId, address newOwner) external nonReentrant returns (bool) {
        Mint storage mInfo = mintInfo[_filmId];

        require(mInfo.studio == msg.sender, "changeOwner: not film owner");

        mInfo.studio = newOwner;

        emit ChangeERC721FilmOwner(_filmId, msg.sender, newOwner);

        return true;
    }

    /**
     * @notice Get minting information for a specific film.
     * @param _filmId ID of the film.
     * @return tier_ Tier of the minting configuration.
     * @return maxMintAmount_ Maximum number of NFTs that can be minted.
     * @return mintPrice_ Price in USDC to mint one NFT.
     * @return nft_ Address of the deployed NFT contract.
     * @return studio_ Address of the studio that owns the film's NFT.
     */
    function getMintInfo(uint256 _filmId)
        external
        view
        override
        returns (uint256 tier_, uint256 maxMintAmount_, uint256 mintPrice_, address nft_, address studio_)
    {
        Mint memory info = mintInfo[_filmId];
        tier_ = info.tier;
        maxMintAmount_ = info.maxMintAmount;
        mintPrice_ = info.price;
        nft_ = info.nft;
        studio_ = info.studio;
    }

    /**
     * @notice Get the owner of a specific NFT token.
     * @param _filmId ID of the film.
     * @param _tokenId ID of the NFT token.
     * @return Address of the owner of the NFT token.
     */
    function getNFTOwner(uint256 _filmId, uint256 _tokenId) external view returns (address) {
        return filmNFTContract[_filmId].ownerOf(_tokenId);
    }

    /**
     * @notice Get the URI of a specific NFT token.
     * @param _filmId ID of the film.
     * @param _tokenId ID of the NFT token.
     * @return URI of the NFT token.
     */
    function getTokenUri(uint256 _filmId, uint256 _tokenId) external view returns (string memory) {
        return filmNFTContract[_filmId].tokenURI(_tokenId);
    }

    /**
     * @notice Get the list of token IDs minted for a specific film.
     * @param _filmId ID of the film.
     * @return Array of token IDs.
     */
    function getFilmNFTTokenList(uint256 _filmId) external view returns (uint256[] memory) {
        return filmNFTTokenList[_filmId];
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Get the total supply of NFTs minted for a specific film.
     * @param _filmId ID of the film.
     * @return Total number of NFTs minted.
     */
    function getTotalSupply(uint256 _filmId) public view override returns (uint256) {
        return filmNFTContract[_filmId].totalSupply();
    }

    /**
     * @notice Get the list of token IDs owned by a specific user for a film.
     * @param _filmId ID of the film.
     * @param _owner Address of the owner.
     * @return Array of token IDs owned by the owner.
     */
    function getUserTokenIdList(uint256 _filmId, address _owner) public view returns (uint256[] memory) {
        return filmNFTContract[_filmId].userTokenIdList(_owner);
    }

    /**
     * @notice Get the address of the VabbleDAO contract.
     * @return dao_ Address of the VabbleDAO contract.
     */
    function getVabbleDAO() public view returns (address dao_) {
        dao_ = VABBLE_DAO;
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Mint a new NFT for the caller and update internal records.
     * @dev This function is called internally to mint an NFT for the given film ID.
     * @param _filmId ID of the film for which the NFT is being minted.
     */
    function __mint(uint256 _filmId) private {
        VabbleNFT_ t = filmNFTContract[_filmId];
        uint256 tokenId = t.mintTo(msg.sender);

        filmNFTTokenList[_filmId].push(tokenId);

        emit FilmERC721Minted(address(t), _filmId, tokenId, msg.sender);
    }
}
