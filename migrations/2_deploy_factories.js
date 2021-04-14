const RightsManager = artifacts.require('RightsManager');
const SmartPoolManager = artifacts.require('SmartPoolManager');
const CRPFactory = artifacts.require('CRPFactory');
const ESPFactory = artifacts.require('ESPFactory');
const BFactory = artifacts.require('BFactory');
const TMath = artifacts.require('TMath');
const BuniSafeMath = artifacts.require('BuniSafeMath');
const BuniSafeMathMock = artifacts.require('BuniSafeMathMock');

module.exports = async function (deployer, network, accounts) {
    if (network === 'development' || network === 'coverage') {
        await deployer.deploy(TMath);
        await deployer.deploy(BuniSafeMathMock);
    }
    
    await deployer.deploy(BFactory);

    await deployer.deploy(BuniSafeMath);
    await deployer.deploy(RightsManager);
    await deployer.deploy(SmartPoolManager);

    deployer.link(BuniSafeMath, CRPFactory);
    deployer.link(RightsManager, CRPFactory);
    deployer.link(SmartPoolManager, CRPFactory);

    await deployer.deploy(CRPFactory);

    if (network === 'development' || network === 'coverage') {
        deployer.link(BuniSafeMath, ESPFactory);
        deployer.link(RightsManager, ESPFactory);
        deployer.link(SmartPoolManager, ESPFactory);

        await deployer.deploy(ESPFactory);
    }
};
