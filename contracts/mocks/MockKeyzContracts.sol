// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ETHReceiver {
    fallback() external payable {}

    receive() external payable {}
}

contract MockVabbleToken is ERC20 {
    constructor() ERC20("Vabble", "VAB") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MockUniswapRouter {
    address public immutable WETH_ADDRESS; // Renamed from WETH
    address public immutable vabToken;

    constructor(address _vabToken, address _weth) {
        require(_vabToken != address(0), "Invalid VAB token");
        require(_weth != address(0), "Invalid WETH");
        vabToken = _vabToken;
        WETH_ADDRESS = _weth;
    }

    // This function name stays the same as it's part of the interface
    function WETH() external view returns (address) {
        return WETH_ADDRESS;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory) {
        require(path.length == 2, "Invalid path length");
        require(path[0] == WETH_ADDRESS, "First token must be WETH");
        require(path[1] == vabToken, "Second token must be VAB");

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 2;
        return amounts;
    }

    function swapExactETHForTokens(
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external payable returns (uint256[] memory) {
        require(msg.value > 0, "Must send ETH");
        require(deadline >= block.timestamp, "Expired");
        require(path.length == 2, "Invalid path length");
        require(path[0] == WETH_ADDRESS, "First token must be WETH");
        require(path[1] == vabToken, "Second token must be VAB token");

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = msg.value;
        amounts[1] = msg.value * 2; // 2x conversion rate

        require(amounts[1] >= amountOutMin, "Insufficient output amount");

        // Mint VAB tokens to recipient
        MockVabbleToken(vabToken).mint(to, amounts[1]);

        return amounts;
    }

    receive() external payable {}
}

contract MockStakingPool {
    IERC20 public immutable vabToken;

    constructor(address _vabToken) {
        require(_vabToken != address(0), "Invalid VAB token");
        vabToken = IERC20(_vabToken);
    }

    function addRewardToPool(uint256 amount) external {
        require(vabToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}

contract MockUniHelper {
    address public immutable WETH_ADDRESS;
    address public immutable vabToken;

    constructor(address _vabToken, address _weth) {
        require(_vabToken != address(0), "Invalid VAB token");
        require(_weth != address(0), "Invalid WETH");
        WETH_ADDRESS = _weth;
        vabToken = _vabToken;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory) {
        require(path.length == 2, "Invalid path length");
        require(path[0] == WETH_ADDRESS, "First token must be WETH");
        require(path[1] == vabToken, "Second token must be VAB");

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 2;
        return amounts;
    }

    receive() external payable {}
}
