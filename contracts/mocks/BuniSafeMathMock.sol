// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

// Imports

import "../utils/BuniSafeMath.sol";

// Contracts
contract BuniSafeMathMock {
    function bmul(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.bmul(a, b);
    }

    function bdiv(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.bdiv(a, b);
    }

    function bsub(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.bsub(a, b);
    }

    function badd(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.badd(a, b);
    }

    function bmod(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.bmod(a, b);
    }

    function bmax(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.bmax(a, b);
    }

    function bmin(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.bmin(a, b);
    }

    function baverage(uint a, uint b) external pure returns (uint) {
        return BuniSafeMath.baverage(a, b);
    }
}