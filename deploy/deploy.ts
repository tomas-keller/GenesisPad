import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  if (hre.network.name === "sepolia" && (!process.env.PRIVATE_KEY || !process.env.INFURA_API_KEY)) {
    throw new Error("Set PRIVATE_KEY and INFURA_API_KEY in .env before deploying to Sepolia.");
  }

  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedFactory = await deploy("GenesisTokenFactory", {
    from: deployer,
    log: true,
  });

  console.log(`GenesisTokenFactory contract: `, deployedFactory.address);
};
export default func;
func.id = "deploy_genesis_token_factory"; // id required to prevent reexecution
func.tags = ["GenesisTokenFactory"];
