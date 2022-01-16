// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

/**
    - addLiquidity
    - removeLiquidity
    - swap
 */

interface ICSAmm {
    function addLiquidity(uint256 _amount0, uint256 _amount1) external;

    function removeLiquidity(uint256 _amount) external;

    function swap(address _token, uint256 _amount) external;
}
