//SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

interface IFactory {
    function pairCodeHash() external pure returns (bytes32);
}
