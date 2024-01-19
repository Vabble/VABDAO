// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

// TODO - N5 we need royalty(like in Opensea) in the future
contract VabbleNFT is ERC2981, ERC721Enumerable, ReentrancyGuard {    
    
    using Counters for Counters.Counter;
    using Strings for uint256;

    Counters.Counter private nftCount;
    string public baseUri;                     // Base URI      
    string public collectionUri;               // Collection URI   

    address public immutable FACTORY;

    receive() external payable {}
    constructor(
        string memory _baseUri,
        string memory _collectionUri,
        string memory _name,
        string memory _symbol,
        address _factory
    ) ERC721(_name, _symbol) {
        baseUri = _baseUri;
        collectionUri = _collectionUri;
        FACTORY = _factory;
    }
    
    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal virtual override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }  

    function contractURI() public view returns (string memory) {
        return collectionUri;
    }

    // function contractURI() public pure returns (string memory) {
    //     string memory json = '{"name":"Command+AAA","description":"This is test command+aaa collection","external_url":"https://openseacreatures.io/3","image":"https://i.seadn.io/gcs/files/fd08b4a340be10b6af307d7f68542976.png","banner":"https://storage.googleapis.com/opensea-prod.appspot.com/puffs/3.png","seller_fee_basis_points":100,"fee_recipient":"0xb10bcC8B508174c761CFB1E7143bFE37c4fBC3a1"}';
    //     return string.concat("data:application/json;utf8,", json);
    // }
    function mintTo(address _to) public payable nonReentrant returns (uint256) {
        // TODO - N2 updated(remove msg.sender != address(0))
        require(msg.sender == FACTORY, "mintTo: caller is not factory contract");
        
        uint256 newTokenId = __getNextTokenId();
        _safeMint(_to, newTokenId);
        
        return newTokenId;
    }

    /// @dev Generate tokenId(film nft=>odd, subscription nft=>even)
    function __getNextTokenId() private returns (uint256 newTokenId_) {        
        nftCount.increment();
        newTokenId_ = nftCount.current();
    }

    /// @notice Set tokenURI in all available cases
    function tokenURI(uint256 _tokenId) public view virtual override returns (string memory) {
        require(_exists(_tokenId), "ERC721Metadata: URI query for nonexistent token");

        return string(abi.encodePacked(baseUri, _tokenId.toString(), ".json"));
    }

    function transferNFT(uint256 _tokenId, address _to) external {        
        address seller = ownerOf(_tokenId);
        transferFrom(seller, _to, _tokenId);
    }

    function userTokenIdList(address _owner) external view returns (uint256[] memory _tokensOfOwner) {
        _tokensOfOwner = new uint256[](balanceOf(_owner));
        for (uint256 i; i < balanceOf(_owner); ++i) {
            _tokensOfOwner[i] = tokenOfOwnerByIndex(_owner, i);
        }
    }
    
    /// @notice Return total minited NFT count
    function totalSupply() public view override returns (uint256) {
        return nftCount.current();
    }
}