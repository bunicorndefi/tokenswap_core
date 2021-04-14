module.exports = async ({
  getNamedAccounts,
  deployments
}) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  await deploy('BFactory', {
    from: deployer,
    log: true,
    deterministicDeployment: true,
  });

  // Libraries
  const buniSafeMath = await deploy('BuniSafeMath', {
    from: deployer,
    log: true,
    deterministicDeployment: true,
  });

  const rightsManager = await deploy('RightsManager', {
    from: deployer,
    log: true,
    deterministicDeployment: true,
  });

  const smartPoolManager = await deploy('SmartPoolManager', {
    from: deployer,
    log: true,
    deterministicDeployment: true,
  });

  // Factory
  await deploy('CRPFactory', {
    from: deployer,
    log: true,
    args: [],
    libraries: {
      'BuniSafeMath': buniSafeMath.address,
      'RightsManager': rightsManager.address,
      'SmartPoolManager': smartPoolManager.address
    },
    deterministicDeployment: true,
  });
};
module.exports.tags = ['bunicore'];