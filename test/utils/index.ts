import { ethers } from "hardhat";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import type { Token } from "../../src/types/Token";
import { BigNumber } from "ethers";

export const nullAddress = "0x0000000000000000000000000000000000000000";

export const toBN = (value: string): BigNumber => {
  return ethers.utils.parseEther(value);
};

export const mulDiv = (x: BigNumber, y: BigNumber, z: BigNumber) => {
  return x.mul(y).div(z);
};

export const computeAbsDiff = (x: BigNumber, y: BigNumber) => {
  if (x.gt(y)) {
    return x.sub(y);
  }
  return y.sub(x);
};

export const liquidityRemovalCalculation = (
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

export const approvePairToAmm = async (
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

export const consoleBN = (str: string, bn: BigNumber) => console.log(`${str}: ${bn.toString()}`);
