import { ethers } from "hardhat";
import { expect } from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";

import type { CSAmm } from "../src/types/CSAmm";
import type { Token } from "../src/types/Token";
import { BigNumber } from "ethers";

const nullAddress = "0x0000000000000000000000000000000000000000";

export const toBN = (value: string): BigNumber => {
  return ethers.utils.parseEther(value);
};

const mulDiv = (x: BigNumber, y: BigNumber, z: BigNumber) => {
  return x.mul(y).div(z);
};

const computeAbsDiff = (x: BigNumber, y: BigNumber) => {
  if (x.gt(y)) {
    return x.sub(y);
  }
  return y.sub(x);
};
//
//
const liquidityRemovalCalculation = (
  lpAmt: BigNumber,
  reserve0: BigNumber,
  reserve1: BigNumber,
): {
  redeem0: BigNumber;
  redeem1: BigNumber;
} => {
  const lpAmtPerReserve = lpAmt.div(2);
  switch (true) {
    case reserve0.gte(lpAmtPerReserve) && reserve1.gte(lpAmtPerReserve):
      consoleBN("case reserve0.gte(lpAmtPerReserve) && reserve1.gte(lpAmtPerReserve)", reserve0.sub(lpAmtPerReserve));
      consoleBN("case reserve0.gte(lpAmtPerReserve) && reserve1.gte(lpAmtPerReserve)", reserve1.sub(lpAmtPerReserve));
      return {
        redeem0: lpAmtPerReserve,
        redeem1: lpAmtPerReserve,
      };
    case reserve0.lt(lpAmtPerReserve) && reserve1.gt(lpAmtPerReserve):
      return {
        redeem0: lpAmtPerReserve.sub(computeAbsDiff(lpAmtPerReserve, reserve0)),
        redeem1: lpAmtPerReserve.add(computeAbsDiff(lpAmtPerReserve, reserve0)),
      };
    case reserve1.lt(lpAmtPerReserve) && reserve0.gt(lpAmtPerReserve):
      return {
        redeem0: lpAmtPerReserve.sub(computeAbsDiff(lpAmtPerReserve, reserve0)),
        redeem1: lpAmtPerReserve.add(computeAbsDiff(lpAmtPerReserve, reserve0)),
      };
    default:
      console.log("-------- liquidity removal calculation error ----");
      consoleBN("lpAmount", lpAmt);
      consoleBN("reserve0", reserve0);
      consoleBN("reserve1", reserve0);
      console.log("-------- liquidity removal calculation rror ----");
      throw new Error("unexpected");
  }
};

const approvePairToAmm = async (
  account: SignerWithAddress,
  to: string,
  token0: Token,
  token1: Token,
  amount0: BigNumber,
  amount1: BigNumber,
): Promise<void> => {
  await token0.connect(account).approve(to, amount0);
  await token1.connect(account).approve(to, amount1);
};

const consoleBN = (str: string, bn: BigNumber) => console.log(`${str}: ${bn.toString()}`);

