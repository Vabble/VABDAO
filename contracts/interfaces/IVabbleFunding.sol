// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import "../libraries/Helper.sol";

interface IVabbleFunding {   

    function isRaisedFullAmount(uint256 _filmId) external view returns (bool);

    function getRaisedAmountByToken(uint256 _filmId) external view returns (uint256 amount_);

    function getUserFundAmountPerFilm(address _customer, uint256 _filmId) external view returns (uint256 amount_);
}
