// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "../interfaces/IVabbleDAO.sol";
import "./Helper.sol";

library VabbleDAOUtils {
    function getUserRewardAmountBetweenMonthsForUser (
        uint256 _filmId, 
        uint256 _preMonth, 
        uint256 _curMonth, 
        address _user,
        mapping(uint256 => mapping(uint256 => mapping(address => uint256))) storage finalizedAmount
    ) internal view returns (uint256 amount_) {
        if(_preMonth < _curMonth) {
            for(uint256 mon = _preMonth + 1; mon <= _curMonth; mon++) {
                amount_ += finalizedAmount[mon][_filmId][_user];
            }                   
        }
    }

    function getAllAvailableRewards(
        uint256[] memory filmIds, 
        uint256 _curMonth,
        mapping(uint256 => mapping(address => uint256)) storage latestClaimMonthId,
        mapping(uint256 => mapping(uint256 => mapping(address => uint256))) storage finalizedAmount
    ) internal view returns (uint256 reward_) {
        uint256 rewardSum;
        uint256 preMonth;
        for(uint256 i = 0; i < filmIds.length; i++) {  
            preMonth = latestClaimMonthId[filmIds[i]][msg.sender];
            rewardSum += getUserRewardAmountBetweenMonthsForUser(filmIds[i], preMonth, _curMonth, msg.sender, finalizedAmount);                        
        }

        reward_ = rewardSum;
    }

    // function getUserFilmListForMigrate(
    //     address _user,
    //     mapping(address => uint256[]) storage userApprovedFilmIds,
    //     mapping(uint256 => IVabbleDAO.Film) storage filmInfo
    // ) internal view returns (IVabbleDAO.Film[] memory filmList_) {   
    //     IVabbleDAO.Film memory fInfo;
    //     uint256[] memory ids = userApprovedFilmIds[_user];
    //     require(ids.length > 0, "migrate: no film");

    //     filmList_ = new IVabbleDAO.Film[](ids.length);
    //     for(uint256 i = 0; i < ids.length; i++) {             
    //         fInfo = filmInfo[ids[i]];
    //         require(fInfo.studio == _user, "migrate: not film owner");

    //         if(fInfo.status == Helper.Status.APPROVED_FUNDING || fInfo.status == Helper.Status.APPROVED_LISTING) {
    //             filmList_[i] = fInfo;
    //         }
    //     }
    // } 

    function checkSetFinalFilms(
        uint256[] calldata _filmIds,
        uint256 fPeriod,
        mapping(uint256 => uint256) storage finalFilmCalledTime
    ) internal view returns (bool[] memory _valids) {
        _valids = new bool[](_filmIds.length);

        for (uint256 i = 0; i < _filmIds.length; i++) {
            if (finalFilmCalledTime[_filmIds[i]] > 0) {
                _valids[i] = block.timestamp - finalFilmCalledTime[_filmIds[i]] >= fPeriod;                
            } else {
                _valids[i] = true;
            }
        }        
    }
}
