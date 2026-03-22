// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import {ERC1967Proxy} from "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

/// @title NFTAuctionMarketProxy
/// @notice NFTAuctionMarket 的 UUPS 代理壳合约，部署时传入实现合约地址和初始化 calldata。
contract NFTAuctionMarketProxy is ERC1967Proxy {
    constructor(address implementation, bytes memory initializationData)
        ERC1967Proxy(implementation, initializationData)
    {}
}
