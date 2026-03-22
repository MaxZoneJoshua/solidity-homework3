// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockV3Aggregator {
    uint8 public immutable decimals;
    string public constant description = "MockV3Aggregator";
    uint256 public constant version = 1;

    int256 private _answer;
    uint80 private _roundId;
    uint256 private _updatedAt;

    constructor(uint8 decimals_, int256 initialAnswer) {
        decimals = decimals_;
        updateAnswer(initialAnswer);
    }

    function updateAnswer(int256 newAnswer) public {
        _answer = newAnswer;
        _roundId += 1;
        _updatedAt = block.timestamp;
    }

    function latestRoundData()
        external
        view
        returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)
    {
        return (_roundId, _answer, _updatedAt, _updatedAt, _roundId);
    }

    function getRoundData(uint80 roundId)
        external
        view
        returns (uint80, int256, uint256, uint256, uint80)
    {
        return (roundId, _answer, _updatedAt, _updatedAt, roundId);
    }
}
