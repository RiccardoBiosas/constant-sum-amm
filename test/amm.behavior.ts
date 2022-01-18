import { expect } from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import type { CSAmm } from "../src/types/CSAmm";
import type { Token } from "../src/types/Token";
import { BigNumber, ethers } from "ethers";
import { approvePairToAmm, consoleBN, liquidityRemovalCalculation, mulDiv, normalizeAmount } from "./utils";

const shouldBehaveLikeConstantSumAMM = (csAmm: CSAmm) => ({
  toAddLiquidity: async (
    account: SignerWithAddress,
    token0: Token,
    token1: Token,
    amount0: BigNumber,
    amount1: BigNumber,
  ): Promise<void> => {
    console.log("------- LIQUIDITY PROVISION TEST STARTS----");
    const decimal0 = await token0.decimals();
    const decimal1 = await token1.decimals();
    console.log("decimal0", decimal0);
    console.log("decimal1", decimal1);
    const balance0 = await token0.balanceOf(csAmm.address);
    const balance1 = await token1.balanceOf(csAmm.address);
    const userLPBalanceBefore = await csAmm.balanceOf(account.address);
    consoleBN("before pool balance0", balance0);
    consoleBN("before pool balance1", balance1);
    consoleBN("before pool reserve0", await csAmm.reserve0());
    consoleBN("before pool reserve1", await csAmm.reserve1());
    consoleBN(`before ${account.address}'s lp balance: `, userLPBalanceBefore);
    consoleBN(`before liquidity invariant `, await csAmm.liquidityInvariant());
    await approvePairToAmm(account, csAmm.address, token0, token1, amount0, amount1);
    await csAmm.connect(account).addLiquidity(amount0, amount1);
    expect(await token0.balanceOf(csAmm.address), "wrong token0 balance").to.equal(balance0.add(amount0));
    expect(await token1.balanceOf(csAmm.address), "wrong token1 balance").to.equal(balance1.add(amount1));
    expect(normalizeAmount(await token0.balanceOf(csAmm.address), decimal0), "wrong reserve0").to.equal(
      await csAmm.reserve0(),
    );
    expect(normalizeAmount(await token1.balanceOf(csAmm.address), decimal1), "wrong reserve1").to.equal(
      await csAmm.reserve1(),
    );
    expect(await csAmm.liquidityInvariant(), "wrong liquidity invariant").to.equal(
      (await csAmm.reserve0()).add(await csAmm.reserve1()),
    );
    expect(await csAmm.balanceOf(account.address), "wrong user's lp balance").to.equal(
      userLPBalanceBefore.add(normalizeAmount(amount0, decimal0).add(normalizeAmount(amount1, decimal1))),
    );
    consoleBN("after pool balance0", await token0.balanceOf(csAmm.address));
    consoleBN("after pool balance1", await token1.balanceOf(csAmm.address));
    consoleBN("after pool reserve0", await csAmm.reserve0());
    consoleBN("after pool reserve1", await csAmm.reserve1());
    consoleBN(`after total LP supply`, await csAmm.totalSupply());
    consoleBN(`after liquidity invariant`, await csAmm.liquidityInvariant());
    consoleBN(`after user's ${account.address}'s lp balance: `, await csAmm.balanceOf(account.address));
    console.log("------- LIQUIDITY PROVISION TEST ENDS----");
  },
  toRemoveLiquidity: async (
    account: SignerWithAddress,
    token0: Token,
    token1: Token,
    lpAmount: BigNumber,
  ): Promise<void> => {
    console.log("-------START LIQUIDITY REMOVAL TEST START----");
    const decimal0 = await token0.decimals();
    const decimal1 = await token1.decimals();
    console.log("decimal0", decimal0);
    console.log("decimal1", decimal1);
    const balance0 = await token0.balanceOf(csAmm.address);
    const balance1 = await token1.balanceOf(csAmm.address);
    const reserve0Before = await csAmm.reserve0();
    const reserve1Before = await csAmm.reserve1();
    const totalLPSupply = await csAmm.totalSupply();
    const userLPBalanceBefore = await csAmm.balanceOf(account.address);
    const token0UserBalance = await token0.balanceOf(account.address);
    const token1UserBalance = await token1.balanceOf(account.address);
    console.log("------START POOL STATE BEFORE START---------");
    consoleBN(`LP amount to be removed`, lpAmount);
    consoleBN("pool balance0", balance0);
    consoleBN("pool balance1", balance1);
    consoleBN("pool reserve0", reserve0Before);
    consoleBN("pool reserve1", reserve1Before);
    consoleBN(`user account ${account.address}'s lp balance: `, userLPBalanceBefore);
    consoleBN(`user account ${account.address}'s token0 balance`, token0UserBalance);
    consoleBN(`user account ${account.address}'s token1 balance`, token1UserBalance);
    consoleBN(`total LP supply`, totalLPSupply);
    consoleBN(`liquidity invariant`, await csAmm.liquidityInvariant());
    const { redeem0, redeem1 } = liquidityRemovalCalculation(lpAmount, reserve0Before, reserve1Before);
    consoleBN(`expected to reedem token0`, redeem0);
    consoleBN(`expected to reedem token1`, redeem1);
    console.log("token0 ", token0.address);
    console.log("token1 ", token1.address);
    console.log("------END POOL STATE BEFORE END---------");

    await csAmm.connect(account).removeLiquidity(lpAmount);

    expect(await token0.balanceOf(csAmm.address), "wrong pool's token0 balance").to.equal(balance0.sub(redeem0));
    expect(await token1.balanceOf(csAmm.address), "wrong pool's token1 balance").to.equal(balance1.sub(redeem1));
    expect(normalizeAmount(await token0.balanceOf(csAmm.address), decimal0), "wrong reserve0").to.equal(
      await csAmm.reserve0(),
    );
    expect(normalizeAmount(await token1.balanceOf(csAmm.address), decimal1), "wrong reserve1").to.equal(
      await csAmm.reserve1(),
    );
    expect(await csAmm.liquidityInvariant(), "wrong liquidity invariant").to.equal(
      (await csAmm.reserve0()).add(await csAmm.reserve1()),
    );
    expect(await csAmm.balanceOf(account.address), "wrong user's lp balance").to.equal(
      userLPBalanceBefore.sub(lpAmount),
    );
    expect(await token0.balanceOf(account.address), "wrong user's token0 balance").to.equal(
      token0UserBalance.add(redeem0),
    );
    expect(await token1.balanceOf(account.address), "wrong user's token1 balance").to.equal(
      token1UserBalance.add(redeem1),
    );

    console.log("------START POOL STATE AFTER START---------");
    consoleBN("after pool reserve0", await csAmm.reserve0());
    consoleBN("after pool reserve1", await csAmm.reserve1());
    consoleBN("after pool balance0", await token0.balanceOf(csAmm.address));
    consoleBN("after pool balance1", await token1.balanceOf(csAmm.address));
    consoleBN(`after liquidity invariant`, await csAmm.liquidityInvariant());
    consoleBN(`after LP TOTAL SUPPLY`, await csAmm.totalSupply());
    consoleBN(`after ${account.address}'s lp balance`, await csAmm.balanceOf(account.address));
    consoleBN(`after ${account.address}'s token0 balance`, await token0.balanceOf(account.address));
    consoleBN(`after ${account.address}'s token1 balance`, await token1.balanceOf(account.address));
    console.log("------END POOL STATE AFTER END---------");

    console.log("-------END LIQUIDITY PROVISION TEST END----");
  },
  toSwapPoolTokens: async (
    account: SignerWithAddress,
    token0: Token,
    token1: Token,
    toSwapToken: Token,
    toSwapAmount: BigNumber,
    fee: BigNumber,
  ): Promise<void> => {
    console.log("------- SWAP TEST STARTS----");
    const decimal0 = await token0.decimals();
    const decimal1 = await token1.decimals();
    console.log("decimal0", decimal0);
    console.log("decimal1", decimal1);
    const normalizedSwapAmount = normalizeAmount(toSwapAmount, await toSwapToken.decimals());
    const balance0 = await token0.balanceOf(csAmm.address);
    const balance1 = await token1.balanceOf(csAmm.address);
    const totalLPSupply = await csAmm.totalSupply();
    const userLPBalanceBefore = await csAmm.balanceOf(account.address);
    const token0UserBalance = await token0.balanceOf(account.address);
    const token1UserBalance = await token1.balanceOf(account.address);
    const prevLiquidityInvariant = await csAmm.liquidityInvariant();
    const prevAccumulatedFee0 = await csAmm.accumulatedFee0();
    const prevAccumulatedFee1 = await csAmm.accumulatedFee1();
    const expectedFee = fee.eq(ethers.BigNumber.from(0))
      ? ethers.BigNumber.from(0)
      : mulDiv(normalizedSwapAmount, fee, ethers.BigNumber.from(10000));

    console.log(`is token0 the toSwapToken: ${toSwapToken.address === token0.address}`);
    console.log("--- fee data ---");
    consoleBN("expected fee", expectedFee);
    consoleBN("amount to swap", toSwapAmount);
    consoleBN("previous accumulatedFee0", prevAccumulatedFee0);
    consoleBN("previous accumulatedFee1", prevAccumulatedFee1);
    console.log("--- fee data ---");
    consoleBN("before pool balance0", balance0);
    consoleBN("before pool balance1", balance1);
    consoleBN("before pool reserve0", await csAmm.reserve0());
    consoleBN("before pool reserve1", await csAmm.reserve1());
    consoleBN(`before account ${account.address}'s lp balance: `, userLPBalanceBefore);
    consoleBN(`before account ${account.address}'s token0 balance: `, token0UserBalance);
    consoleBN(`before account ${account.address}'s token1 balance: `, token1UserBalance);
    consoleBN(`before total LP supply`, totalLPSupply);
    consoleBN(`before liquidity invariant`, prevLiquidityInvariant);
    await toSwapToken.connect(account).approve(csAmm.address, toSwapAmount);
    await csAmm.connect(account).swap(toSwapToken.address, toSwapAmount);
    if (toSwapToken.address === token0.address) {
      expect(await token0.balanceOf(csAmm.address), "wrong pool's token0 balance").to.equal(
        balance0.add(normalizedSwapAmount),
      );
      expect(await token1.balanceOf(csAmm.address), "wrong pool's token1 balance").to.equal(
        balance1.sub(normalizedSwapAmount).add(expectedFee),
      );
      expect(await token0.balanceOf(account.address), "wrong user's token0 balance").to.equal(
        token0UserBalance.sub(toSwapAmount),
      );
      expect(await token1.balanceOf(account.address), "wrong user's token1 balance").to.equal(
        token1UserBalance.add(toSwapAmount).sub(expectedFee),
      );

      expect(await csAmm.accumulatedFee0(), "wrong accumulatedFee0").to.equal(prevAccumulatedFee0);
      expect(await csAmm.accumulatedFee1(), "wrong accumulatedFee1").to.equal(prevAccumulatedFee1.add(expectedFee));
    } else {
      expect(await token0.balanceOf(csAmm.address), "wrong pool's token0 balance").to.equal(
        balance0.sub(toSwapAmount).add(expectedFee),
      );
      expect(await token1.balanceOf(csAmm.address), "wrong pool's token1 balance").to.equal(balance1.add(toSwapAmount));
      expect(await token0.balanceOf(account.address), "wrong user's token0 balance").to.equal(
        token0UserBalance.add(toSwapAmount).sub(expectedFee),
      );
      expect(await token1.balanceOf(account.address), "wrong user's token1 balance").to.equal(
        token1UserBalance.sub(toSwapAmount),
      );

      expect(await csAmm.accumulatedFee0(), "wrong accumulatedFee0").to.equal(prevAccumulatedFee0.add(expectedFee));
      expect(await csAmm.accumulatedFee1(), "wrong accumulatedFee1").to.equal(prevAccumulatedFee1);
    }
    expect(normalizeAmount(await token0.balanceOf(csAmm.address), decimal0), "wrong reserve0").to.equal(
      await csAmm.reserve0(),
    );
    expect(normalizeAmount(await token1.balanceOf(csAmm.address), decimal1), "wrong reserve1").to.equal(
      await csAmm.reserve1(),
    );
    expect(await csAmm.liquidityInvariant(), "wrong liquidity invariant").to.equal(
      (await csAmm.reserve0()).add(await csAmm.reserve1()),
    );

    expect(await csAmm.liquidityInvariant(), "fee incorrectly applied to liquidity invariant calculation").to.equal(
      prevLiquidityInvariant.add(expectedFee),
    );
    expect(await csAmm.balanceOf(account.address), "wrong user's lp balance").to.equal(userLPBalanceBefore);
    consoleBN("after pool balance0", await token0.balanceOf(csAmm.address));
    consoleBN("after pool balance1", await token1.balanceOf(csAmm.address));
    consoleBN(`after liquidity invariant `, await csAmm.liquidityInvariant());
    consoleBN(`after LP TOTAL SUPPLY `, await csAmm.totalSupply());
    consoleBN(`after ${account.address}'s lp balance: `, await csAmm.balanceOf(account.address));
    consoleBN(`after ${account.address}'s token0 balance:`, await token0.balanceOf(account.address));
    consoleBN(`after ${account.address}'s token1 balance:`, await token1.balanceOf(account.address));
    console.log("-------SWAP TEST ENDS----");
  },
});

export default shouldBehaveLikeConstantSumAMM;
