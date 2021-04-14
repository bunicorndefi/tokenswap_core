// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const hre = require('hardhat');
const {
  ethers
} = hre;

async function main() {
  // Hardhat always runs the compile task when running scripts with its command
  // line interface.
  //
  // If this script is run directly using `node` you may want to call compile
  // manually to make sure everything is compiled
  // await hre.run('compile');

  // We get the contract to deploy
  const BFactory = await hre.ethers.getContractFactory('BFactory');
  const bFactory = await BFactory.deploy();

  await bFactory.deployed();

  console.log('BFactory deployed to:', bFactory.address);
  // Deploy libraries
  const BuniSafeMath = await hre.ethers.getContractFactory('BuniSafeMath');
  const buniSafeMath = await BuniSafeMath.deploy();

  await buniSafeMath.deployed();

  console.log('BuniSafeMath deployed to:', buniSafeMath.address);

  const RightsManager = await hre.ethers.getContractFactory('RightsManager');
  const rightsManager = await RightsManager.deploy();

  await rightsManager.deployed();

  console.log('RightsManager deployed to:', rightsManager.address);

  const SmartPoolManager = await hre.ethers.getContractFactory('SmartPoolManager');
  const smartPoolManager = await SmartPoolManager.deploy();

  await smartPoolManager.deployed();

  console.log('SmartPoolManager deployed to:', smartPoolManager.address);

  // -- deploy factory --

  const CRPFactory = await hre.ethers.getContractFactory('CRPFactory', {
    libraries: {
      "BuniSafeMath": buniSafeMath.address,
      "RightsManager": rightsManager.address,
      "SmartPoolManager": smartPoolManager.address,
    }
  });

  const crpFactory = await CRPFactory.deploy();

  await crpFactory.deployed();

  console.log('CRPFactory deployed to:', crpFactory.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });