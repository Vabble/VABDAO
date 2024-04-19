pragma solidity ^0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MockUSDT is Ownable, ERC20 {
    // uint256 SUPPLY = 1456250000 * 10**18; // VAB
    // uint256 SUPPLY = 5000000 * 10**18; // WMATIC
    uint256 SUPPLY = 1000000 * 10**6; // USDC

    uint256 public constant faucetLimit = 5000 * 10**6;

    constructor(string memory _name_, string memory _symbol_) ERC20(_name_, _symbol_) {
        _mint(msg.sender, SUPPLY);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function faucet(uint256 _amount) external {
        require(_amount <= faucetLimit, "Faucet limit error");
        _mint(msg.sender, _amount);
    }
}