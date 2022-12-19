// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract VabbleNFT is ERC721, ERC721Enumerable {    
    
    using Counters for Counters.Counter;
    using Strings for uint256;

    address private OWNABLE;         // Ownablee contract address
    address private STAKING_POOL;    // StakingPool contract address
    address private UNI_HELPER;      // UniHelper contract address
    address private DAO_PROPERTY;    // Property contract address
    address private VABBLE_DAO;      // VabbleDAO contract address
    address private VAB_WALLET;      // Vabble wallet
    address private SUBSCRIPTION;    // Subscription contract address 

    Counters.Counter private nftCount;
    string public baseUri;                     // Base URI       

    receive() external payable {}
    constructor(
        address _ownableContract,
        address _stakingContract,
        address _uniHelperContract,
        address _daoProperty,
        address _daoContract,   
        address _subscriptionContract,     
        address _vabbleWallet,
        string memory _baseUri,
        string memory _name,
        string memory _symbol
    ) ERC721(_name, _symbol) {
        OWNABLE = _ownableContract;  
        STAKING_POOL = _stakingContract;
        UNI_HELPER = _uniHelperContract;
        DAO_PROPERTY = _daoProperty; 
        VABBLE_DAO = _daoContract;   
        SUBSCRIPTION = _subscriptionContract;
        VAB_WALLET = _vabbleWallet; 
        baseUri = _baseUri;
    }

    function supportsInterface(bytes4 interfaceId) public view virtual override(ERC721Enumerable, ERC721) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 tokenId
    ) internal virtual override(ERC721Enumerable, ERC721) {
        super._beforeTokenTransfer(from, to, tokenId);
    }    

    function mintTo(address _to) public payable returns (uint256) {
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

        // If there is a baseURI, concatenate the tokenID to the baseURI.
        return string(abi.encodePacked(baseUri, _tokenId.toString(), ".json"));
    }

    function transferNFT(uint256 _tokenId, address _to) external {        
        address seller = ownerOf(_tokenId);
        transferFrom(seller, _to, _tokenId);
    }

    function userTokenIdList(address _owner) external view returns (uint256[] memory _tokensOfOwner) {
        _tokensOfOwner = new uint256[](balanceOf(_owner));
        for (uint256 i; i < balanceOf(_owner); i++) {
            _tokensOfOwner[i] = tokenOfOwnerByIndex(_owner, i);
        }
    }
    
    /// @notice Return total minited NFT count
    function totalSupply() public view override returns (uint256) {
        return nftCount.current();
    }
}