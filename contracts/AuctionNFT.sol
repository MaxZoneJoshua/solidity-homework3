// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";

contract AuctionNFT is ERC721, ERC721URIStorage, Ownable {
    uint256 private _tokenIdCounter;

    uint256 public constant MAX_SUPPLY = 10_000;
    uint256 public mintPrice = 0.01 ether;

    event NFTMinted(address indexed minter, uint256 indexed tokenId, string uri);
    event MintPriceUpdated(uint256 newPrice);

    constructor(address initialOwner) ERC721("AuctionNFT", "ANFT") Ownable(initialOwner) {}

    function mint(address to, string calldata uri) external payable onlyOwner returns (uint256) {
        require(to != address(0), "Invalid recipient");
        require(_tokenIdCounter < MAX_SUPPLY, "Max supply has reached");
        require(msg.value >= mintPrice, "Insufficient price");

        uint256 newTokenId = ++_tokenIdCounter;
        _safeMint(to, newTokenId);
        _setTokenURI(newTokenId, uri);

        emit NFTMinted(to, newTokenId, uri);
        return newTokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function totalSupply() external view returns (uint256) {
        return _tokenIdCounter;
    }

    function withdraw() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "Withdraw failed");
    }

    function setMintPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        mintPrice = newPrice;
        emit MintPriceUpdated(newPrice);
    }
}
