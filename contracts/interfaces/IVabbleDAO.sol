// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../libraries/Helper.sol";

interface IVabbleDAO {    
    function getFilmById(uint256 _filmId) external view 
    returns (
        address[] memory studioPayees_, 
        uint256[] memory sharePercents_, 
        uint256 rentPrice_,
        uint256 rentStartTime_,
        uint256 raiseAmount_,
        uint256 fundPeriod_,
        uint256 fundStart_,
        address studio_,
        bool onlyAllowVAB_,
        Helper.Status status_
    );

    function getFilmStatusById(uint256 _filmId) external view returns (Helper.Status status_);

    function getUserAmount(address _user) external view returns(uint256 amount_);

    function getProposalFilmIds() external view returns(uint256[] memory);

    // function getRaisedAmountPerFilm(uint256 _filmId) external view returns (uint256 amount_);

    function approveFilm(uint256 _filmId, bool _noFund) external;

    function isForFund(uint256 _filmId) external view returns (bool);

    function isRaisedFullAmount(uint256 _filmId) external view returns (bool);

    function lastfundProposalCreateTime() external view returns(uint256);

    function proposalFeeAmount() external view returns(uint256);

    function addReward(uint256 _amount) external;
}
