// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IFactoryFilmNFT {  

    function getMintInfo(uint256 _filmId) external view 
    returns (
        uint256 tier_,
        uint256 maxMintAmount_,
        uint256 mintPrice_,
        address nft_,
        address studio_
    );

    function getTotalSupply(uint256 _filmId) external view returns (uint256);
}
