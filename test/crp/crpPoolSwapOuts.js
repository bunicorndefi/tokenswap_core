/* eslint-env es6 */

const BFactory = artifacts.require('BFactory');
const BPool = artifacts.require('BPool');
const ConfigurableRightsPool = artifacts.require('ConfigurableRightsPool');
const CRPFactory = artifacts.require('CRPFactory');
const TToken = artifacts.require('TToken');
const { calcInGivenOut, calcRelativeDiff } = require('../../lib/calc_comparisons');

/*
Tests initial CRP Pool set-up including:
BPool deployment, token binding, balance checks, BPT checks.
*/
contract('crpPoolSwapOuts', async (accounts) => {
    const admin = accounts[0];
    const user1 = accounts[1];

    const { toWei, fromWei } = web3.utils;
    const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
    const MAX = web3.utils.toTwosComplement(-1);
    const errorDelta = 10 ** -8;
    // These are the intial settings for newCrp:
    const swapFee = toWei('0.003');
    const startWeights = [toWei('12'), toWei('1.5'), toWei('1.5')];
    const startBalances = [toWei('80000'), toWei('40'), toWei('10000')];
    const SYMBOL = 'KSP';
    const NAME = 'Buni Pool Token';

    const permissions = {
        canPauseSwapping: true,
        canChangeSwapFee: true,
        canChangeWeights: true,
        canAddRemoveTokens: true,
        canWhitelistLPs: false,
        canChangeCap: false,
    };

    let crpFactory;
    let bFactory;
    let kPoolAddr;
    let bPool;
    let kPool2;
    let kPool3;
    let crpPool;
    let crpPool2
    let crpPool3;
    let CRPPOOL;
    let CRPPOOL2;
    let CRPPOOL3;
    let CRPPOOL_ADDRESS;
    let WETH;
    let DAI;
    let XYZ;
    let weth;
    let dai;
    let xyz;
    let adminXYZBalance;
    let kPoolXYZBalance;
    let adminWethBalance;
    let kPoolWethBalance;
    let adminDaiBalance;
    let kPoolDaiBalance;
    let xyzWeight;
    let daiWeight;
    let wethWeight;
    let adminBPTBalance;

    before(async () => {
        bFactory = await BFactory.deployed();
        crpFactory = await CRPFactory.deployed();
        xyz = await TToken.new('XYZ', 'XYZ', 18);
        weth = await TToken.new('Wrapped Ether', 'WETH', 18);
        dai = await TToken.new('Dai Stablecoin', 'DAI', 18);

        WETH = weth.address;
        DAI = dai.address;
        XYZ = xyz.address;

        // admin/user balances
        await weth.mint(admin, toWei('300'));
        await dai.mint(admin, toWei('45000'));
        await xyz.mint(admin, toWei('300000'));

        await weth.mint(user1, toWei('25'));
        await dai.mint(user1, toWei('10000'));
        await xyz.mint(user1, toWei('20'));

        const poolParams = {
            poolTokenSymbol: SYMBOL,
            poolTokenName: NAME,
            constituentTokens: [XYZ, WETH, DAI],
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

        CRPPOOL_ADDRESS = crpPool.address;

        await weth.approve(CRPPOOL_ADDRESS, MAX);
        await dai.approve(CRPPOOL_ADDRESS, MAX);
        await xyz.approve(CRPPOOL_ADDRESS, MAX);

        CRPPOOL2 = await crpFactory.newCrp.call(
            bFactory.address,
            poolParams,
            permissions,
        );

        await crpFactory.newCrp(
            bFactory.address,
            poolParams,
            permissions,
        );

        crpPool2 = await ConfigurableRightsPool.at(CRPPOOL2);

        await weth.approve(crpPool2.address, MAX);
        await dai.approve(crpPool2.address, MAX);
        await xyz.approve(crpPool2.address, MAX);

        CRPPOOL3 = await crpFactory.newCrp.call(
            bFactory.address,
            poolParams,
            permissions,
        );

        await crpFactory.newCrp(
            bFactory.address,
            poolParams,
            permissions,
        );

        crpPool3 = await ConfigurableRightsPool.at(CRPPOOL3);

        await weth.approve(crpPool3.address, MAX);
        await dai.approve(crpPool3.address, MAX);
        await xyz.approve(crpPool3.address, MAX);
    });

    it('crpPools should have KPools after creation', async () => {
        await crpPool.createPool(toWei('100'));
        kPoolAddr = await crpPool.bPool();
        assert.notEqual(kPoolAddr, ZERO_ADDRESS);
        bPool = await BPool.at(kPoolAddr);

        await crpPool2.createPool(toWei('100'));
        kPoolAddr = await crpPool2.bPool();
        assert.notEqual(kPoolAddr, ZERO_ADDRESS);
        kPool2 = await BPool.at(kPoolAddr);

        await crpPool3.createPool(toWei('100'));
        kPoolAddr = await crpPool3.bPool();
        assert.notEqual(kPoolAddr, ZERO_ADDRESS);
        kPool3 = await BPool.at(kPoolAddr);
    });

    it('KPools should have initial token balances', async () => {
        kPoolAddr = await crpPool.bPool();

        adminXYZBalance = await xyz.balanceOf.call(admin);
        kPoolXYZBalance = await xyz.balanceOf.call(kPoolAddr);
        adminWethBalance = await weth.balanceOf.call(admin);
        kPoolWethBalance = await weth.balanceOf.call(kPoolAddr);
        adminDaiBalance = await dai.balanceOf.call(admin);
        kPoolDaiBalance = await dai.balanceOf.call(kPoolAddr);

        assert.equal(adminXYZBalance, toWei('60000')); // 20000x3
        assert.equal(kPoolXYZBalance, toWei('80000'));
        assert.equal(adminWethBalance, toWei('180')); // 60x3
        assert.equal(kPoolWethBalance, toWei('40'));
        assert.equal(adminDaiBalance, toWei('15000')); // 5000x3
        assert.equal(kPoolDaiBalance, toWei('10000'));

        kPoolAddr = await crpPool2.bPool();

        kPoolXYZBalance = await xyz.balanceOf.call(kPoolAddr);
        kPoolWethBalance = await weth.balanceOf.call(kPoolAddr);
        kPoolDaiBalance = await dai.balanceOf.call(kPoolAddr);

        assert.equal(kPoolXYZBalance, toWei('80000'));
        assert.equal(kPoolWethBalance, toWei('40'));
        assert.equal(kPoolDaiBalance, toWei('10000'));

        kPoolAddr = await crpPool3.bPool();

        kPoolXYZBalance = await xyz.balanceOf.call(kPoolAddr);
        kPoolWethBalance = await weth.balanceOf.call(kPoolAddr);
        kPoolDaiBalance = await dai.balanceOf.call(kPoolAddr);

        assert.equal(kPoolXYZBalance, toWei('80000'));
        assert.equal(kPoolWethBalance, toWei('40'));
        assert.equal(kPoolDaiBalance, toWei('10000'));
    });

    it('BPool should have initial token weights', async () => {
        xyzWeight = await bPool.getDenormalizedWeight.call(xyz.address);
        wethWeight = await bPool.getDenormalizedWeight.call(weth.address);
        daiWeight = await bPool.getDenormalizedWeight.call(dai.address);

        assert.equal(xyzWeight, toWei('12'));
        assert.equal(wethWeight, toWei('1.5'));
        assert.equal(daiWeight, toWei('1.5'));

        xyzWeight = await kPool2.getDenormalizedWeight.call(xyz.address);
        wethWeight = await kPool2.getDenormalizedWeight.call(weth.address);
        daiWeight = await kPool2.getDenormalizedWeight.call(dai.address);

        assert.equal(xyzWeight, toWei('12'));
        assert.equal(wethWeight, toWei('1.5'));
        assert.equal(daiWeight, toWei('1.5'));

        xyzWeight = await kPool3.getDenormalizedWeight.call(xyz.address);
        wethWeight = await kPool3.getDenormalizedWeight.call(weth.address);
        daiWeight = await kPool3.getDenormalizedWeight.call(dai.address);

        assert.equal(xyzWeight, toWei('12'));
        assert.equal(wethWeight, toWei('1.5'));
        assert.equal(daiWeight, toWei('1.5'));
    });

    it('Admin should have initial BPT', async () => {
        adminBPTBalance = await crpPool.balanceOf.call(admin);
        assert.equal(adminBPTBalance, toWei('100'));

        adminBPTBalance = await crpPool2.balanceOf.call(admin);
        assert.equal(adminBPTBalance, toWei('100'));

        adminBPTBalance = await crpPool3.balanceOf.call(admin);
        assert.equal(adminBPTBalance, toWei('100'));
    });

    it('Should perform swaps', async () => {
        let tokenIn = WETH;
        let tokenOut = DAI;
        let tokenAmountIn;

        // 1st Swap - WETH for DAI
        await weth.approve(bPool.address, MAX, { from: user1 });

        let tokenInBalance = await weth.balanceOf.call(bPool.address); // 40
        let tokenInWeight = await bPool.getDenormalizedWeight(WETH); // 1.5
        let tokenOutBalance = await dai.balanceOf.call(bPool.address); // 10000
        let tokenOutWeight = await bPool.getDenormalizedWeight(DAI); // 1.5

        let expectedTotalIn = calcInGivenOut(
            fromWei(tokenInBalance),
            fromWei(tokenInWeight),
            fromWei(tokenOutBalance),
            fromWei(tokenOutWeight),
            '500',
            fromWei(swapFee),
        );

        // Actually returns an array of tokenAmountIn, spotPriceAfter
        tokenAmountIn = await bPool.swapExactAmountOut.call(
            tokenIn,
            MAX, // maxAmountIn
            tokenOut,
            toWei('500'), // tokenAmountOut
            MAX, // maxPrice
            { from: user1 },
        );
        let relDif = calcRelativeDiff(expectedTotalIn, fromWei(tokenAmountIn[0]));
        assert.isAtMost(relDif.toNumber(), errorDelta);

        // 2nd Swap - DAI for WETH
        await dai.approve(kPool2.address, MAX, { from: user1 });

        tokenIn = DAI;
        tokenOut = WETH;

        tokenInBalance = await dai.balanceOf.call(kPool2.address);
        tokenInWeight = await kPool2.getDenormalizedWeight(DAI);
        tokenOutBalance = await weth.balanceOf.call(kPool2.address);
        tokenOutWeight = await kPool2.getDenormalizedWeight(WETH);

        expectedTotalIn = calcInGivenOut(
            fromWei(tokenInBalance),
            fromWei(tokenInWeight),
            fromWei(tokenOutBalance),
            fromWei(tokenOutWeight),
            '5',
            fromWei(swapFee),
        );

        tokenAmountIn = await kPool2.swapExactAmountOut.call(
            tokenIn,
            MAX, // maxAmountIn
            tokenOut,
            toWei('5'), // tokenAmountOut
            MAX,
            { from: user1 },
        );
        relDif = calcRelativeDiff(expectedTotalIn, fromWei(tokenAmountIn[0]));
        assert.isAtMost(relDif.toNumber(), errorDelta);

        // 3rd Swap XYZ for WETH
        await xyz.approve(kPool3.address, MAX, { from: user1 });

        tokenIn = XYZ;
        tokenOut = WETH;

        tokenInBalance = await xyz.balanceOf.call(kPool3.address);
        tokenInWeight = await kPool3.getDenormalizedWeight(XYZ);
        tokenOutBalance = await weth.balanceOf.call(kPool3.address);
        tokenOutWeight = await kPool3.getDenormalizedWeight(WETH);

        expectedTotalIn = calcInGivenOut(
            fromWei(tokenInBalance),
            fromWei(tokenInWeight),
            fromWei(tokenOutBalance),
            fromWei(tokenOutWeight),
            '0.025',
            fromWei(swapFee),
        );

        tokenAmountIn = await kPool3.swapExactAmountOut.call(
            tokenIn,
            MAX, // maxAmountIn
            tokenOut,
            toWei('0.025'), // tokenAmountOut
            MAX,
            { from: user1 },
        );

        relDif = calcRelativeDiff(expectedTotalIn, fromWei(tokenAmountIn[0]));
        assert.isAtMost(relDif.toNumber(), errorDelta);
    });
});
