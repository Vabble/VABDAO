// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IRentFilm {    
    function getUserAmount(address _user) external view returns(uint256 amount_);

    function getProposalFilmIds() external view returns(uint256[] memory);

    function approveFilm(uint256 _filmId) external;
}
