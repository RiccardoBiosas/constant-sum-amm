pragma solidity 0.8.10;

import "../CSAmm.sol";
import "../mocks/Token.sol";

contract EchidnaCSAmm {
    CSAmm public amm;
    Token public token0;
    Token public token1;

    constructor() {
        amm = new CSAmm(0, address(this), 18, 6);
        token0 = Token(amm.token0());
        token1 = Token(amm.token1());
    }

    function addLiquidityToAmm(uint256 _amount0, uint256 _amount1) public {
        token0.approve(address(amm), _amount0);
        token1.approve(address(amm), _amount1);
        amm.addLiquidity(_amount0, _amount1);
    }

    function removeLiquidityFromToAmm(uint256 _amount) public {
        amm.removeLiquidity(_amount);
    }

    function swapToken0(uint256 _amount) public {
        token0.approve(address(amm), _amount);
        amm.swap(address(token0), _amount);
    }

    function swapToken1(uint256 _amount) public {
        token1.approve(address(amm), _amount);
        amm.swap(address(token1), _amount);
    }

    /// @dev sanity check to ensures that the fuzzer is running correctly
    function sanityCheck() public pure returns (bool) {
        return true;
    }

    /// @dev echidna test to ensure that the pool's invariant is always equal to the sum of its reserves
    function echidna_testLiquidityInvariant() public view returns (bool) {
        uint256 sum = amm.reserve0() + amm.reserve1();
        return sum == amm.liquidityInvariant();
    }
}
