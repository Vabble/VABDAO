// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVabbleFund {   
        
    function getTotalFundAmountPerFilm(uint256 _filmId) external view returns (uint256 amount_);

    function getUserFundAmountPerFilm(address _customer, uint256 _filmId) external view returns (uint256 amount_);

    function isRaisedFullAmount(uint256 _filmId) external view returns (bool);

    function getFilmInvestorList(uint256 _filmId) external view returns (address[] memory);

    function getAllowUserNftCount(uint256 _filmId, address _user) external view returns (uint256);
}
