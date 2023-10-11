// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IFactoryFilmNFT {    
    function getMintInfo(uint256 _filmId) external view 
    returns (
        uint256 tier_,
        uint256 maxMintAmount_,
        uint256 mintPrice_,
        uint256 feePercent_,
        uint256 revenuePercent_,
        address nft_,
        address studio_
    );

    function getFilmNftTokenIdList(uint256 _filmId, address _user) external view returns (uint256[] memory);

    function getRaisedAmountByNFT(uint256 _filmId) external view returns (uint256);
}
