// SPDX-License-Identifier: GPL-3.0-or-later

pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

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
}
