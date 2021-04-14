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

contract('Bankless Simulation', async (accounts) => {
    const admin = accounts[0];
    const user1 = accounts[1];
    const user2 = accounts[2];
    const user3 = accounts[3];

    const { toWei, fromWei } = web3.utils;
    const MAX = web3.utils.toTwosComplement(-1);
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
    const SYMBOL = 'KAP';
    const NAME = 'Buni Pool Token';

    const permissions = {
        canPauseSwapping: true,
        canChangeSwapFee: true,
        canChangeWeights: true,
        canAddRemoveTokens: false,
        canWhitelistLPs: false,
        canChangeCap: true,
    };

    before(async () => {
        bFactory = await BFactory.deployed();
        crpFactory = await CRPFactory.deployed();
        bap0 = await TToken.new('BAP Gen 0', 'BAP0', 18);
        weth = await TToken.new('Wrapped Ether', 'WETH', 18);
        dai = await TToken.new('Dai Stablecoin', 'DAI', 18);

        BAP0 = bap0.address;
        DAI = dai.address;

        // admin balances
        await bap0.mint(admin, toWei('38'));
        await dai.mint(admin, toWei('3000'));

        await dai.mint(user1, toWei('100000'));
        await dai.mint(user2, toWei('100000'));
        await dai.mint(user3, toWei('100000'));

        // Initially 5% DAI / 95% BAP0
        const tokenAddresses = [DAI, BAP0];

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
            if (x == 3 || x == 4 || x == 6) {
                assert.isFalse(perm);
            }
            else {
                assert.isTrue(perm)
            }
        }
    });

    it('ConfigurableRightsPool cap should be initial supply after creation', async () => {
        const cap = await crpPool.bspCap();
        const supply = await crpPool.totalSupply.call();

        assert.equal(fromWei(cap), fromWei(supply));
    });

    it('Should not allow anyone to add liquidity', async () => {
        await truffleAssert.reverts(
            crpPool.joinswapPoolAmountOut.call(DAI, toWei('1'), MAX),
            'ERR_CAP_LIMIT_REACHED',
        );    

        await truffleAssert.reverts(
            crpPool.joinswapPoolAmountOut.call(DAI, toWei('1'), MAX, {from: user3}),
            'ERR_CAP_LIMIT_REACHED',
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

        it('Should revert because too early to pokeWeights()', async () => {
            const block = await web3.eth.getBlock('latest');
            console.log(`Block: ${block.number}`);
            await truffleAssert.reverts(
                crpPool.pokeWeights(),
                'ERR_CANT_POKE_YET',
            );
        });

        it('Controller should recover remaining tokens and proceeds', async () => {
            const kPoolAddr = await crpPool.bPool();
            const underlyingPool = await BPool.at(kPoolAddr);
            let poolDaiBalance;
            let poolShirtBalance;
            let daiWithdrawal;
            let shirtWithdrawal;

            // set the cap to 0 so that no one can join while we're withdrawing from the pool
            await crpPool.setCap(0);
            // also prevent trading
            await crpPool.setPublicSwap(false);

            await truffleAssert.reverts(
                /* You might expect this to work - just redeem all the pool tokens and get the shirts/dai back
                   Nope - there is no "we're done - everybody out of the pool" call
                   It's designed for people to enter and leave continuously, so prices need to be
                   well-defined at all times, so ratios need to be maintained, etc.
                   You can only withdraw 1/3 at a time - but you can do so iteratively */
                crpPool.exitPool.call(toWei(numPoolTokens), [toWei(initialDaiDeposit), toWei('1.99')]),
                'ERR_LIMIT_OUT',
            );

            poolDaiBalance = await dai.balanceOf.call(underlyingPool.address);
            console.log(`Final pool Dai balance: ${Decimal(fromWei(poolDaiBalance)).toFixed(2)}`);
            poolShirtBalance = await bap0.balanceOf.call(underlyingPool.address);
            console.log(`Final pool shirt balance: ${Decimal(fromWei(poolShirtBalance)).toFixed(4)}`);

            let cnt = 0;
            while (Decimal(fromWei(poolDaiBalance)) > 0.001 && Decimal(fromWei(poolShirtBalance)) > 0.001) {
                daiWithdrawal = Math.floor(Decimal(fromWei(poolDaiBalance)).div(3.0) * 10000) / 10000;
                console.log(`\nStep ${cnt + 1}: Dai withdrawal = ${daiWithdrawal}`);
                shirtWithdrawal = Math.floor(Decimal(fromWei(poolShirtBalance)).div(3.0) * 10000) / 10000;
                console.log(`Shirt withdrawal = ${shirtWithdrawal}`);
    
                // Withdraw as much as we can
                await crpPool.exitswapExternAmountOut(DAI,
                                                        toWei(daiWithdrawal.toString()),
                                                        toWei(numPoolTokens));
                await crpPool.exitswapExternAmountOut(BAP0,
                                                        toWei(shirtWithdrawal.toString()),
                                                        toWei(numPoolTokens));

                poolDaiBalance = await dai.balanceOf.call(underlyingPool.address);
                console.log(`Pool Dai balance: ${Decimal(fromWei(poolDaiBalance)).toFixed(2)}`);
                poolShirtBalance = await bap0.balanceOf.call(underlyingPool.address);
                console.log(`Pool shirt balance: ${Decimal(fromWei(poolShirtBalance)).toFixed(4)}`);
                cnt++;

                if (5 == cnt) {
                    // Should not be able to join while it's being drained after the auction
                    await truffleAssert.reverts(
                        crpPool.joinswapPoolAmountOut.call(DAI, toWei('1'), MAX),
                        'ERR_CAP_LIMIT_REACHED',
                    );

                    // Should not be able to swap while it's being drained after the auction
                    await truffleAssert.reverts(
                            underlyingPool.swapExactAmountIn.call(
                                DAI,
                                toWei('10'), // tokenAmountIn
                                BAP0,
                                toWei('0'), // minAmountOut
                                MAX),
                            'ERR_SWAP_NOT_PUBLIC'
                    );            
                }
            }
            console.log(`Withdrew in ${cnt} steps`);

            const adminDaiBalance = await dai.balanceOf.call(admin);
            console.log(`Final admin Dai balance: ${Decimal(fromWei(adminDaiBalance)).toFixed(2)}`);
            const adminShirtBalance = await bap0.balanceOf.call(admin);
            console.log(`Final admin shirt balance: ${Decimal(fromWei(adminShirtBalance)).toFixed(4)}`);

            assert.isAtLeast(parseFloat(fromWei(adminDaiBalance)), parseInt(initialDaiDeposit - 2));
            assert.isAtLeast(parseFloat(fromWei(adminShirtBalance)), 1.99);
            assert.isAtMost(parseFloat(fromWei(adminShirtBalance)), 2);
        });
    });
});
