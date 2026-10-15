const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("==================================================");
  console.log("TasteChain BKK — Avalanche Fuji Deployment");
  console.log("Deployer Address:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Deployer Balance:", hre.ethers.formatEther(balance), "AVAX");
  console.log("==================================================");

  // 1. Deploy TasteChainRegistry
  console.log("\n1. Deploying TasteChainRegistry...");
  const RegistryFactory = await hre.ethers.getContractFactory("TasteChainRegistry");
  const registry = await RegistryFactory.deploy();
  await registry.waitForDeployment();
  const registryAddress = await registry.getAddress();
  console.log("✅ TasteChainRegistry deployed to:", registryAddress);

  // 2. Deploy TasteChainBounty
  console.log("\n2. Deploying TasteChainBounty...");
  const treasuryAddress = process.env.TREASURY_ADDRESS || deployer.address;
  const oracleAddress = process.env.ORACLE_ADDRESS || deployer.address;
  console.log("   Treasury:", treasuryAddress);
  console.log("   Oracle:", oracleAddress);

  const BountyFactory = await hre.ethers.getContractFactory("TasteChainBounty");
  const bounty = await BountyFactory.deploy(registryAddress, treasuryAddress, oracleAddress);
  await bounty.waitForDeployment();
  const bountyAddress = await bounty.getAddress();
  console.log("✅ TasteChainBounty deployed to:", bountyAddress);

  console.log("\n==================================================");
  console.log("Deployment Summary on Avalanche Fuji (Chain ID 43113):");
  console.log("TasteChainRegistry:", registryAddress);
  console.log("TasteChainBounty:  ", bountyAddress);
  console.log("Snowtrace Explorer Links:");
  console.log("https://testnet.snowtrace.io/address/" + registryAddress);
  console.log("https://testnet.snowtrace.io/address/" + bountyAddress);
  console.log("==================================================");

  // Output JSON for Frontend / Env usage
  const deploymentData = {
    network: "fuji",
    chainId: 43113,
    registry: registryAddress,
    bounty: bountyAddress,
    deployer: deployer.address,
    treasury: treasuryAddress,
    oracle: oracleAddress,
    deployedAt: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(__dirname, "../deployment-fuji.json"),
    JSON.stringify(deploymentData, null, 2)
  );
  console.log("Saved deployment metadata to deployment-fuji.json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
