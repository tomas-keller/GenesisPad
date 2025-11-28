import { expect } from "chai";
import { ethers } from "hardhat";
import { GenesisToken, GenesisTokenFactory } from "../types";

describe("GenesisTokenFactory", function () {
  let factory: GenesisTokenFactory;
  let token: GenesisToken;
  const maxSupply = 1_000_000n;
  const initialPrice = ethers.parseEther("0.05");

  beforeEach(async function () {
    const deployedFactory = await ethers.deployContract("GenesisTokenFactory");
    factory = (await deployedFactory.waitForDeployment()) as unknown as GenesisTokenFactory;

    const tx = await factory.createToken("Genesis USD", "gUSD", maxSupply, initialPrice);
    await tx.wait();

    const tokens = await factory.getTokens();
    token = (await ethers.getContractAt("GenesisToken", tokens[0].token)) as GenesisToken;
  });

  it("stores created tokens with metadata", async function () {
    const tokens = await factory.getTokens();

    expect(tokens.length).to.eq(1);
    const meta = tokens[0];

    expect(meta.name).to.eq("Genesis USD");
    expect(meta.symbol).to.eq("gUSD");
    expect(meta.maxSupply).to.eq(maxSupply);
    expect(meta.mintedSupply).to.eq(0n);
    expect(meta.initialPriceWei).to.eq(initialPrice);
  });

  it("mints tokens for free up to the max supply", async function () {
    const [, user] = await ethers.getSigners();

    await token.connect(user).mint(user.address, 5n);
    expect(await token.mintedSupply()).to.eq(5n);

    await token.connect(user).mint(user.address, maxSupply - 5n);
    expect(await token.mintedSupply()).to.eq(maxSupply);

    await expect(token.connect(user).mint(user.address, 1n)).to.be.revertedWith("Exceeds supply");
  });

  it("reports token count correctly", async function () {
    expect(await factory.tokenCount()).to.eq(1n);
  });
});
