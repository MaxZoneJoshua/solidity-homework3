# Local Deployment Record

命令：

```bash
npx hardhat ignition deploy ignition/modules/NFTAuctionMarket.ts --network hardhatMainnet --build-profile production
```

最近一次本地部署结果：

| Contract | Address |
| --- | --- |
| AuctionNFT | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| Mock ERC20 | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| ETH/USD Mock Feed | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |
| ERC20/USD Mock Feed | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| Market Implementation | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| Market Proxy | `0x5FC8d32690cc91D4c39d9d3abcBD16989F875707` |

说明：

- 该记录来自 Hardhat 本地模拟网络，仅用于验证部署流程。
- 本地模块默认部署 mock feed 与 mock ERC20，方便开发和演示。
