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
  });

  it("checks the initial state", async () => {
    expect(await csAmm.reserve0(), "wrong initial reserve0 value").to.be.eq(0);
    expect(await csAmm.reserve1(), "wrong initial reserve1 value").to.be.eq(0);
    expect(await csAmm.fee(), "wrong amm fee value").to.be.eq(fee);
    expect(await token0.address, "wrong token0").to.not.be.eq(nullAddress);
    expect(await token1.address, "wrong token1").to.not.be.eq(nullAddress);
    // check the setup
    expect(await token0.balanceOf(signers[0].address), "wrong initial user's token0 balance").to.be.eq(toBN("100000"));
    expect(await token1.balanceOf(signers[0].address), "wrong initial user's token1 balance").to.be.eq(toBN("100000"));
  });

  it("adds liquidity", async () => {});

  it("removes liquidity", async () => {});

  it("adds liquidity again", async () => {});

  it("swaps", async () => {});
});