const shouldBehaveLikeConstantSumAMM = (csAmm: CSAmm) => ({
  toAddLiquidity: async (
    account: SignerWithAddress,
    token0: Token,
    token1: Token,
    amount0: BigNumber,
    amount1: BigNumber,
  ): Promise<void> => {
    console.log("------- LIQUIDITY PROVISION TEST STARTS----");
    const balance0 = await token0.balanceOf(csAmm.address);
    const balance1 = await token1.balanceOf(csAmm.address);
    const userLPBalanceBefore = await csAmm.balanceOf(account.address);
    consoleBN("before pool balance0", balance0);
    consoleBN("before pool balance1", balance1);
    consoleBN(`before ${account.address}'s lp balance: `, userLPBalanceBefore);
    consoleBN(`before liquidity invariant `, await csAmm.liquidityInvariant());
    await approvePairToAmm(account, csAmm.address, token0, token1, amount0, amount1);
    await csAmm.connect(account).addLiquidity(amount0, amount1);
    expect(await token0.balanceOf(csAmm.address), "wrong token0 balance").to.equal(balance0.add(amount0));
    expect(await token1.balanceOf(csAmm.address), "wrong token1 balance").to.equal(balance1.add(amount1));
    expect(await token0.balanceOf(csAmm.address), "wrong reserve0").to.equal(await csAmm.reserve0());
    expect(await token1.balanceOf(csAmm.address), "wrong reserve1").to.equal(await csAmm.reserve1());
    expect(await csAmm.liquidityInvariant(), "wrong liquidity invariant").to.equal(
      (await csAmm.reserve0()).add(await csAmm.reserve1()),
    );
    expect(await csAmm.balanceOf(account.address), "wrong user's lp balance").to.equal(
      userLPBalanceBefore.add(amount0.add(amount1)),
    );
    consoleBN("after pool balance0", await token0.balanceOf(csAmm.address));
    consoleBN("after pool balance1", await token1.balanceOf(csAmm.address));
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
    expect(await token0.balanceOf(csAmm.address), "remove liq: wrong reserve0").to.equal(await csAmm.reserve0());
    expect(await token1.balanceOf(csAmm.address), "wrong reserve1").to.equal(await csAmm.reserve1());
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
  ): Promise<void> => {
    console.log("------- SWAP TEST STARTS----");
    const balance0 = await token0.balanceOf(csAmm.address);
    const balance1 = await token1.balanceOf(csAmm.address);
    const totalLPSupply = await csAmm.totalSupply();
    const userLPBalanceBefore = await csAmm.balanceOf(account.address);
    const token0UserBalance = await token0.balanceOf(account.address);
    const token1UserBalance = await token1.balanceOf(account.address);
    console.log(`is token0 the toSwapToken: ${toSwapToken.address === token0.address}`);
    consoleBN("amount to swap", toSwapAmount);
    consoleBN("before pool balance0", balance0);
    consoleBN("before pool balance1", balance1);
    consoleBN(`before account ${account.address}'s lp balance: `, userLPBalanceBefore);
    consoleBN(`before account ${account.address}'s token0 balance: `, token0UserBalance);
    consoleBN(`before account ${account.address}'s token1 balance: `, token1UserBalance);
    consoleBN(`before total LP supply`, totalLPSupply);
    consoleBN(`before liquidity invariant`, await csAmm.liquidityInvariant());
    await toSwapToken.connect(account).approve(csAmm.address, toSwapAmount);
    await csAmm.connect(account).swap(toSwapToken.address, toSwapAmount);
    if (toSwapToken.address === token0.address) {
      expect(await token0.balanceOf(csAmm.address), "wrong pool's token0 balance").to.equal(balance0.add(toSwapAmount));
      expect(await token1.balanceOf(csAmm.address), "wrong pool's token1 balance").to.equal(balance1.sub(toSwapAmount));
      expect(await token0.balanceOf(account.address), "wrong user's token0 balance").to.equal(
        token0UserBalance.sub(toSwapAmount),
      );
      expect(await token1.balanceOf(account.address), "wrong user's token1 balance").to.equal(
        token1UserBalance.add(toSwapAmount),
      );
    } else {
      expect(await token0.balanceOf(csAmm.address), "wrong pool's token0 balance").to.equal(balance0.sub(toSwapAmount));
      expect(await token1.balanceOf(csAmm.address), "wrong pool's token1 balance").to.equal(balance1.add(toSwapAmount));
      expect(await token0.balanceOf(account.address), "wrong user's token0 balance").to.equal(
        token0UserBalance.add(toSwapAmount),
      );
      expect(await token1.balanceOf(account.address), "wrong user's token1 balance").to.equal(
        token1UserBalance.sub(toSwapAmount),
      );
    }
    expect(await token0.balanceOf(csAmm.address), "wrong reserve0").to.equal(await csAmm.reserve0());
    expect(await token1.balanceOf(csAmm.address), "wrong reserve1").to.equal(await csAmm.reserve1());
    expect(await csAmm.liquidityInvariant(), "wrong liquidity invariant").to.equal(
      (await csAmm.reserve0()).add(await csAmm.reserve1()),
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

describe("Constant Sum AMM tests", function () {
  let csAmm: CSAmm;
  let token0: Token;
  let token1: Token;
  let signers: SignerWithAddress[];
  const fee = 0;
  before(async function () {
    signers = await ethers.getSigners();
    const CSAmm = await ethers.getContractFactory("CSAmm", signers[0]);
    csAmm = <CSAmm>await CSAmm.deploy(fee, signers[0].address);
    await csAmm.deployed();

    token0 = <Token>await ethers.getContractAt("Token", await csAmm.token0());
    token1 = <Token>await ethers.getContractAt("Token", await csAmm.token1());

    // funds other users for testing
    await token0.connect(signers[0]).transfer(signers[1].address, toBN("10"));
    await token0.connect(signers[0]).transfer(signers[2].address, toBN("30"));
    await token0.connect(signers[0]).transfer(signers[3].address, toBN("700"));
    await token1.connect(signers[0]).transfer(signers[1].address, toBN("10"));
    await token1.connect(signers[0]).transfer(signers[2].address, toBN("30"));
    await token1.connect(signers[0]).transfer(signers[3].address, toBN("700"));
  });

  it("checks the initial state", async () => {
    expect(await csAmm.reserve0(), "wrong initial reserve0 value").to.be.eq(0);
    expect(await csAmm.reserve1(), "wrong initial reserve1 value").to.be.eq(0);
    expect(await csAmm.totalSupply(), "wrong lp total supply").to.be.eq(0);
    expect(await csAmm.fee(), "wrong amm fee value").to.be.eq(fee);
    expect(await token0.address, "wrong token0").to.not.be.eq(nullAddress);
    expect(await token1.address, "wrong token1").to.not.be.eq(nullAddress);
  });

  it("adds matching amounts of (token0, token1) liquidity", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(admin, token0, token1, toBN("2"), toBN("2"));
  });

  it("removes liquidity", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toRemoveLiquidity(admin, token0, token1, toBN("3"));
  });

  it("removes liquidity again", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toRemoveLiquidity(admin, token0, token1, toBN("1"));
  });

  it("adds mismatching amounts of liquidity", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(admin, token0, token1, toBN("12"), toBN("8"));
  });

  it("removes liquidity again", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toRemoveLiquidity(admin, token0, token1, toBN("2"));
  });

  it("swaps user's token0 for pool's token1", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(admin, token0, token1, token0, toBN("3"));
  });

  it("userB adds liquidity", async () => {
    const [admin, userB] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(userB, token0, token1, toBN("3"), toBN("6"));
  });

  it("swaps user's token1 for pool's token0", async () => {
    const [admin] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(admin, token0, token1, token1, toBN("4"));
  });

  it("userB swaps token1 for token0", async () => {
    const [admin, userB] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(userB, token0, token1, token1, toBN("2"));
  });

  it("userB swaps token1 for token0", async () => {
    const [admin, userB] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(userB, token0, token1, token1, toBN("2"));
  });

  it("userC adds liquidity", async () => {
    const [admin, userB, userC] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(userC, token0, token1, toBN("12"), toBN("7"));
  });

  it("userD adds liquidity", async () => {
    const [admin, userB, userC, userD] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(userD, token0, token1, toBN("378"), toBN("197"));
  });

  it("userB swaps token0 for token1", async () => {
    const [admin, userB] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(userB, token0, token1, token0, toBN("3"));
  });

  it("userC removes liquidity", async () => {
    const [admin, userB, userC] = signers;
    await shouldBehaveLikeConstantSumAMM(csAmm).toRemoveLiquidity(userC, token0, token1, toBN("4"));
  });
});
