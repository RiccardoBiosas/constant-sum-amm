// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

// theirs
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
// interfaces
import "./interfaces/ICSAmm.sol";
// mocks
import "./mocks/Token.sol";

/**
    CONSTANT SUM AMM
 */
contract CSAmm is ICSAmm {
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public liquidityInvariant;
    uint256 public fee;

    Token public immutable token0;
    Token public immutable token1;

    constructor(uint256 _fee, address _to) {
        token0 = new Token("TOKEN0", "TK0", _to);
        token1 = new Token("TOKEN1", "TK1", _to);
        fee = _fee;
    }

    function addLiquidity(uint256 _amount0, uint256 _amount1) external {}

    function removeLiquidity(uint256 _amount) external {}

    function swap(address _token, uint256 _amount) external {}
}
