# Homework 3 - NFT Auction Market

基于 Hardhat 3 实现的 NFT 拍卖市场作业，包含以下要求：

- ERC721 NFT 铸造与转移
- ETH / ERC20 双支付方式拍卖
- Chainlink USD 价格换算
- UUPS 代理升级
- 单元测试、集成测试、覆盖率报告
- 本地部署模块与 Sepolia 部署模块

## Project Structure

```text
contracts/
  AuctionNFT.sol                NFT 合约
  NFTAuctionMarket.sol          UUPS 拍卖市场 V1
  NFTAuctionMarketV2.sol        升级示例 V2
  NFTAuctionMarketProxy.sol     ERC1967 代理壳合约
  mocks/
    MockERC20.sol               ERC20 测试代币
    MockV3Aggregator.sol        Chainlink Feed Mock
test/
  MyNFT.ts                      NFT 单元测试
  NFTAuctionMarket.ts           市场集成测试 + 升级测试
ignition/
  modules/
    AuctionNFT.ts               单独部署 NFT
    NFTAuctionMarket.ts         本地演示部署（含 mock feed / mock ERC20）
    NFTAuctionMarketSepolia.ts  Sepolia 部署（使用真实 feed / 外部 ERC20）
    NFTAuctionMarketSepoliaEthOnly.ts  Sepolia ETH-only 部署
  parameters/
    sepolia-market.example.json Sepolia 参数示例
reports/
  homework3-test-report.md      测试与覆盖率报告
docs/deployments/
  local-deployment.md           本地部署记录
  sepolia-addresses.md          Sepolia 地址登记表
```

## Contracts

### `AuctionNFT`

- 基于 `ERC721` + `ERC721URIStorage`
- 仅 owner 可铸造 NFT
- 支持 `tokenURI`、标准转移、提取 mint 收入

### `NFTAuctionMarket`

- 创建拍卖并托管 NFT
- 支持 ETH 与 ERC20 出价
- 被超价用户可提取退款
- 拍卖结束后自动结算 NFT、卖家收入、平台手续费
- 使用 Chainlink Data Feed 计算 USD 价格
- 通过 UUPS 方式升级

### `NFTAuctionMarketV2`

- 在不破坏原存储布局的前提下增加 `marketName`
- 用于验证升级流程与状态保留

## Environment Setup

```bash
npm install
```

如果需要部署到 Sepolia，请准备：

- `SEPOLIA_RPC_URL`
- `SEPOLIA_PRIVATE_KEY`

## Test Commands

```bash
npx hardhat compile --force
npx hardhat test
npx hardhat test --coverage
```

如果要验证实际部署体积，建议使用优化后的 production profile：

```bash
npx hardhat compile --build-profile production --force
```

## Test Coverage

当前测试覆盖：

- NFT mint / transfer / owner-only mint
- ETH 拍卖创建、竞价、退款、结束结算
- ERC20 拍卖结算与 USD 价格换算
- 无人出价时 NFT 返还卖家
- 代理升级到 `NFTAuctionMarketV2` 并保留状态

详细结果见 `reports/homework3-test-report.md`。

## Local Deployment

本地演示模块会同时部署：

- `AuctionNFT`
- `MockERC20`
- `MockV3Aggregator`（ETH/USD 与 ERC20/USD）
- `NFTAuctionMarket` implementation
- `NFTAuctionMarketProxy`

命令：

```bash
npx hardhat ignition deploy ignition/modules/NFTAuctionMarket.ts --network hardhatMainnet --build-profile production
```

部署结果见 `docs/deployments/local-deployment.md`。

## Sepolia Deployment

Sepolia 模块不会部署 mock 预言机，而是要求传入真实的 Chainlink feed 和外部 ERC20 地址。

如果你暂时只有 ETH/USD feed，也可以先用 `NFTAuctionMarketSepoliaEthOnly.ts` 完成 ETH-only 部署；但这不满足作业里 ERC20 + ETH 都要能换算 USD 的完整要求。

1. 复制参数模板并填值

```bash
cp ignition/parameters/sepolia-market.example.json ignition/parameters/sepolia-market.json
```

2. 编辑 `ignition/parameters/sepolia-market.json`

- `owner`: 市场管理员
- `feeRecipient`: 平台手续费接收地址
- `nftOwner`: NFT 合约 owner
- `ethUsdFeed`: Sepolia ETH/USD Chainlink feed
- `paymentToken`: Sepolia 上可用的 ERC20 地址
- `paymentTokenUsdFeed`: 该 ERC20 对 USD 的 Chainlink feed

3. 执行部署

```bash
npx hardhat ignition deploy ignition/modules/NFTAuctionMarketSepolia.ts \
  --network sepolia \
  --build-profile production \
  --parameters ignition/parameters/sepolia-market.json
```

4. 将部署地址记录到 `docs/deployments/sepolia-addresses.md`

## Homework Deliverables Mapping

- 代码：当前仓库
- 测试报告：`reports/homework3-test-report.md`
- 本地部署记录：`docs/deployments/local-deployment.md`
- Sepolia 地址登记：`docs/deployments/sepolia-addresses.md`
- 文档：本 README

## Current Status

- 合约功能、价格换算、升级能力已完成
- 测试和覆盖率已补齐
- 本地部署模块已验证通过
- Sepolia 真实地址仍需在具备私钥和 RPC 的环境下执行后填写到 `docs/deployments/sepolia-addresses.md`
