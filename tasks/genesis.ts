import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";

task("task:factory-address", "Prints the GenesisTokenFactory address").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments } = hre;

  const factory = await deployments.get("GenesisTokenFactory");

  console.log("GenesisTokenFactory address is " + factory.address);
});

task("task:create-token", "Create a new ERC7984 token")
  .addParam("name", "Token name")
  .addParam("symbol", "Token symbol")
  .addParam("supply", "Maximum supply (uint64)")
  .addParam("price", "Initial price in ETH (decimal string)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments } = hre;

    const factoryDeployment = await deployments.get("GenesisTokenFactory");
    const factory = await ethers.getContractAt("GenesisTokenFactory", factoryDeployment.address);

    const maxSupply = BigInt(taskArguments.supply);
    const initialPrice = ethers.parseEther(taskArguments.price);

    const tx = await factory.createToken(taskArguments.name, taskArguments.symbol, maxSupply, initialPrice);
    await tx.wait();

    console.log(
      `Created token ${taskArguments.name} (${taskArguments.symbol}) with supply ${maxSupply} at factory ${factoryDeployment.address}`,
    );
  });

task("task:list-tokens", "List tokens created by the factory").setAction(async function (
  _taskArguments: TaskArguments,
  hre,
) {
  const { deployments, ethers } = hre;

  const factoryDeployment = await deployments.get("GenesisTokenFactory");
  const factory = await ethers.getContractAt("GenesisTokenFactory", factoryDeployment.address);

  const tokens = await factory.getTokens();
  if (tokens.length === 0) {
    console.log("No tokens created yet.");
    return;
  }

  console.log(`Tokens created via factory ${factoryDeployment.address}:`);
  tokens.forEach((token: any, index: number) => {
    const priceInEth = ethers.formatEther(token.initialPriceWei);
    console.log(
      `${index + 1}. ${token.name} (${token.symbol}) @ ${token.token} - supply ${token.mintedSupply}/${token.maxSupply} - price ${priceInEth} ETH - creator ${token.creator}`,
    );
  });
});

task("task:mint-token", "Mint a free amount from a deployed GenesisToken")
  .addParam("token", "Token contract address")
  .addParam("to", "Recipient address")
  .addParam("amount", "Amount to mint (uint64)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers } = hre;

    const token = await ethers.getContractAt("GenesisToken", taskArguments.token);

    const tx = await token.mint(taskArguments.to, BigInt(taskArguments.amount));
    const receipt = await tx.wait();
    console.log(`Minted ${taskArguments.amount} tokens to ${taskArguments.to}. tx=${tx.hash} status=${receipt?.status}`);
  });
