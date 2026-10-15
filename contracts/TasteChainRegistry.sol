// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title TasteChainRegistry
 * @dev Manages restaurant Pioneer slots (first 3 reviewers) and records verified review hashes.
 * Uses bytes32 placeHash = keccak256(abi.encodePacked(placeId)) for gas efficiency.
 */
contract TasteChainRegistry {
    address public owner;

    struct PlaceInfo {
        address[3] pioneers;
        uint8 pioneerCount;
        uint256 totalReviews;
    }

    // Mapping: placeHash => PlaceInfo
    mapping(bytes32 => PlaceInfo) public places;

    // Anti-replay: slipHash => already used
    mapping(bytes32 => bool) public usedSlipHashes;

    event PioneerRegistered(bytes32 indexed placeHash, address indexed pioneer, uint8 slotIndex);
    event ReviewRecorded(bytes32 indexed placeHash, address indexed reviewer, bytes32 indexed slipHash, uint8 rating);

    constructor() {
        owner = msg.sender;
    }

    /**
     * @notice Record a verified review and auto-assign Pioneer slot if available.
     * @param placeHash keccak256(abi.encodePacked(placeId))
     * @param slipHash SHA-256 hash of the bank transaction reference ID
     * @param rating 1-5 star rating
     */
    function recordReview(
        bytes32 placeHash,
        bytes32 slipHash,
        uint8 rating
    ) external returns (bool isPioneer, uint8 pioneerSlot) {
        require(rating >= 1 && rating <= 5, "Invalid rating");
        require(!usedSlipHashes[slipHash], "Slip already used");

        usedSlipHashes[slipHash] = true;
        places[placeHash].totalReviews++;

        emit ReviewRecorded(placeHash, msg.sender, slipHash, rating);

        // Auto-assign Pioneer slot if < 3 pioneers exist
        if (places[placeHash].pioneerCount < 3) {
            uint8 slot = places[placeHash].pioneerCount;
            places[placeHash].pioneers[slot] = msg.sender;
            places[placeHash].pioneerCount++;
            emit PioneerRegistered(placeHash, msg.sender, slot + 1);
            return (true, slot + 1);
        }

        return (false, 0);
    }

    /**
     * @notice Get Pioneer addresses and count for a place
     */
    function getPioneers(bytes32 placeHash) external view returns (address[3] memory, uint8) {
        return (places[placeHash].pioneers, places[placeHash].pioneerCount);
    }

    /**
     * @notice Get place stats (pioneerCount, totalReviews)
     */
    function getPlaceInfo(bytes32 placeHash) external view returns (uint8 pioneerCount, uint256 totalReviews) {
        PlaceInfo storage p = places[placeHash];
        return (p.pioneerCount, p.totalReviews);
    }
}
