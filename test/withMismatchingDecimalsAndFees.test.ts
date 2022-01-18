import { ethers } from "hardhat";
import { expect } from "chai";
import type { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import type { CSAmm } from "../src/types/CSAmm";
import type { Token } from "../src/types/Token";
import { nullAddress, toBN } from "./utils";
// amm behavior
import shouldBehaveLikeConstantSumAMM from "./amm.behavior";

describe("Constant Sum AMM tests with fees and tokens with mismatching decimals", function () {
  let csAmm: CSAmm;
  let token0: Token;
  let token1: Token;
  let signers: SignerWithAddress[];
  const fee = ethers.BigNumber.from(3);
  before(async function () {
    signers = await ethers.getSigners();
    const CSAmm = await ethers.getContractFactory("CSAmm", signers[0]);
    csAmm = <CSAmm>await CSAmm.deploy(fee, signers[0].address, 18, 6);
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
    // 2 DAI
    // 2USDC
    await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(admin, token0, token1, toBN("2"), toBN("2"));
    
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
      await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(admin, token0, token1, token0, toBN("3"), fee);
    });

    it("userB adds liquidity", async () => {
      const [admin, userB] = signers;
      await shouldBehaveLikeConstantSumAMM(csAmm).toAddLiquidity(userB, token0, token1, toBN("3"), toBN("6"));
    });

    it("swaps user's token1 for pool's token0", async () => {
      const [admin] = signers;
      await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(admin, token0, token1, token1, toBN("4"), fee);
    });

    it("userB swaps token1 for token0", async () => {
      const [admin, userB] = signers;
      await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(userB, token0, token1, token1, toBN("2"), fee);
    });

    it("userB swaps token1 for token0", async () => {
      const [admin, userB] = signers;
      await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(userB, token0, token1, token1, toBN("2"), fee);
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
      await shouldBehaveLikeConstantSumAMM(csAmm).toSwapPoolTokens(userB, token0, token1, token0, toBN("3"), fee);
    });

    it("userC removes liquidity", async () => {
      const [admin, userB, userC] = signers;
      await shouldBehaveLikeConstantSumAMM(csAmm).toRemoveLiquidity(userC, token0, token1, toBN("4"));
    });
});
