import { encodeFunctionData, parseEther } from "viem";

export async function deployAuctionFixture(viem: any) {
  const publicClient = await viem.getPublicClient();
  const [owner, seller, bidderA, bidderB, royaltyReceiver] = await viem.getWalletClients();

  const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);
  const erc20 = await viem.deployContract("MockERC20", ["Mock USD", "mUSD", 6]);
  const ethFeed = await viem.deployContract("MockV3Aggregator", [8, 3_000n * 10n ** 8n]);
  const erc20Feed = await viem.deployContract("MockV3Aggregator", [8, 1n * 10n ** 8n]);
  const implementation = await viem.deployContract("NFTAuctionMarket");

  const initData = encodeFunctionData({
    abi: implementation.abi,
    functionName: "initialize",
    args: [owner.account.address, owner.account.address],
  });

  const proxy = await viem.deployContract("NFTAuctionMarketProxy", [implementation.address, initData]);
  const market = await viem.getContractAt("NFTAuctionMarket", proxy.address);

  await market.write.setUsdPriceFeed(["0x0000000000000000000000000000000000000000", ethFeed.address]);
  await market.write.setUsdPriceFeed([erc20.address, erc20Feed.address]);

  const mintPrice = await nft.read.mintPrice();
  await nft.write.mint([seller.account.address, "ipfs://auction-nft"], { value: mintPrice });
  await nft.write.approve([market.address, 1n], { account: seller.account });

  await erc20.write.mint([bidderA.account.address, 1_000_000_000n]);
  await erc20.write.mint([bidderB.account.address, 1_000_000_000n]);

  const sellerMarket = await viem.getContractAt("NFTAuctionMarket", proxy.address, {
    client: {
      public: publicClient,
      wallet: seller,
    },
  });

  const bidderAMarket = await viem.getContractAt("NFTAuctionMarket", proxy.address, {
    client: {
      public: publicClient,
      wallet: bidderA,
    },
  });

  const bidderBMarket = await viem.getContractAt("NFTAuctionMarket", proxy.address, {
    client: {
      public: publicClient,
      wallet: bidderB,
    },
  });

  const bidderAToken = await viem.getContractAt("MockERC20", erc20.address, {
    client: {
      public: publicClient,
      wallet: bidderA,
    },
  });

  const bidderBToken = await viem.getContractAt("MockERC20", erc20.address, {
    client: {
      public: publicClient,
      wallet: bidderB,
    },
  });

  const sellerNft = await viem.getContractAt("AuctionNFT", nft.address, {
    client: {
      public: publicClient,
      wallet: seller,
    },
  });

  return {
    viem,
    publicClient,
    owner,
    seller,
    bidderA,
    bidderB,
    royaltyReceiver,
    nft,
    erc20,
    ethFeed,
    erc20Feed,
    implementation,
    proxy,
    market,
    sellerMarket,
    bidderAMarket,
    bidderBMarket,
    bidderAToken,
    bidderBToken,
    sellerNft,
    mintPrice,
    startingEthBid: parseEther("1"),
    startingTokenBid: 500_000_000n,
  };
}
