/* eslint-env es6 */

const BFactory = artifacts.require('BFactory');
const ConfigurableRightsPool = artifacts.require('ConfigurableRightsPool');
const CRPFactory = artifacts.require('CRPFactory');
const TToken = artifacts.require('TToken');
const truffleAssert = require('truffle-assertions');
const { assert } = require('chai');
const BPool = artifacts.require('BPool')
const { time } = require('@openzeppelin/test-helpers');
const { calcInGivenOut, calcOutGivenIn, calcRelativeDiff } = require('../../lib/calc_comparisons');
const Decimal = require('decimal.js');

contract('Bankless Simulation (destroy pool)', async (accounts) => {
    const admin = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];

    const { toWei, fromWei } = web3.utils;
    const MAX = web3.utils.toTwosComplement(-1);
    const MaxBig256 = '115792089237316195423570985008687907853269984665640564039457.584007913129639935';
    const errorDelta = 10 ** -8;
    const numPoolTokens = '1000';

    let crpFactory; 
    let bFactory;
    let crpPool;
    let CRPPOOL;
    let DAI;
    let dai;

    // These are the intial settings for newCrp:
    const swapFee = 10 ** 15;
    const minSwapFee = toWei('0.000001');
    const initialDaiDeposit = '3000';

    // 2/38 is 5%/95%  Dai/Bap0
    const startWeights = [toWei('2'), toWei('38')];
    // 38 weight and 38 tokens is a coincidence
    const startBalances = [toWei(initialDaiDeposit), toWei('38')];
    const SYMBOL = 'BAPPT';
    const NAME = 'Bankless Apparel 0 BPT';

    let tokenAddresses;

    const permissions = {
        canPauseSwapping: true,
        canChangeSwapFee: true,
        canChangeWeights: true,
        canAddRemoveTokens: true,
        canWhitelistLPs: true,
        canChangeCap: false,
    };

    before(async () => {
        bFactory = await BFactory.deployed();
        crpFactory = await CRPFactory.deployed();
        bap0 = await TToken.new('BAP Gen 0', 'BAP0', 18);
        weth = await TToken.new('Wrapped Ether', 'WETH', 18);
        dai = await TToken.new('Dai Stablecoin', 'DAI', 18);

        BAP0 = bap0.address;
        DAI = dai.address;

        // Initially 5% DAI / 95% BAP0
        tokenAddresses = [DAI, BAP0];

        // admin balances
        await bap0.mint(admin, toWei('38'));
        await dai.mint(admin, toWei('3000'));

        await dai.mint(user1, toWei('100000'));
        await dai.mint(user2, toWei('100000'));
        await dai.mint(user3, toWei('100000'));

        const poolParams = {
            poolTokenSymbol: SYMBOL,
            poolTokenName: NAME,
            constituentTokens: tokenAddresses,
            tokenBalances: startBalances,
            tokenWeights: startWeights,
            swapFee: swapFee,
        }

        CRPPOOL = await crpFactory.newCrp.call(
            bFactory.address,
            poolParams,
            permissions,
        );

        await crpFactory.newCrp(
            bFactory.address,
            poolParams,
            permissions,
        );

        crpPool = await ConfigurableRightsPool.at(CRPPOOL);

        const CRPPOOL_ADDRESS = crpPool.address;

        await bap0.approve(CRPPOOL_ADDRESS, MAX);
        await dai.approve(CRPPOOL_ADDRESS, MAX);

        await crpPool.approve(user1, MAX);
        await crpPool.approve(user2, MAX);
        await crpPool.approve(user3, MAX);

        await crpPool.createPool(toWei(numPoolTokens), 10, 10);
    });

    it('crpPool should have correct rights set', async () => {
        let x;
        for (x = 0; x < permissions.length; x++) {
            const perm = await crpPool.hasPermission(x);
            if (x == 5) {
                assert.isFalse(perm);
            }
            else {
                assert.isTrue(perm)
            }
        }
    });

    it('ConfigurableRightsPool cap should be MAX after creation', async () => {
        const currentCap = await crpPool.bspCap();
        assert.equal(MaxBig256, fromWei(currentCap).toString());
    });

    it('Should not allow anyone to add liquidity', async () => {
        await truffleAssert.reverts(
            crpPool.joinswapPoolAmountOut.call(DAI, toWei('1'), MAX),
            'ERR_NOT_ON_WHITELIST',
        );    

        await truffleAssert.reverts(
            crpPool.joinswapPoolAmountOut.call(DAI, toWei('1'), MAX, {from: user3}),
            'ERR_NOT_ON_WHITELIST',
        );    
    });

    describe('BAP0 shirt auction', () => {
        it('Should configure the pool (min swap fee)', async () => {
            // Drop the fee to the minimum (cannot be 0)
            await crpPool.setSwapFee(minSwapFee);
            const kPoolAddr = await crpPool.bPool();
            const underlyingPool = await BPool.at(kPoolAddr);
    
            const deployedSwapFee = await underlyingPool.getSwapFee();
            assert.equal(minSwapFee, deployedSwapFee);
        });

        it('Should call updateWeightsGradually() with valid range', async () => {
            blockRange = 50;
            // get current block number
            const block = await web3.eth.getBlock('latest');
            console.log(`Block of updateWeightsGradually() call: ${block.number}`);
            startBlock = block.number + 10;
            const endBlock = startBlock + blockRange;
            const endWeights = [toWei('34'), toWei('6')];
            console.log(`Start block for Dai -> Bap0 flipping: ${startBlock}`);
            console.log(`End   block for Dai -> Bap0 flipping: ${endBlock}`);

            await crpPool.updateWeightsGradually(endWeights, startBlock, endBlock);
        });

        it('Should not allow removing a token during an update', async () => {
            await truffleAssert.reverts(
                crpPool.removeToken(DAI),
                'ERR_NO_UPDATE_DURING_GRADUAL'
            );
        });

        it('Should revert because too early to pokeWeights()', async () => {
            const block = await web3.eth.getBlock('latest');
            console.log(`Block: ${block.number}`);
            await truffleAssert.reverts(
                crpPool.pokeWeights(),
                'ERR_CANT_POKE_YET',
            );
        });

    });
});
