// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

// theirs
import "openzeppelin-solidity/contracts/token/ERC20/IERC20.sol";
import "openzeppelin-solidity/contracts/token/ERC20/utils/SafeERC20.sol";
import "abdk-libraries-solidity/ABDKMathQuad.sol";
import "hardhat/console.sol";
// interfaces
import "./interfaces/ICSAmm.sol";
// mocks
import "./mocks/Token.sol";

/**
    CONSTANT SUM AMM
 */
contract CSAmm is ICSAmm, ERC20 {
    using SafeERC20 for IERC20;
    using ABDKMathQuad for uint256;
    uint256 public reserve0;
    uint256 public reserve1;
    uint256 public liquidityInvariant;

    uint256 public immutable fee;
    uint256 public accumulatedFee0;
    uint256 public accumulatedFee1;

    Token public immutable token0;
    Token public immutable token1;

    constructor(uint256 _fee, address _to) ERC20("AMM_LP", "LP") {
        token0 = new Token("TOKEN0", "TK0", _to);
        token1 = new Token("TOKEN1", "TK1", _to);
        fee = _fee;
    }

    /// @param _amount0 uint256 of token0 to add to the pool's reserve0
    /// @param _amount1 uint256 of token1 to add to the pool's reserve1
    /// liquidityInvariant = (reserve0 + _amount0) + (reserve1 + _amount1)
    function addLiquidity(uint256 _amount0, uint256 _amount1) external {
        // transfers the (_amount0, _amount1) of (token0, token1) from msg.sender to the pool
        IERC20(token0).transferFrom(msg.sender, address(this), _amount0);
        IERC20(token1).transferFrom(msg.sender, address(this), _amount1);
        // updates the reserves
        reserve0 = IERC20(token0).balanceOf(address(this));
        reserve1 = IERC20(token1).balanceOf(address(this));

        // reserve0 + reserve1 is the updated `liquidityInvariant`
        // providedLiquidity = updatedLiquidityInvariant - previousLiquidityInvariant
        _mint(msg.sender, reserve0 + reserve1 - liquidityInvariant);
        // updates the liquidityInvariant
        liquidityInvariant = reserve0 + reserve1;
    }

    // TODO: you will need to check for underflows later!
    // TODO: add reentrancy guard
    /// @param _amount uint256 _amount of LP to burn
    function removeLiquidity(uint256 _amount) external {
        /**
            liquidity providers should always be able to redeem their liquidity regardless of the balances in the pool (given that it is a constant-sum AMM, it is assumed that the ratio is always ~ 1:1)

            three cases:
            1) both reserves are greater than the lp to be redeemed (reserve0 >= lpAmount AND reserve1 >= lpAmount):
                redeemedToken0 = lpAmount / 2
                redeemedToken1 = lpAmount / 2
            2) reserve0 < lpAmount but reserve1 > lpAmount:
                redeemedToken0 = (lpAmount / 2) - |reserve0 - lpAmount / 2|
                redeemedToken1 = (lpAmount / 2) + redeemedToken0
            3) reserve0 > lpAmount but reserve1 > lpAmount:
                redeemedToken0 = (lpAmount / 2) + redeemedToken1
                redeemedToken1 = |reserve1 - lpAmount / 2|        
         */

        (bool isReserve0Gt, uint256 absDiff0) = _typedAbsSub(reserve0, _amount / 2);
        (bool isReserve1Gt, uint256 absDiff1) = _typedAbsSub(reserve1, _amount / 2);

        _burn(msg.sender, _amount);

        IERC20(token0).safeTransfer(
            msg.sender,
            isReserve0Gt ? isReserve1Gt ? _amount / 2 : absDiff1 + (_amount / 2) : (_amount / 2) - absDiff0
        );
        IERC20(token1).safeTransfer(
            msg.sender,
            isReserve1Gt ? isReserve0Gt ? _amount / 2 : absDiff0 + (_amount / 2) : (_amount / 2) - absDiff1
        );
        reserve0 = IERC20(token0).balanceOf(address(this));
        reserve1 = IERC20(token1).balanceOf(address(this));
        liquidityInvariant = reserve0 + reserve1;
    }

    /// @param _token address of the pool's token to swapped
    /// -> if _token === token0 then -> swap token0 for token1
    ///     liquidityInvariant - (reserve0 + _amount0) = reserve1
    /// -> if _token === token1 then -> swap token1 for token0
    ///     liquidityInvariant - (reserve1 + _amount1) = reserve0
    /// @param _amount of _token to be sold to the pool
    function swap(address _token, uint256 _amount) external {
        require(_token == address(token0) || _token == address(token1), "unsupported token");

        uint256 _reserve0;
        uint256 _reserve1;
        IERC20(_token).transferFrom(msg.sender, address(this), _amount);

        if (_token == address(token0)) {
            uint256 _swappedToken1;
            (_reserve0, _reserve1, _swappedToken1) = _swapMath(liquidityInvariant, _amount, reserve0, reserve1);
            // users sends uint256 _amount of token0 and receives uint256 _swappedToken1 of token1
            uint256 _fee = fee > 0 ? _mulDiv(_swappedToken1, fee, 10000) : 0;
            accumulatedFee1 += _fee;
            IERC20(token1).safeTransfer(msg.sender, _swappedToken1 - _fee);
        } else {
            uint256 _swappedToken0;
            (_reserve1, _reserve0, _swappedToken0) = _swapMath(liquidityInvariant, _amount, reserve1, reserve0);
            // users sends uint256 _amount of token1 and receives uint256 _swappedToken0 of token0
            uint256 _fee = fee > 0 ? _mulDiv(_swappedToken0, fee, 10000) : 0;
            accumulatedFee0 += _fee;
            IERC20(token0).safeTransfer(msg.sender, _swappedToken0 - _fee);
        }
        reserve0 = token0.balanceOf(address(this));
        reserve1 = token1.balanceOf(address(this));
        // we update the liquidityInvariant as well to ensure it doesn't diverge too much from the x + k ratio due to the fee
        // it is assumed to be safe to update it because we already asserted that the swap operation complied with the x + k = liquidityInvariant in the _swapMath function
        liquidityInvariant = reserve0 + reserve1;
    }

    function _mulDiv(
        uint256 x,
        uint256 y,
        uint256 z
    ) private pure returns (uint256) {
        return
            ABDKMathQuad.toUInt(
                ABDKMathQuad.div(
                    ABDKMathQuad.mul(ABDKMathQuad.fromUInt(x), ABDKMathQuad.fromUInt(y)),
                    ABDKMathQuad.fromUInt(z)
                )
            );
    }

    function _typedAbsSub(uint256 _x, uint256 _y) private pure returns (bool, uint256) {
        return (_x > _y, _x > _y ? _x - _y : _y - _x);
    }

    /// @dev liquidityInvariantK = (_amountX + _reserveX) + _reserveY
    /// @dev we solve the equation for the Y variable
    /// @notice the function is also responsible for asserting that the x + k invariant holds with the current values
    function _swapMath(
        uint256 liquidityK,
        uint256 _amountX,
        uint256 _reserveX,
        uint256 _reserveY
    )
        private
        pure
        returns (
            uint256,
            uint256,
            uint256
        )
    {
        // x + y = k => (x + dx) + (y - dy) = k
        // x + y = k => y = k - x
        uint256 prevReserveY = _reserveY;
        // new _reserveX value
        uint256 updatedReserveX = _amountX + _reserveX;
        // new _reserveY value
        uint256 updatedReserveY = liquidityK - updatedReserveX;
        uint256 swappedY = prevReserveY - updatedReserveY; // the amount of Y to be swapped
        // checks if the x + y = k invariant still holds
        require(updatedReserveX + updatedReserveY == liquidityK, "broken invariant K");
        return (updatedReserveX, updatedReserveY, swappedY);
    }
}
