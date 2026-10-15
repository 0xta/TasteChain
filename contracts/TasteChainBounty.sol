// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface ITasteChainRegistry {
    function getPioneers(bytes32 placeHash) external view returns (address[3] memory, uint8);
}

/**
 * @title TasteChainBounty
 * @dev Escrow contract for restaurant marketing bounties on Avalanche Fuji.
 * Features:
 * - fundBounty: merchants deposit AVAX to fund per-visit rewards
 * - claimReward: onlyOracle access control, 70% Reviewer, 5% Pioneers, 25% Protocol Treasury
 * - safe transfer using .call{value:}
 * - auto-deactivation when remaining < rewardPerVisit
 */
contract TasteChainBounty {
    address public protocolTreasury;
    address public oracleAddress;          // Backend Oracle wallet — only caller of claimReward
    ITasteChainRegistry public registry;

    struct BountyPool {
        address merchant;
        uint256 remainingAvax;
        uint256 rewardPerVisit;
        uint256 totalClaims;
        bool active;
    }

    mapping(bytes32 => BountyPool) public placeBounties;

    event BountyFunded(bytes32 indexed placeHash, address indexed merchant, uint256 amount, uint256 rewardPerVisit);
    event RewardPaid(bytes32 indexed placeHash, address indexed reviewer, uint256 reviewerAmount, uint256 pioneerAmount, uint256 treasuryAmount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    modifier onlyOracle() {
        require(msg.sender == oracleAddress, "Only oracle can call");
        _;
    }

    modifier onlyOwner() {
        require(msg.sender == protocolTreasury, "Only owner");
        _;
    }

    constructor(address _registryAddress, address _treasury, address _oracle) {
        require(_registryAddress != address(0), "Invalid registry");
        require(_treasury != address(0), "Invalid treasury");
        require(_oracle != address(0), "Invalid oracle");
        registry = ITasteChainRegistry(_registryAddress);
        protocolTreasury = _treasury;
        oracleAddress = _oracle;
    }

    /// @notice Merchant deposits AVAX to fund a bounty campaign for their venue
    function fundBounty(bytes32 placeHash, uint256 rewardPerVisit) external payable {
        require(msg.value >= rewardPerVisit, "Deposit < reward per visit");
        require(rewardPerVisit > 0, "Reward must be > 0");

        BountyPool storage pool = placeBounties[placeHash];
        pool.merchant = msg.sender;
        pool.remainingAvax += msg.value;
        pool.rewardPerVisit = rewardPerVisit;
        pool.active = true;

        emit BountyFunded(placeHash, msg.sender, msg.value, rewardPerVisit);
    }

    /// @notice Oracle calls this after verifying Proof-of-Visit (slip OCR + GPS + photo)
    /// @dev Access restricted to oracleAddress only — prevents unauthorized fund drain
    function claimReward(bytes32 placeHash, address reviewer) external onlyOracle {
        require(reviewer != address(0), "Invalid reviewer");
        BountyPool storage pool = placeBounties[placeHash];
        require(pool.active && pool.remainingAvax >= pool.rewardPerVisit, "Bounty pool insufficient");

        uint256 payout = pool.rewardPerVisit;
        pool.remainingAvax -= payout;
        pool.totalClaims++;

        if (pool.remainingAvax < pool.rewardPerVisit) {
            pool.active = false; // Auto-deactivate when depleted
        }

        // Revenue Split: 70% Reviewer, 5% Pioneers, 25% Treasury
        uint256 reviewerShare  = (payout * 70) / 100;
        uint256 treasuryShare  = (payout * 25) / 100;
        uint256 pioneerTotal   = payout - reviewerShare - treasuryShare; // 5%

        // Pay reviewer
        (bool s1,) = payable(reviewer).call{value: reviewerShare}("");
        require(s1, "Reviewer transfer failed");

        // Pay treasury
        (bool s2,) = payable(protocolTreasury).call{value: treasuryShare}("");
        require(s2, "Treasury transfer failed");

        // Split pioneer share among 1-3 pioneers equally
        (address[3] memory pioneers, uint8 count) = registry.getPioneers(placeHash);
        if (count > 0) {
            uint256 perPioneer = pioneerTotal / count;
            for (uint8 i = 0; i < count; i++) {
                if (pioneers[i] != address(0)) {
                    (bool s3,) = payable(pioneers[i]).call{value: perPioneer}("");
                    require(s3, "Pioneer transfer failed");
                }
            }
        } else {
            // No pioneers yet — pioneer share goes to treasury
            (bool s4,) = payable(protocolTreasury).call{value: pioneerTotal}("");
            require(s4, "Fallback transfer failed");
        }

        emit RewardPaid(placeHash, reviewer, reviewerShare, pioneerTotal, treasuryShare);
    }

    /// @notice Check remaining bounty for a venue
    function getBountyInfo(bytes32 placeHash) external view returns (
        address merchant, uint256 remaining, uint256 rewardPerVisit, uint256 totalClaims, bool active
    ) {
        BountyPool storage p = placeBounties[placeHash];
        return (p.merchant, p.remainingAvax, p.rewardPerVisit, p.totalClaims, p.active);
    }

    /// @notice Owner can update oracle address if needed
    function setOracle(address _newOracle) external onlyOwner {
        require(_newOracle != address(0), "Invalid oracle");
        address oldOracle = oracleAddress;
        oracleAddress = _newOracle;
        emit OracleUpdated(oldOracle, _newOracle);
    }

    /// @notice Allow contract to receive native AVAX
    receive() external payable {}
}
