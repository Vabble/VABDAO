// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../libraries/Helper.sol";

interface IVabbleDAO {    
    // function getFilmById(uint256 _filmId) external view 
    // returns (
    //     uint256[] memory nftRight_,
    //     uint256[] memory sharePercents_,
    //     address[] memory choiceAuditor_,
    //     address[] memory studioPayees_,
    //     uint256 rentPrice_       
    // );

    function getFilmFund(uint256 _filmId) external view returns (uint256 raiseAmount_, uint256 fundPeriod_, uint256 fundType_);

    function getFilmStatus(uint256 _filmId) external view returns (Helper.Status status_);
    
    function getFilmOwner(uint256 _filmId) external view returns (address owner_);

    function getFilmProposalTime(uint256 _filmId) external view returns (uint256 cTime_, uint256 aTime_);

    function setFilmProposalApproveTime(uint256 _filmId, uint256 _time) external;

    function getUserAmount(address _user) external view returns(uint256 amount_);

    function getFilmIds(uint256 _flag) external view returns(uint256[] memory);

    function approveFilm(uint256 _filmId) external;

    function isRaisedFullAmount(uint256 _filmId) external view returns (bool);

    function getRaisedAmountByToken(uint256 _filmId) external view returns (uint256 amount_);

    function getUserFundAmountPerFilm(address _customer, uint256 _filmId) external view returns (uint256 amount_);
}
