// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {NFTAuctionMarket} from "./NFTAuctionMarket.sol";

/// @title NFTAuctionMarketV2
/// @notice 示例升级版本：在保持原有存储布局的前提下新增市场名称功能。
contract NFTAuctionMarketV2 is NFTAuctionMarket {
    string public marketName;

    event MarketNameUpdated(string newMarketName);

    function initializeV2(string calldata initialMarketName) external reinitializer(2) onlyMarketAdmin {
        marketName = initialMarketName;
        emit MarketNameUpdated(initialMarketName);
    }

    function setMarketName(string calldata newMarketName) external onlyMarketAdmin {
        marketName = newMarketName;
        emit MarketNameUpdated(newMarketName);
    }

    function version() external pure override returns (uint256) {
        return 2;
    }
}
