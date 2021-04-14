
**Buni** is an automated **portfolio manager**, **liquidity provider**, and **price sensor**.

Buni turns the concept of an index fund on its head: instead of a paying fees
to portfolio managers to rebalance your portfolio, you collect fees from traders, who rebalance
your portfolio by following arbitrage opportunities.

Buni is based on an N-dimensional invariant surface which is a generalization of the constant product formula described by Vitalik Buterin and proven viable by the popular Uniswap dapp.


## Setup
For interactions or contract deployments on public testnets / mainnet, put your private key in hardhat.config.js


## Install Dependencies
```
npx install
```

## Development

Most users will want to consume the ABI definitions for BFactory and BPool.

This project follows the standard hardhat project structure. 

```
npx hardhat compile   # Compile contracts
npx hardhat deploy # Deploy contracts
```
 
