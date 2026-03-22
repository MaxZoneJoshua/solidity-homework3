import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from "hardhat";
import { getAddress, parseEther, zeroAddress } from "viem";

describe("AuctionNFT", async function () {
  const { viem } = await network.connect();
  const publicClient = await viem.getPublicClient();
  const [owner, alice, bob] = await viem.getWalletClients();

  it("mints an NFT to the target address", async function () {
    const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);
    const mintPrice = await nft.read.mintPrice();

    await viem.assertions.emitWithArgs(
      nft.write.mint([alice.account.address, "ipfs://token-1"], { value: mintPrice }),
      nft,
      "Transfer",
      [zeroAddress, getAddress(alice.account.address), 1n],
    );

    assert.equal(await nft.read.ownerOf([1n]), getAddress(alice.account.address));
    assert.equal(await nft.read.balanceOf([alice.account.address]), 1n);
    assert.equal(await nft.read.totalSupply(), 1n);
    assert.equal(await nft.read.tokenURI([1n]), "ipfs://token-1");
  });

  it("transfers an NFT to another address", async function () {
    const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);
    const mintPrice = await nft.read.mintPrice();

    await nft.write.mint([alice.account.address, "ipfs://token-2"], { value: mintPrice });

    const aliceNft = await viem.getContractAt("AuctionNFT", nft.address, {
      client: {
        public: publicClient,
        wallet: alice,
      },
    });

    await viem.assertions.emitWithArgs(
      aliceNft.write.transferFrom([alice.account.address, bob.account.address, 1n]),
      nft,
      "Transfer",
      [getAddress(alice.account.address), getAddress(bob.account.address), 1n],
    );

    assert.equal(await nft.read.ownerOf([1n]), getAddress(bob.account.address));
    assert.equal(await nft.read.balanceOf([alice.account.address]), 0n);
    assert.equal(await nft.read.balanceOf([bob.account.address]), 1n);
  });

  it("only allows the owner to mint", async function () {
    const nft = await viem.deployContract("AuctionNFT", [owner.account.address]);
    const aliceNft = await viem.getContractAt("AuctionNFT", nft.address, {
      client: {
        public: publicClient,
        wallet: alice,
      },
    });

    await viem.assertions.revertWithCustomErrorWithArgs(
      aliceNft.write.mint([alice.account.address, "ipfs://token-3"], {
        value: parseEther("0.01"),
      }),
      nft,
      "OwnableUnauthorizedAccount",
      [getAddress(alice.account.address)],
    );
  });
});
