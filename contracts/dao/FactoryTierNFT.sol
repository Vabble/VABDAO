// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "../interfaces/IOwnablee.sol";
import "../interfaces/IVabbleDAO.sol";
import "../interfaces/IVabbleFund.sol";
import "./VabbleNFT.sol";

/**
 * @title FactoryTierNFT Contract
 * @notice This contract manages the deployment and minting of tier-specific NFTs
 * for films. It interacts with VabbleDAO for film ownership and fund management,
 * VabbleFund for investment tracking, and deploys VabbleNFT contracts for each tier.
 */
contract FactoryTierNFT is ReentrancyGuard {
    /*//////////////////////////////////////////////////////////////
                           TYPE DECLARATIONS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Struct to hold information about a tiered NFT.
     * @param name Name of the NFT associated with the tier.
     * @param symbol Symbol of the NFT associated with the tier.
     */
    struct TierNFT {
        string name;
        string symbol;
    }

    /**
     * @dev Struct to define investment tiers for films.
     * @param maxAmount Minimum amount required to invest in this tier.
     * @param minAmount Maximum amount allowed to invest in this tier.
     */
    struct Tier {
        uint256 maxAmount;
        uint256 minAmount;
    }

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/
    /// @dev Address of the Ownablee contract.
    address private immutable OWNABLE;

    /// @dev Address of the VabbleDAO contract.
    address private immutable VABBLE_DAO;

    /// @dev Address of the VabbleFund contract.
    address private immutable VABBLE_FUND;

    /// @notice Base URI for the metadata of all NFTs created by this contract.
    string public baseUri;

    /// @notice Collection URI for the metadata of all NFTs created by this contract.
    string public collectionUri;

    /// @notice Mapping to store information about each deployed tiered NFT contract.
    mapping(address => TierNFT) public nftInfo; // (nft address => TierNFT)

    /// @notice Mapping to store the number of tiers defined for each film.
    mapping(uint256 => uint256) public tierCount;

    /// @notice Mapping to store investment tiers for each film ID.
    mapping(uint256 => mapping(uint256 => Tier)) public tierInfo;

    /// @notice Mapping to store deployed VabbleNFT contracts for each film's tier.
    /// (filmId => (tier number => nftcontract))
    mapping(uint256 => mapping(uint256 => VabbleNFT)) public tierNFTContract;

    /// @notice Mapping to store a list of token IDs minted for each film's tier.
    // (filmId => (tier number => minted tokenId list))
    mapping(uint256 => mapping(uint256 => uint256[])) public tierNFTTokenList;

    /// @notice Mapping to store a list of tiered NFT contract addresses deployed by each studio.
    mapping(address => address[]) private userTierNFTs;
    /*//////////////////////////////////////////////////////////////
                                 EVENTS
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Emitted when a new tier-specific ERC721 contract is created.
     * @param nftCreator Address of the studio creating the NFT contract.
     * @param nftContract Address of the newly created NFT contract.
     * @param tier Tier number associated with the NFT contract, if tier != 0 then tierNFTContract
     */
    event TierERC721Created(address nftCreator, address nftContract, uint256 indexed tier);

    /**
     * @dev Emitted when a tier-specific ERC721 token is minted.
     * @param nftContract Address of the NFT contract.
     * @param tokenId ID of the minted token.
     * @param receiver Address of the receiver of the minted token.
     */
    event TierERC721Minted(address nftContract, uint256 indexed tokenId, address receiver);

    /**
     * @dev Emitted when investment tier information is set for a film.
     * @param filmOwner Address of the studio setting the tier information.
     * @param filmId ID of the film associated with the tier information.
     * @param tierCount Number of tiers defined for the film.
     */
    event TierInfoSetted(address filmOwner, uint256 indexed filmId, uint256 tierCount);

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
     * @dev Constructor to initialize the FactoryTierNFT contract.
     * @param _ownable Address of the Ownablee contract.
     * @param _vabbleDAO Address of the VabbleDAO contract.
     * @param _vabbleFund Address of the VabbleFund contract.
     */
    constructor(address _ownable, address _vabbleDAO, address _vabbleFund) {
        require(_ownable != address(0), "ownableContract: zero address");
        OWNABLE = _ownable;
        require(_vabbleDAO != address(0), "daoContract: zero address");
        VABBLE_DAO = _vabbleDAO;
        require(_vabbleFund != address(0), "vabbleFund: zero address");
        VABBLE_FUND = _vabbleFund;
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

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
     * @notice Set tier information for a film NFT.
     * @dev Only callable by the owner of the film.
     * @param _filmId ID of the film.
     * @param _minAmounts Array of minimum investment amounts for each tier.
     * @param _maxAmounts Array of maximum investment amounts for each tier.
     */
    function setTierInfo(
        uint256 _filmId,
        uint256[] calldata _minAmounts,
        uint256[] calldata _maxAmounts
    )
        external
        nonReentrant
    {
        uint256 amountsLength = _minAmounts.length;

        require(amountsLength != 0 && amountsLength < 1000, "setTier: bad minAmount length");
        require(amountsLength == _maxAmounts.length, "setTier: bad maxAmount length");
        require(IVabbleDAO(VABBLE_DAO).getFilmOwner(_filmId) == msg.sender, "setTier: not film owner");

        (uint256 raiseAmount, uint256 fundPeriod, uint256 fundType,) = IVabbleDAO(VABBLE_DAO).getFilmFund(_filmId);
        (, uint256 pApproveTime) = IVabbleDAO(VABBLE_DAO).getFilmProposalTime(_filmId);
        require(fundPeriod < block.timestamp - pApproveTime, "setTier: fund period yet");
        require(fundType != 0, "setTier: not fund film");

        uint256 raisedAmount = IVabbleFund(VABBLE_FUND).getTotalFundAmountPerFilm(_filmId);
        require(raisedAmount != 0 && raisedAmount >= raiseAmount, "setTier: not raised yet");

        for (uint256 i = 0; i < amountsLength; ++i) {
            require(_minAmounts[i] != 0, "setTier: zero value");
            // TODO - N3-2 updated(add below line)
            require(_minAmounts[i] < _maxAmounts[i] || _maxAmounts[i] == 0, "setTier: invalid min/max value");

            tierInfo[_filmId][i + 1].minAmount = _minAmounts[i];
            tierInfo[_filmId][i + 1].maxAmount = _maxAmounts[i];
        }

        tierCount[_filmId] = amountsLength;

        emit TierInfoSetted(msg.sender, _filmId, tierCount[_filmId]);
    }

    /**
     * @notice Studio deploys a tier-specific NFT contract for a specific film.
     * @dev Only callable by the owner of the film and when investment tiers are set.
     * @param _filmId ID of the film.
     * @param _tier Tier number associated with the NFT contract.
     * @param _name Name of the NFT contract.
     * @param _symbol Symbol of the NFT contract.
     */
    function deployTierNFTContract(
        uint256 _filmId,
        uint256 _tier, // tier = 0 => filmNFT and tier != 0 => tierNFT
        string memory _name,
        string memory _symbol
    )
        external
        nonReentrant
    {
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

    /**
     * @notice Mints a tier-specific NFT for the caller if conditions are met.
     * @dev Should be called before the fundProcess() of VabbleDAO contract.
     * @param _filmId ID of the film for which the tier-specific NFT is minted.
     */
    function mintTierNft(uint256 _filmId) external nonReentrant {
        require(tierCount[_filmId] != 0, "mintTier: not set tier");
        require(IVabbleDAO(VABBLE_DAO).isEnabledClaimer(_filmId), "deployTier: not allow to mint tierNft");

        uint256 tier = 0;
        uint256 fund = IVabbleFund(VABBLE_FUND).getUserFundAmountPerFilm(msg.sender, _filmId);
        for (uint256 i = 1; i <= tierCount[_filmId]; ++i) {
            if (tierInfo[_filmId][i].maxAmount == 0) {
                if (tierInfo[_filmId][i].minAmount >= fund) {
                    tier = i;
                    break;
                }
            } else {
                if (fund >= tierInfo[_filmId][i].minAmount && fund < tierInfo[_filmId][i].maxAmount) {
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

    /**
     * @notice Retrieves the list of tier-specific NFT contracts owned by a user.
     * @param _user Address of the user.
     * @return An array of addresses representing the tier-specific NFT contracts owned by the user.
     */
    function getUserTierNFTs(address _user) external view returns (address[] memory) {
        return userTierNFTs[_user];
    }

    /**
     * @notice Retrieves the owner of a specific tier-specific NFT token.
     * @param _filmId ID of the film associated with the NFT.
     * @param _tokenId ID of the NFT token.
     * @param _tier Tier number associated with the NFT.
     * @return Address of the owner of the NFT token.
     */
    function getNFTOwner(uint256 _filmId, uint256 _tokenId, uint256 _tier) external view returns (address) {
        return tierNFTContract[_filmId][_tier].ownerOf(_tokenId);
    }

    /**
     * @notice Retrieves the URI of metadata associated with a specific tier-specific NFT token.
     * @param _filmId ID of the film associated with the NFT.
     * @param _tokenId ID of the NFT token.
     * @param _tier Tier number associated with the NFT.
     * @return URI string pointing to the metadata of the NFT token.
     */
    function getTokenUri(uint256 _filmId, uint256 _tokenId, uint256 _tier) external view returns (string memory) {
        return tierNFTContract[_filmId][_tier].tokenURI(_tokenId);
    }

    /**
     * @notice Retrieves the list of token IDs minted for a specific tier of a film.
     * @param _filmId ID of the film.
     * @param _tier Tier number associated with the NFT.
     * @return An array of token IDs minted for the specified tier.
     */
    function getTierTokenIdList(uint256 _filmId, uint256 _tier) external view returns (uint256[] memory) {
        return tierNFTTokenList[_filmId][_tier];
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Retrieves the total supply of tier-specific NFTs minted for a film.
     * @param _filmId ID of the film.
     * @param _tier Tier number associated with the NFT.
     * @return Total number of tier-specific NFTs minted for the specified tier of the film.
     */
    function getTotalSupply(uint256 _filmId, uint256 _tier) public view returns (uint256) {
        return tierNFTContract[_filmId][_tier].totalSupply();
    }

    /**
     * @notice Retrieves the list of token IDs owned by a user for a specific tier of a film.
     * @param _filmId ID of the film.
     * @param _owner Address of the owner.
     * @param _tier Tier number associated with the NFT.
     * @return An array of token IDs owned by the specified owner for the specified tier.
     */
    function getUserTokenIdList(
        uint256 _filmId,
        address _owner,
        uint256 _tier
    )
        public
        view
        returns (uint256[] memory)
    {
        return tierNFTContract[_filmId][_tier].userTokenIdList(_owner);
    }
}
