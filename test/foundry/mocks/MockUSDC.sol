// SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

import { console } from "lib/forge-std/src/console.sol";

import { ERC20 } from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

error AddressBlacklisted(address account);

contract MockUSDC is ERC20 {
    address public immutable i_owner;
    mapping(address => bool) private _blacklist;

    ////////////////////////////////////////////
    /////////////// Modifiers //////////////////
    ////////////////////////////////////////////

    modifier onlyOwner() {
        require(msg.sender == i_owner, "Not the owner!");
        _;
    }

    modifier notBlacklisted(address account) {
        if (_blacklist[account]) {
            revert AddressBlacklisted(account);
        }
        _;
    }

    ////////////////////////////////////////////
    /////////////// Events /////////////////////
    ////////////////////////////////////////////

    event Blacklisted(address indexed account);
    event Whitelisted(address indexed account);

    ////////////////////////////////////////////
    /////////////// Functions //////////////////
    ////////////////////////////////////////////

    constructor() ERC20("USDC Coin", "USDC") {
        i_owner = msg.sender;
        // _mint(msg.sender, 1_000_000e6);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address account, uint256 amount) external {
        _mint(account, amount);
    }

    ////////////////////////////////////////////
    /////// Blacklisting functionality /////////
    ////////////////////////////////////////////

    function addToBlacklist(address account) external onlyOwner {
        _blacklist[account] = true;
        emit Blacklisted(account);
    }

    function removeFromBlacklist(address account) external onlyOwner {
        _blacklist[account] = false;
        emit Whitelisted(account);
    }

    ////////////////////////////////////////////
    /////// Transfer functions /////////////////
    ////////////////////////////////////////////

    function transfer(
        address recipient,
        uint256 amount
    )
        public
        override
        notBlacklisted(msg.sender)
        notBlacklisted(recipient)
        returns (bool)
    {
        return super.transfer(recipient, amount);
    }

    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    )
        public
        override
        notBlacklisted(sender)
        notBlacklisted(recipient)
        returns (bool)
    {
        return super.transferFrom(sender, recipient, amount);
    }
}
