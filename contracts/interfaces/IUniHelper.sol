// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

/// @notice Interface for Helper
interface IUniHelper {

    function expectedAmount(uint256 _depositAmount, address _incomingAsset) external view returns (uint256 amount_);

}
