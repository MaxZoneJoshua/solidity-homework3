import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const defaultOwner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
const zeroAddress = "0x0000000000000000000000000000000000000000";

export default buildModule("NFTAuctionMarketModule", (m) => {
  const owner = m.getParameter("owner", defaultOwner);
  const feeRecipient = m.getParameter("feeRecipient", defaultOwner);

  const nftOwner = m.getParameter("nftOwner", defaultOwner);
  const erc20Name = m.getParameter("erc20Name", "Mock USD");
  const erc20Symbol = m.getParameter("erc20Symbol", "mUSD");
  const erc20Decimals = m.getParameter("erc20Decimals", 6);

  const ethUsdDecimals = m.getParameter("ethUsdDecimals", 8);
  const ethUsdPrice = m.getParameter("ethUsdPrice", 3_000_00000000n);
  const erc20UsdDecimals = m.getParameter("erc20UsdDecimals", 8);
  const erc20UsdPrice = m.getParameter("erc20UsdPrice", 1_00000000n);

  const auctionNft = m.contract("AuctionNFT", [nftOwner]);
  const mockErc20 = m.contract("MockERC20", [erc20Name, erc20Symbol, erc20Decimals]);
  const ethUsdFeed = m.contract("MockV3Aggregator", [ethUsdDecimals, ethUsdPrice], {
    id: "EthUsdFeed",
  });
  const erc20UsdFeed = m.contract("MockV3Aggregator", [erc20UsdDecimals, erc20UsdPrice], {
    id: "Erc20UsdFeed",
  });

  const implementation = m.contract("NFTAuctionMarket");
  const initializeData = m.encodeFunctionCall(implementation, "initialize", [owner, feeRecipient]);
  const proxy = m.contract("NFTAuctionMarketProxy", [implementation, initializeData]);
  const market = m.contractAt("NFTAuctionMarket", proxy, { id: "MarketProxy" });

  m.call(market, "setUsdPriceFeed", [zeroAddress, ethUsdFeed], { id: "SetEthUsdFeed" });
  m.call(market, "setUsdPriceFeed", [mockErc20, erc20UsdFeed], { id: "SetErc20UsdFeed" });

  return {
    auctionNft,
    mockErc20,
    ethUsdFeed,
    erc20UsdFeed,
    implementation,
    proxy,
    market,
  };
});
