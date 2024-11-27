// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title VabbleNFT Contract
 * @notice ERC721 NFT contract with metadata extension, royalty support, and minting controls.
 * This contract manages the minting, transferring, and metadata retrieval of Vabble NFTs (Non-Fungible Tokens).
 * It supports a base URI for token metadata and a collection URI for overall contract metadata.
 */
contract VabbleNFT is ERC2981, ERC721Enumerable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    /*//////////////////////////////////////////////////////////////
                            STATE VARIABLES
    //////////////////////////////////////////////////////////////*/

    /// @dev Base URI for retrieving token metadata.
    string public baseUri;

    /// @dev Collection URI for contract-level metadata.
    string public collectionUri;

    /// @dev Address of the factory contract that manages NFT creation.
    address public immutable FACTORY;

    /// @dev Counter for tracking the number of minted NFTs.
    Counters.Counter private nftCount;

    /*//////////////////////////////////////////////////////////////
                               FUNCTIONS
    //////////////////////////////////////////////////////////////*/

    /*//////////////////////////////////////////////////////////////
                              CONSTRUCTOR
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Constructor to initialize the VabbleNFT contract.
     * @param _baseUri Base URI for retrieving token metadata.
     * @param _collectionUri Collection URI for contract-level metadata.
     * @param _name Name of the NFT contract.
     * @param _symbol Symbol of the NFT contract.
     * @param _factory Address of the factory contract that deploys this NFT contract.
     */
    constructor(
        string memory _baseUri,
        string memory _collectionUri,
        string memory _name,
        string memory _symbol,
        address _factory
    )
        ERC721(_name, _symbol)
    {
        baseUri = _baseUri;
        collectionUri = _collectionUri;
        FACTORY = _factory;
    }

    /*//////////////////////////////////////////////////////////////
                                EXTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Transfers ownership of an NFT from the caller to a specified recipient.
     * @param _tokenId ID of the NFT to transfer.
     * @param _to Address of the recipient to transfer the NFT to.
     */
    function transferNFT(uint256 _tokenId, address _to) external {
        address seller = ownerOf(_tokenId);
        transferFrom(seller, _to, _tokenId);
    }

    /**
     * @notice Retrieves a list of token IDs owned by a specific address.
     * @param _owner Address of the owner to query tokens for.
     * @return _tokensOfOwner Array of token IDs owned by the specified address.
     */
    function userTokenIdList(address _owner) external view returns (uint256[] memory _tokensOfOwner) {
        _tokensOfOwner = new uint256[](balanceOf(_owner));
        for (uint256 i; i < balanceOf(_owner); ++i) {
            _tokensOfOwner[i] = tokenOfOwnerByIndex(_owner, i);
        }
    }

    /*//////////////////////////////////////////////////////////////
                                 PUBLIC
    //////////////////////////////////////////////////////////////*/

    /**
     * @notice Mints a new NFT and assigns it to the specified recipient.
     * @dev Only callable by the FACTORY contract to ensure controlled minting.
     * @param _to Address to assign the newly minted NFT to.
     * @return newTokenId The ID of the newly minted NFT.
     */
    function mintTo(address _to) public nonReentrant returns (uint256) {
        require(msg.sender == FACTORY, "mintTo: caller is not factory contract");

        uint256 newTokenId = __getNextTokenId();
        _safeMint(_to, newTokenId);

        return newTokenId;
    }

    /**
     * @notice Checks if a specific interface is supported by this contract.
     * @param interfaceId The interface identifier to check.
     * @return True if the interface is supported, false otherwise.
     */
    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override(ERC721Enumerable, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    /**
     * @notice Retrieves the collection-level metadata URI for this contract.
     * @return collectionUri The URI string pointing to the contract metadata.
     */
    function contractURI() public view returns (string memory) {
        return collectionUri;
    }

    /**
     * @notice Retrieves the token-level metadata URI for a specific NFT.
     * @param _tokenId ID of the NFT to retrieve metadata for.
     * @return URI string pointing to the token's metadata.
     */
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(baseUri, _tokenId.toString(), ".json"));
    }

    /**
     * @notice Retrieves the total number of minted NFTs.
     * @return Total count of minted NFTs.
     */
    function totalSupply() public view override returns (uint256) {
        return nftCount.current();
    }

    // function contractURI() public pure returns (string memory) {
    //     string memory json = '{"name":"Command+AAA","description":"This is test command+aaa
    // collection","external_url":"https://openseacreatures.io/3","image":"https://i.seadn.io/gcs/files/fd08b4a340be10b6af307d7f68542976.png","banner":"https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png","seller_fee_basis_points":100,"fee_recipient":"0xb10bcC8B508174c761CFB1E7143bFE37c4fBC3a1"}';
    //     return string.concat("data:application/json;utf8,", json);
    // }

    // function transferOwnership(address _oldOwner, address _newOwner) public {
    //     require(msg.sender == FACTORY, "transferOwnership: caller is not factory contract");

    //     uint256 countOfTokens = balanceOf(_oldOwner);

    //     uint256[] memory _tokensOfOwner = new uint256[](countOfTokens);

    //     for (uint256 i; i < countOfTokens; ++i) {
    //         _tokensOfOwner[i] = tokenOfOwnerByIndex(_oldOwner, i);
    //     }

    //     for (uint256 i; i < countOfTokens; ++i) {
    //         transferFrom(_oldOwner, _newOwner, _tokensOfOwner[i]);
    //     }
    // }

    /*//////////////////////////////////////////////////////////////
                                INTERNAL
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Hook function called before transferring tokens.
     * @param from Address transferring the tokens.
     * @param to Address receiving the tokens.
     * @param firstTokenId ID of the first token being transferred.
     * @param batchSize Number of tokens being transferred in the batch.
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    )
        internal
        virtual
        override(ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    /*//////////////////////////////////////////////////////////////
                                PRIVATE
    //////////////////////////////////////////////////////////////*/

    /**
     * @dev Internal function to generate the next token ID for minting.
     * @return newTokenId_ The next available token ID.
     */
    function __getNextTokenId() private returns (uint256 newTokenId_) {
        nftCount.increment();
        newTokenId_ = nftCount.current();
    }
}
