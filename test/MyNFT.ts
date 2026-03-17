import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, zeroAddress } from "viem";

describe("AuctionNFT", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, alice, bob] = await viem.getWalletClients();

  it("Should mint an NFT to the target address", async function () {
    const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);

    await viem.assertions.emitWithArgs(
      nft.write.mint([alice.account.address]),
      nft,
      "Transfer",
      [zeroAddress, getAddress(alice.account.address), 0n],
    );

    assert.equal(await nft.read.ownerOf([0n]), getAddress(alice.account.address));
    assert.equal(await nft.read.balanceOf([alice.account.address]), 1n);
    assert.equal(await nft.read.nextTokenId(), 1n);
  });

  it("Should transfer an NFT to another address", async function () {
    const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);
    await nft.write.mint([alice.account.address]);

    const aliceNft = await viem.getContractAt("AuctionNFT", nft.address, {
      client: {
        public: publicClient,
        wallet: alice,
      },
    });

    await viem.assertions.emitWithArgs(
      aliceNft.write.transferNFT([alice.account.address, bob.account.address, 0n]),
      nft,
      "Transfer",
      [getAddress(alice.account.address), getAddress(bob.account.address), 0n],
    );

    assert.equal(await nft.read.ownerOf([0n]), getAddress(bob.account.address));
    assert.equal(await nft.read.balanceOf([alice.account.address]), 0n);
    assert.equal(await nft.read.balanceOf([bob.account.address]), 1n);
  });

  it("Should only allow the owner to mint", async function () {
    const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);
    const aliceNft = await viem.getContractAt("AuctionNFT", nft.address, {
      client: {
        public: publicClient,
        wallet: alice,
      },
    });

    await viem.assertions.revertWithCustomErrorWithArgs(
      aliceNft.write.mint([alice.account.address]),
      nft,
      "OwnableUnauthorizedAccount",
      [getAddress(alice.account.address)],
    );
  });
});
