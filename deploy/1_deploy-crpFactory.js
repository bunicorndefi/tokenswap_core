module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  await deploy('BFactory', {
    from: deployer,
    owner: deployer,
    log: true,
    deterministicDeployment: false,
  });

  // Libraries
  const buniSafeMath = await deploy('BuniSafeMath', {
    from: deployer,
    owner: deployer,
    log: true,
    deterministicDeployment: false,
  });
  const rightsManager = await deploy('RightsManager', {
    from: deployer,
    owner: deployer,
    log: true,
    deterministicDeployment: false,
  });
  const smartPoolManager = await deploy('SmartPoolManager', {
    from: deployer,
    owner: deployer,
    log: true,
    deterministicDeployment: false,
  });
  // Factory
  await deploy('CRPFactory', {
    from: deployer,
    owner: deployer,
    log: true,
    args: [],
    libraries: {
      'BuniSafeMath': buniSafeMath.address,
      'RightsManager': rightsManager.address,
      'SmartPoolManager': smartPoolManager.address
    },
    deterministicDeployment: false,
  });
};
module.exports.tags = ['MyContract'];