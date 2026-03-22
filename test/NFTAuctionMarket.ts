import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress } from "viem";

import { deployAuctionFixture } from "./helpers/auctionFixtures.js";

describe("NFTAuctionMarket", async function () {
  const { viem, networkHelpers } = await network.connect();

  it("deploys the market fixture", async function () {
    const fixture = await deployAuctionFixture(viem);

    assert.equal(await fixture.erc20.read.name(), "Mock USD");
    assert.equal(await fixture.ethFeed.read.decimals(), 8);
    assert.equal(await fixture.market.read.feeRecipient(), getAddress(fixture.owner.account.address));
    assert.equal(await fixture.market.read.platformFee(), 250n);
  });

  it("creates an ETH auction, tracks refunds, and settles the NFT", async function () {
    const fixture = await deployAuctionFixture(viem);
    const auctionId = 1n;
    const firstBid = fixture.startingEthBid;
    const secondBid = firstBid + 1n;

    await fixture.sellerMarket.write.createAuction([
      fixture.nft.address,
      1n,
      "0x0000000000000000000000000000000000000000",
      firstBid,
      1n,
    ]);

    assert.equal(await fixture.nft.read.ownerOf([1n]), getAddress(fixture.market.address));

    await fixture.bidderAMarket.write.placeBid([auctionId, firstBid], { value: firstBid });
    await fixture.bidderBMarket.write.placeBid([auctionId, secondBid], { value: secondBid });

    assert.equal(
      await fixture.market.read.pendingReturns([auctionId, fixture.bidderA.account.address]),
      firstBid,
    );

    await fixture.bidderAMarket.write.withdrawPendingReturn([auctionId]);

    assert.equal(
      await fixture.market.read.pendingReturns([auctionId, fixture.bidderA.account.address]),
      0n,
    );

    await networkHelpers.time.increase(networkHelpers.time.duration.hours(1) + 1);
    await fixture.market.write.endAuction([auctionId]);

    assert.equal(await fixture.nft.read.ownerOf([1n]), getAddress(fixture.bidderB.account.address));
    assert.equal(await fixture.publicClient.getBalance({ address: fixture.market.address }), 0n);
  });

  it("settles an ERC20 auction and converts token pricing to USD", async function () {
    const fixture = await deployAuctionFixture(viem);
    const secondTokenId = 2n;
    const auctionId = 1n;
    const firstBid = fixture.startingTokenBid;
    const secondBid = 700_000_000n;

    await fixture.nft.write.mint([fixture.seller.account.address, "ipfs://auction-nft-2"], {
      value: fixture.mintPrice,
    });
    await fixture.sellerNft.write.approve([fixture.market.address, secondTokenId]);

    await fixture.sellerMarket.write.createAuction([
      fixture.nft.address,
      secondTokenId,
      fixture.erc20.address,
      firstBid,
      1n,
    ]);

    const [startPriceUsd, highestBidUsd, minimumBidUsd] = await fixture.market.read.getAuctionUsdPricing([
      auctionId,
    ]);
    assert.equal(startPriceUsd, 500n * 10n ** 18n);
    assert.equal(highestBidUsd, 0n);
    assert.equal(minimumBidUsd, 500n * 10n ** 18n);

    await fixture.bidderAToken.write.approve([fixture.market.address, firstBid]);
    await fixture.bidderBToken.write.approve([fixture.market.address, secondBid]);

    await fixture.bidderAMarket.write.placeBid([auctionId, firstBid]);
    await fixture.bidderBMarket.write.placeBid([auctionId, secondBid]);
    await fixture.bidderAMarket.write.withdrawPendingReturn([auctionId]);

    await networkHelpers.time.increase(networkHelpers.time.duration.hours(1) + 1);
    await fixture.market.write.endAuction([auctionId]);

    assert.equal(await fixture.nft.read.ownerOf([secondTokenId]), getAddress(fixture.bidderB.account.address));
    assert.equal(await fixture.erc20.read.balanceOf([fixture.seller.account.address]), 682_500_000n);
    assert.equal(await fixture.erc20.read.balanceOf([fixture.owner.account.address]), 17_500_000n);
    assert.equal(await fixture.erc20.read.balanceOf([fixture.market.address]), 0n);
  });

  it("returns the NFT to the seller when no bids are placed", async function () {
    const fixture = await deployAuctionFixture(viem);
    const auctionId = 1n;

    await fixture.sellerMarket.write.createAuction([
      fixture.nft.address,
      1n,
      "0x0000000000000000000000000000000000000000",
      fixture.startingEthBid,
      1n,
    ]);

    await networkHelpers.time.increase(networkHelpers.time.duration.hours(1) + 1);
    await fixture.market.write.endAuction([auctionId]);

    assert.equal(await fixture.nft.read.ownerOf([1n]), getAddress(fixture.seller.account.address));
  });

  it("upgrades the proxy to V2 and keeps state", async function () {
    const fixture = await deployAuctionFixture(viem);
    const implementationV2 = await viem.deployContract("NFTAuctionMarketV2");

    await fixture.market.write.setPlatformFee([300n]);
    await fixture.market.write.upgradeTo([implementationV2.address]);

    const marketV2 = await viem.getContractAt("NFTAuctionMarketV2", fixture.proxy.address);
    await marketV2.write.initializeV2(["Homework3 Market"]);

    assert.equal(await marketV2.read.version(), 2n);
    assert.equal(await marketV2.read.marketName(), "Homework3 Market");
    assert.equal(await marketV2.read.platformFee(), 300n);
    assert.equal(await marketV2.read.feeRecipient(), getAddress(fixture.owner.account.address));
  });
});
