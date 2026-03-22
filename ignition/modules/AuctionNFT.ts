import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("AuctionNFTModule", (m) => {
  const owner = m.getParameter("owner", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266");

  const auctionNft = m.contract("AuctionNFT", [owner]);

  return { auctionNft };
});
