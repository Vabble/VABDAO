// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
    // "https://game.example/api/item/{id}.json"
    string private _uri_ = "https://opensea-creatures-api.herokuapp.com/api/creature/{id}.json";

    constructor() ERC1155(_uri_) {
        _mint(msg.sender, 1, 10**18, "Kitty");
        _mint(msg.sender, 2, 10**18, "Dog");
        _mint(msg.sender, 3, 10**18, "Dolphin");
    }
}
