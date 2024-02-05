// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.4;

// import "../interfaces/IVabbleDAO.sol";
// import "./Helper.sol";

library VabbleDAOUtils {
    // function getUserRewardAmountBetweenMonthsForUser (
    //     uint256 _filmId, 
    //     uint256 _preMonth, 
    //     uint256 _curMonth, 
    //     address _user,
    //     mapping(uint256 => mapping(uint256 => mapping(address => uint256))) storage finalizedAmount
    // ) internal view returns (uint256 amount_) {
    //     if(_preMonth < _curMonth) {
    //         for(uint256 mon = _preMonth + 1; mon <= _curMonth; ++mon) {
    //             amount_ += finalizedAmount[mon][_filmId][_user];
    //         }                   
    //     }
    // }

    // function getAllAvailableRewards(
    //     uint256[] memory filmIds, 
    //     uint256 _curMonth,
    //     mapping(uint256 => mapping(address => uint256)) storage latestClaimMonthId,
    //     mapping(uint256 => mapping(uint256 => mapping(address => uint256))) storage finalizedAmount
    // ) internal view returns (uint256 reward_) {
    //     uint256 rewardSum;
    //     uint256 preMonth;
    //     uint256 filmLength = filmIds.length;
    //     for(uint256 i = 0; i < filmLength; ++i) {  
    //         preMonth = latestClaimMonthId[filmIds[i]][msg.sender];
    //         rewardSum += getUserRewardAmountBetweenMonthsForUser(filmIds[i], preMonth, _curMonth, msg.sender, finalizedAmount);                        
    //     }

    //     reward_ = rewardSum;
    // }

    // function updateFinalizeAmountAndLastClaimMonth (
    //     uint256 _filmId, 
    //     uint256 _curMonth, 
    //     address _oldOwner,
    //     address _newOwner,
    //     mapping(uint256 => mapping(address => uint256)) storage latestClaimMonthId,
    //     mapping(uint256 => mapping(uint256 => mapping(address => uint256))) storage finalizedAmount
    // ) internal {
    //     uint256 _preMonth = latestClaimMonthId[_filmId][_oldOwner];

    //     // update last claim month for newOwner
    //     latestClaimMonthId[_filmId][_newOwner] = _preMonth;
        
    //     if(_preMonth < _curMonth) {
    //         for(uint256 mon = _preMonth + 1; mon <= _curMonth; ++mon) {
    //             // set finalizedAmount for new owner
    //             finalizedAmount[mon][_filmId][_newOwner] = finalizedAmount[mon][_filmId][_oldOwner];

    //             // set 0 for old owner
    //             finalizedAmount[mon][_filmId][_oldOwner] = 0;
    //         }                   
    //     }
        
    // }

    // function getUserFilmListForMigrate(
    //     address _user,
    //     mapping(address => uint256[]) storage userApprovedFilmIds,
    //     mapping(uint256 => IVabbleDAO.Film) storage filmInfo
    // ) internal view returns (IVabbleDAO.Film[] memory filmList_) {   
    //     IVabbleDAO.Film memory fInfo;
    //     uint256[] memory ids = userApprovedFilmIds[_user];
    //     require(ids.length != 0, "migrate: no film");

    //     filmList_ = new IVabbleDAO.Film[](ids.length);
    //     for(uint256 i = 0; i < ids.length; ++i) {             
    //         fInfo = filmInfo[ids[i]];
    //         require(fInfo.studio == _user, "migrate: not film owner");

    //         if(fInfo.status == Helper.Status.APPROVED_FUNDING || fInfo.status == Helper.Status.APPROVED_LISTING) {
    //             filmList_[i] = fInfo;
    //         }
    //     }
    // } 

    // function checkSetFinalFilms(
    //     uint256[] calldata _filmIds,
    //     uint256 fPeriod,
    //     mapping(uint256 => uint256) storage finalFilmCalledTime
    // ) internal view returns (bool[] memory _valids) {
    //     _valids = new bool[](_filmIds.length);

    //     uint256 filmLength = _filmIds.length;
    //     for (uint256 i = 0; i < filmLength; ++i) {
    //         if (finalFilmCalledTime[_filmIds[i]] != 0) {
    //             _valids[i] = block.timestamp - finalFilmCalledTime[_filmIds[i]] >= fPeriod;                
    //         } else {
    //             _valids[i] = true;
    //         }
    //     }        
    // }
}
