// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC2981} from "@openzeppelin/contracts/interfaces/IERC2981.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title NFTAuctionMarket
/// @notice 支持 ETH / ERC20 出价的 NFT 拍卖市场，包含平台手续费与 ERC2981 版税结算。
contract NFTAuctionMarket is ReentrancyGuard, ERC721Holder {
    using SafeERC20 for IERC20;

    struct Auction {
        address seller;
        address nftContract;
        uint256 tokenId;
        address paymentToken; // address(0) 表示 ETH
        uint256 startPrice;
        uint256 highestBid;
        address highestBidder;
        uint256 endTime;
        bool active;
    }

    error InvalidAddress();
    error InvalidAmount();
    error InvalidDuration();
    error InvalidAuction();
    error AuctionNotActive();
    error AuctionNotEnded();
    error AuctionAlreadyEnded();
    error SellerCannotBid();
    error BidTooLow(uint256 minimumBid);
    error NotFeeRecipient();
    error UnsupportedPaymentToken();
    error TransferFailed();
    error InvalidRoyalty(uint256 fee, uint256 royalty, uint256 salePrice);

    uint256 public constant BPS_DENOMINATOR = 10_000;
    uint256 public constant MAX_PLATFORM_FEE = 1_000; // 10%

    mapping(uint256 auctionId => Auction) public auctions;
    mapping(uint256 auctionId => mapping(address bidder => uint256 amount)) public pendingReturns;

    uint256 public auctionCounter;
    uint256 public platformFee = 250; // 2.5%
    address public feeRecipient;

    event AuctionCreated(
        uint256 indexed auctionId,
        address indexed seller,
        address indexed nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 startPrice,
        uint256 endTime
    );

    event BidPlaced(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        address paymentToken
    );

    event AuctionEnded(
        uint256 indexed auctionId,
        address indexed winner,
        uint256 finalPrice,
        address paymentToken
    );

    event PendingReturnWithdrawn(
        uint256 indexed auctionId,
        address indexed bidder,
        uint256 amount,
        address paymentToken
    );

    event PlatformFeeUpdated(uint256 newFee);
    event FeeRecipientUpdated(address indexed newRecipient);

    constructor(address _feeRecipient) {
        if (_feeRecipient == address(0)) revert InvalidAddress();
        feeRecipient = _feeRecipient;
    }

    /// @notice 创建拍卖并将 NFT 托管到市场合约。
    /// @param nftContract NFT 合约地址。
    /// @param tokenId NFT tokenId。
    /// @param paymentToken 支付代币，address(0) 表示 ETH。
    /// @param startPrice 起拍价。
    /// @param durationHours 拍卖持续时间，单位小时。
    function createAuction(
        address nftContract,
        uint256 tokenId,
        address paymentToken,
        uint256 startPrice,
        uint256 durationHours
    ) external returns (uint256 auctionId) {
        if (nftContract == address(0)) revert InvalidAddress();
        if (startPrice == 0) revert InvalidAmount();
        if (durationHours == 0) revert InvalidDuration();
        if (paymentToken != address(0) && paymentToken.code.length == 0) {
            revert UnsupportedPaymentToken();
        }

        IERC721 nft = IERC721(nftContract);
        if (nft.ownerOf(tokenId) != msg.sender) revert InvalidAuction();

        auctionId = ++auctionCounter;
        uint256 endTime = block.timestamp + (durationHours * 1 hours);

        auctions[auctionId] = Auction({
            seller: msg.sender,
            nftContract: nftContract,
            tokenId: tokenId,
            paymentToken: paymentToken,
            startPrice: startPrice,
            highestBid: 0,
            highestBidder: address(0),
            endTime: endTime,
            active: true
        });

        nft.safeTransferFrom(msg.sender, address(this), tokenId);

        emit AuctionCreated(
            auctionId,
            msg.sender,
            nftContract,
            tokenId,
            paymentToken,
            startPrice,
            endTime
        );
    }

    /// @notice 对拍卖出价。ETH 拍卖时 amount 必须等于 msg.value；ERC20 拍卖时需要提前 approve。
    function placeBid(uint256 auctionId, uint256 amount) external payable nonReentrant {
        Auction storage auction = auctions[auctionId];
        if (!auction.active) revert AuctionNotActive();
        if (block.timestamp >= auction.endTime) revert AuctionAlreadyEnded();
        if (msg.sender == auction.seller) revert SellerCannotBid();

        uint256 minimumBid = getMinimumBid(auctionId);
        if (amount < minimumBid) revert BidTooLow(minimumBid);

        if (auction.paymentToken == address(0)) {
            if (msg.value != amount) revert InvalidAmount();
        } else {
            if (msg.value != 0) revert InvalidAmount();
            IERC20(auction.paymentToken).safeTransferFrom(msg.sender, address(this), amount);
        }

        if (auction.highestBidder != address(0)) {
            pendingReturns[auctionId][auction.highestBidder] += auction.highestBid;
        }

        auction.highestBid = amount;
        auction.highestBidder = msg.sender;

        emit BidPlaced(auctionId, msg.sender, amount, auction.paymentToken);
    }

    /// @notice 提取被超越后的退款。
    function withdrawPendingReturn(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        uint256 refund = pendingReturns[auctionId][msg.sender];
        if (refund == 0) revert InvalidAmount();

        pendingReturns[auctionId][msg.sender] = 0;
        _payout(auction.paymentToken, msg.sender, refund);

        emit PendingReturnWithdrawn(auctionId, msg.sender, refund, auction.paymentToken);
    }

    /// @notice 结束拍卖。任何人都可以在拍卖结束后调用。
    function endAuction(uint256 auctionId) external nonReentrant {
        Auction storage auction = auctions[auctionId];
        if (!auction.active) revert AuctionNotActive();
        if (block.timestamp < auction.endTime) revert AuctionNotEnded();

        auction.active = false;

        IERC721 nft = IERC721(auction.nftContract);

        if (auction.highestBidder == address(0)) {
            nft.safeTransferFrom(address(this), auction.seller, auction.tokenId);
            emit AuctionEnded(auctionId, address(0), 0, auction.paymentToken);
            return;
        }

        uint256 fee = (auction.highestBid * platformFee) / BPS_DENOMINATOR;
        (address royaltyReceiver, uint256 royaltyAmount) = _getRoyaltyInfo(
            auction.nftContract,
            auction.tokenId,
            auction.highestBid
        );

        if (fee + royaltyAmount > auction.highestBid) {
            revert InvalidRoyalty(fee, royaltyAmount, auction.highestBid);
        }

        uint256 sellerAmount = auction.highestBid - fee - royaltyAmount;

        nft.safeTransferFrom(address(this), auction.highestBidder, auction.tokenId);

        if (royaltyAmount > 0 && royaltyReceiver != address(0)) {
            _payout(auction.paymentToken, royaltyReceiver, royaltyAmount);
        }
        if (fee > 0) {
            _payout(auction.paymentToken, feeRecipient, fee);
        }
        _payout(auction.paymentToken, auction.seller, sellerAmount);

        emit AuctionEnded(
            auctionId,
            auction.highestBidder,
            auction.highestBid,
            auction.paymentToken
        );
    }

    /// @notice 返回当前最小可接受出价。
    function getMinimumBid(uint256 auctionId) public view returns (uint256) {
        Auction memory auction = auctions[auctionId];
        if (!auction.active) revert AuctionNotActive();
        return auction.highestBid == 0 ? auction.startPrice : auction.highestBid + 1;
    }

    /// @notice 设置平台手续费，只有手续费接收地址可调用。
    function setPlatformFee(uint256 newFee) external {
        if (msg.sender != feeRecipient) revert NotFeeRecipient();
        if (newFee > MAX_PLATFORM_FEE) revert InvalidAmount();
        platformFee = newFee;
        emit PlatformFeeUpdated(newFee);
    }

    /// @notice 更新手续费接收地址，只有当前手续费接收地址可调用。
    function updateFeeRecipient(address newRecipient) external {
        if (msg.sender != feeRecipient) revert NotFeeRecipient();
        if (newRecipient == address(0)) revert InvalidAddress();
        feeRecipient = newRecipient;
        emit FeeRecipientUpdated(newRecipient);
    }

    function _getRoyaltyInfo(
        address nftContract,
        uint256 tokenId,
        uint256 salePrice
    ) internal view returns (address receiver, uint256 royaltyAmount) {
        try IERC165(nftContract).supportsInterface(type(IERC2981).interfaceId) returns (bool supported) {
            if (supported) {
                return IERC2981(nftContract).royaltyInfo(tokenId, salePrice);
            }
        } catch {}

        return (address(0), 0);
    }

    function _payout(address paymentToken, address to, uint256 amount) internal {
        if (amount == 0) return;

        if (paymentToken == address(0)) {
            (bool success, ) = payable(to).call{value: amount}("");
            if (!success) revert TransferFailed();
        } else {
            IERC20(paymentToken).safeTransfer(to, amount);
        }
    }
}
