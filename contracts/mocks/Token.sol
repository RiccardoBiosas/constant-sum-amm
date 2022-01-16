// SPDX-License-Identifier: agpl-3.0
pragma solidity 0.8.10;

import "openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    constructor(
        string memory name,
        string memory symbol,
        address _to
    ) ERC20(name, symbol) {
        _mint(_to, 100000 * 1e18);
    }
}
