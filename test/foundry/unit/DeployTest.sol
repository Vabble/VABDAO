// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { BaseTest, console } from "../utils/BaseTest.sol";

contract DeployTest is BaseTest {
    function test_deploy() public view {
        console.log("CHAIN ID", block.chainid);
        // console.log("Mocked USDC address", address(usdc));
        // console.log("Mocked VAB address", address(vab));
        // console.log("Deployer address", address(deployer));
        // console.log("Auditor address", address(auditor));
        // console.log("ownablee address", address(ownablee));

        assertEq(address(auditor), ownablee.auditor());
        assertEq(address(vabWallet), ownablee.VAB_WALLET());
        assertEq(address(vab), ownablee.PAYOUT_TOKEN());
        assertEq(address(usdc), ownablee.USDC_TOKEN());
        assertEq(usdc.decimals(), 6);
    }
}
