# Homework 3 Test Report

## Compile

- Command: `npx hardhat compile --build-profile production --force`
- Result: PASS

## Test Result

- Command: `npx hardhat test`
- Result: PASS
- Summary: `13 passing (3 solidity, 10 nodejs)`

## Coverage Result

- Command: `npx hardhat test --coverage`
- Result: PASS
- HTML report: `coverage/html/index.html`
- Note: coverage run uses the default build profile, so Hardhat prints code-size warnings for the unoptimized build; Sepolia deployment should use `--build-profile production`.

### Coverage Summary

| File | Line % | Statement % |
| --- | ---: | ---: |
| `contracts/Counter.sol` | 100.00 | 100.00 |
| `contracts/AuctionNFT.sol` | 61.11 | 61.11 |
| `contracts/NFTAuctionMarket.sol` | 76.77 | 71.34 |
| `contracts/mocks/MockV3Aggregator.sol` | 85.71 | 85.71 |
| `contracts/mocks/MockERC20.sol` | 100.00 | 100.00 |
| `contracts/NFTAuctionMarketV2.sol` | 60.00 | 60.00 |
| **Total** | **76.17** | **71.79** |

## Covered Scenarios

- `AuctionNFT` mint, transfer, owner-only access
- ETH auction create / bid / refund / settle
- ERC20 auction create / bid / refund / settle
- USD pricing conversion via Chainlink-compatible feed
- no-bid auction end flow
- UUPS upgrade from V1 to V2 with preserved state

## Deployment Status

- Local Ignition deployment: PASS
- Sepolia deployment: pending user-provided `SEPOLIA_RPC_URL` and `SEPOLIA_PRIVATE_KEY`

## Local Ignition Deployment Verification

- Command:

```bash
npx hardhat ignition deploy ignition/modules/NFTAuctionMarket.ts --network hardhatMainnet --build-profile production
```

- Result: PASS

- Why this local deployment passes:
  - the module deploys `AuctionNFT`, `MockERC20`, two `MockV3Aggregator` contracts, `NFTAuctionMarket`, and `NFTAuctionMarketProxy`
  - the proxy is initialized with the same default deployer address as `owner` and `feeRecipient`
  - the follow-up `setUsdPriceFeed` calls are executed by that same deployer, so the `onlyMarketAdmin` check succeeds
  - the module therefore completes both deployment and post-deployment market configuration in one run

- Last verified local addresses:

| Contract | Address |
| --- | --- |
| `AuctionNFT` | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| `MockERC20` | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| `EthUsdFeed` | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| `Erc20UsdFeed` | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| `NFTAuctionMarket` implementation | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| `NFTAuctionMarketProxy` | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |
| `MarketProxy` | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |

- Comparison with the Sepolia failure:
  - your Sepolia ETH-only module failed at `setUsdPriceFeed`
  - root cause: the configured `owner` address was different from the actual deployer address, so the post-deployment admin call reverted with `NotMarketAdmin()`
