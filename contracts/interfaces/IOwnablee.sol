// SPDX-License-Identifier: MIT

pragma solidity ^0.8.4;

interface IOwnablee {  
    function auditor() external view returns (address);

    function replaceAuditor(address _newAuditor) external;
    
    function isDepositAsset(address _asset) external view returns (bool);
    
    function getDepositAssetList() external view returns (address[] memory);

    function VAB_WALLET() external view returns (address);
    
    function USDC_TOKEN() external view returns (address);

    function PAYOUT_TOKEN() external view returns (address);

    function addToStudioPool(uint256 _amount) external;
}
