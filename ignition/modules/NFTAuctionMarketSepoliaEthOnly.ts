import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const zeroAddress = "0x0000000000000000000000000000000000000000";

export default buildModule("NFTAuctionMarketSepoliaEthOnlyModule", (m) => {
  const owner = m.getParameter("owner");
  const feeRecipient = m.getParameter("feeRecipient");
  const nftOwner = m.getParameter("nftOwner");
  const ethUsdFeed = m.getParameter("ethUsdFeed");

  const auctionNft = m.contract("AuctionNFT", [nftOwner]);
  const implementation = m.contract("NFTAuctionMarket");
  const initializeData = m.encodeFunctionCall(implementation, "initialize", [owner, feeRecipient]);
  const proxy = m.contract("NFTAuctionMarketProxy", [implementation, initializeData]);
  const market = m.contractAt("NFTAuctionMarket", proxy, { id: "SepoliaEthOnlyMarketProxy" });

  m.call(market, "setUsdPriceFeed", [zeroAddress, ethUsdFeed], { id: "SetSepoliaEthOnlyFeed" });

  return {
    auctionNft,
    implementation,
    proxy,
    market,
  };
});
