# Sepolia Deployment Addresses

状态：待部署

执行命令：

```bash
npx hardhat ignition deploy ignition/modules/NFTAuctionMarketSepolia.ts \
  --network sepolia \
  --build-profile production \
  --parameters ignition/parameters/sepolia-market.json
```

部署完成后，请填写下表：

| Item | Address |
| --- | --- |
| Network | `Sepolia` |
| AuctionNFT | `pending` |
| Market Implementation | `pending` |
| Market Proxy | `pending` |
| ETH/USD Feed | `pending` |
| ERC20 Payment Token | `pending` |
| ERC20/USD Feed | `pending` |
| Deployer | `pending` |
| Deployment Date | `pending` |

说明：

- Sepolia 部署必须使用真实 Chainlink feed 地址。
- 当前仓库已准备好部署模块与参数模板，但没有用户私钥和 RPC 时无法代替你完成链上部署。
