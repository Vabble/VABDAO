// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

interface IVabbleDAO {    
    function getUserAmount(address _user) external view returns(uint256 amount_);

    function getProposalFilmIds() external view returns(uint256[] memory);

    function approveFilm(uint256 _filmId, bool _noFund) external;

    function isForFund(uint256 _filmId) external view returns (bool);
}
