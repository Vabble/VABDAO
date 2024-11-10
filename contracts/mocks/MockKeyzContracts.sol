// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract ETHReceiver {
    receive() external payable {}
}

contract MockVabbleToken is ERC20 {
    address payable public ethReceiver;

    constructor(address payable _ethReceiver) ERC20("Vabble", "VAB") {
        _mint(msg.sender, 1000000 * 10 ** decimals());
        ethReceiver = _ethReceiver;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    receive() external payable {
        (bool success, ) = ethReceiver.call{value: msg.value}("");
        require(success, "ETH transfer failed");
    }
}

contract MockUniswapRouter {
    address public immutable WETH;
    address payable public immutable vabbleToken;

    event PathCheck(address[] path);
    event Debug(string message, address addr1, address addr2);

    constructor(address payable _vabbleToken, address _weth) {
        require(_vabbleToken != address(0), "Invalid vabble token");
        require(_weth != address(0), "Invalid WETH");
        vabbleToken = _vabbleToken;
        WETH = _weth;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory) {
        require(path.length == 2, "Invalid path length");
        require(path[0] == WETH, "First token must be WETH");
        require(path[1] == address(vabbleToken), "Second token must be VAB");

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
    ) external payable returns (uint256[] memory amounts) {
        require(msg.value > 0, "Must send ETH");
        require(deadline >= block.timestamp, "Expired");
        require(path.length == 2, "Invalid path length");
        require(path[0] == WETH, "First token must be WETH");
        require(path[1] == address(vabbleToken), "Second token must be VAB");

        uint256 amountOut = msg.value * 2;
        require(amountOut >= amountOutMin, "Insufficient output amount");

        MockVabbleToken(vabbleToken).mint(to, amountOut);

        amounts = new uint256[](2);
        amounts[0] = msg.value;
        amounts[1] = amountOut;

        return amounts;
    }

    receive() external payable {}
}

contract MockStakingPool {
    IERC20 public immutable vabbleToken;

    constructor(address _vabbleToken) {
        require(_vabbleToken != address(0), "Invalid vabble token");
        vabbleToken = IERC20(_vabbleToken);
    }

    function addRewardToPool(uint256 amount) external {
        require(vabbleToken.transferFrom(msg.sender, address(this), amount), "Transfer failed");
    }
}

contract MockUniHelper {
    address public immutable WETH;
    address payable public immutable vabbleToken;

    constructor(address payable _vabbleToken, address _weth) {
        require(_vabbleToken != address(0), "Invalid vabble token");
        require(_weth != address(0), "Invalid WETH");
        WETH = _weth;
        vabbleToken = _vabbleToken;
    }

    function getAmountsOut(uint256 amountIn, address[] calldata path) external view returns (uint256[] memory) {
        require(path.length == 2, "Invalid path length");
        require(path[0] == WETH, "First token must be WETH");
        require(path[1] == address(vabbleToken), "Second token must be VAB");

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountIn * 2;
        return amounts;
    }
}
