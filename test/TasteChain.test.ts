import { expect } from "chai";
import { ethers } from "hardhat";
import { TasteChainRegistry, TasteChainBounty } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TasteChain Protocol — Unit Tests (Phase 2)", function () {
  let registry: TasteChainRegistry;
  let bounty: TasteChainBounty;

  let owner: HardhatEthersSigner;
  let treasury: HardhatEthersSigner;
  let oracle: HardhatEthersSigner;
  let merchant: HardhatEthersSigner;
  let reviewer1: HardhatEthersSigner;
  let reviewer2: HardhatEthersSigner;
  let reviewer3: HardhatEthersSigner;
  let reviewer4: HardhatEthersSigner;

  const testPlaceId = "ChIJe_8_Ci6Z4jARqgBTNie9XqE"; // Somboon Seafood Ban That Thong
  const testPlaceHash = ethers.keccak256(ethers.toUtf8Bytes(testPlaceId));

  const makeSlipHash = (refId: string) => ethers.keccak256(ethers.toUtf8Bytes(refId));

  beforeEach(async function () {
    [owner, treasury, oracle, merchant, reviewer1, reviewer2, reviewer3, reviewer4] =
      await ethers.getSigners();

    // 1. Deploy TasteChainRegistry
    const RegistryFactory = await ethers.getContractFactory("TasteChainRegistry");
    registry = await RegistryFactory.deploy();
    await registry.waitForDeployment();

    // 2. Deploy TasteChainBounty
    const BountyFactory = await ethers.getContractFactory("TasteChainBounty");
    bounty = await BountyFactory.deploy(
      await registry.getAddress(),
      treasury.address,
      oracle.address
    );
    await bounty.waitForDeployment();
  });

  describe("1. TasteChainRegistry Tests", function () {
    it("T2.1: recordReview succeeds and emits ReviewRecorded event", async function () {
      const slipHash = makeSlipHash("REF001");
      await expect(registry.connect(reviewer1).recordReview(testPlaceHash, slipHash, 5))
        .to.emit(registry, "ReviewRecorded")
        .withArgs(testPlaceHash, reviewer1.address, slipHash, 5);

      const info = await registry.getPlaceInfo(testPlaceHash);
      expect(info[1]).to.equal(1n); // totalReviews = 1
    });

    it("T2.2: First reviewer gets Pioneer slot 1", async function () {
      const slipHash = makeSlipHash("REF001");
      await expect(registry.connect(reviewer1).recordReview(testPlaceHash, slipHash, 5))
        .to.emit(registry, "PioneerRegistered")
        .withArgs(testPlaceHash, reviewer1.address, 1);

      const [pioneers, count] = await registry.getPioneers(testPlaceHash);
      expect(count).to.equal(1);
      expect(pioneers[0]).to.equal(reviewer1.address);
    });

    it("T2.3: Second reviewer gets Pioneer slot 2", async function () {
      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);
      await expect(registry.connect(reviewer2).recordReview(testPlaceHash, makeSlipHash("REF002"), 4))
        .to.emit(registry, "PioneerRegistered")
        .withArgs(testPlaceHash, reviewer2.address, 2);

      const [pioneers, count] = await registry.getPioneers(testPlaceHash);
      expect(count).to.equal(2);
      expect(pioneers[1]).to.equal(reviewer2.address);
    });

    it("T2.4: Third reviewer gets Pioneer slot 3", async function () {
      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);
      await registry.connect(reviewer2).recordReview(testPlaceHash, makeSlipHash("REF002"), 4);
      await expect(registry.connect(reviewer3).recordReview(testPlaceHash, makeSlipHash("REF003"), 5))
        .to.emit(registry, "PioneerRegistered")
        .withArgs(testPlaceHash, reviewer3.address, 3);

      const [pioneers, count] = await registry.getPioneers(testPlaceHash);
      expect(count).to.equal(3);
      expect(pioneers[2]).to.equal(reviewer3.address);
    });

    it("T2.5: Fourth reviewer does NOT get a Pioneer slot (slots full)", async function () {
      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);
      await registry.connect(reviewer2).recordReview(testPlaceHash, makeSlipHash("REF002"), 4);
      await registry.connect(reviewer3).recordReview(testPlaceHash, makeSlipHash("REF003"), 5);

      // 4th review
      await expect(registry.connect(reviewer4).recordReview(testPlaceHash, makeSlipHash("REF004"), 5))
        .to.not.emit(registry, "PioneerRegistered");

      const [pioneers, count] = await registry.getPioneers(testPlaceHash);
      expect(count).to.equal(3);
    });

    it("T2.6: recordReview with duplicate slipHash reverts 'Slip already used'", async function () {
      const slipHash = makeSlipHash("REF_DUPLICATE");
      await registry.connect(reviewer1).recordReview(testPlaceHash, slipHash, 5);

      await expect(
        registry.connect(reviewer2).recordReview(testPlaceHash, slipHash, 4)
      ).to.be.revertedWith("Slip already used");
    });

    it("T2.7: recordReview with rating 0 reverts 'Invalid rating'", async function () {
      await expect(
        registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 0)
      ).to.be.revertedWith("Invalid rating");
    });

    it("T2.8: recordReview with rating 6 reverts 'Invalid rating'", async function () {
      await expect(
        registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 6)
      ).to.be.revertedWith("Invalid rating");
    });

    it("T2.9: getPioneers returns address[3] and count correctly", async function () {
      const [pioneersInit, countInit] = await registry.getPioneers(testPlaceHash);
      expect(countInit).to.equal(0);
      expect(pioneersInit[0]).to.equal(ethers.ZeroAddress);

      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);
      const [pioneersAfter, countAfter] = await registry.getPioneers(testPlaceHash);
      expect(countAfter).to.equal(1);
      expect(pioneersAfter[0]).to.equal(reviewer1.address);
      expect(pioneersAfter[1]).to.equal(ethers.ZeroAddress);
    });
  });

  describe("2. TasteChainBounty Tests", function () {
    const depositAmount = ethers.parseEther("1.0"); // 1 AVAX
    const rewardPerVisit = ethers.parseEther("0.1"); // 0.1 AVAX

    it("T2.10: fundBounty transfers AVAX into contract and emits BountyFunded", async function () {
      await expect(
        bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: depositAmount })
      )
        .to.emit(bounty, "BountyFunded")
        .withArgs(testPlaceHash, merchant.address, depositAmount, rewardPerVisit);

      const pool = await bounty.getBountyInfo(testPlaceHash);
      expect(pool.remaining).to.equal(depositAmount);
      expect(pool.active).to.be.true;
      expect(await ethers.provider.getBalance(await bounty.getAddress())).to.equal(depositAmount);
    });

    it("T2.11: fundBounty with value < rewardPerVisit reverts", async function () {
      await expect(
        bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, {
          value: ethers.parseEther("0.05"),
        })
      ).to.be.revertedWith("Deposit < reward per visit");
    });

    it("T2.12: claimReward from Oracle distributes 70% Reviewer, 25% Treasury, 5% Pioneers", async function () {
      // 1 pioneer registered
      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);

      // fund 1 AVAX, reward 0.1 AVAX
      await bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: depositAmount });

      const reviewerBalBefore = await ethers.provider.getBalance(reviewer2.address);
      const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);
      const pioneerBalBefore = await ethers.provider.getBalance(reviewer1.address);

      // Oracle claims reward for reviewer2
      await expect(bounty.connect(oracle).claimReward(testPlaceHash, reviewer2.address))
        .to.emit(bounty, "RewardPaid")
        .withArgs(
          testPlaceHash,
          reviewer2.address,
          ethers.parseEther("0.07"), // 70%
          ethers.parseEther("0.005"), // 5%
          ethers.parseEther("0.025") // 25%
        );

      expect(await ethers.provider.getBalance(reviewer2.address)).to.equal(
        reviewerBalBefore + ethers.parseEther("0.07")
      );
      expect(await ethers.provider.getBalance(treasury.address)).to.equal(
        treasuryBalBefore + ethers.parseEther("0.025")
      );
      expect(await ethers.provider.getBalance(reviewer1.address)).to.equal(
        pioneerBalBefore + ethers.parseEther("0.005")
      );
    });

    it("T2.13: claimReward from non-Oracle reverts 'Only oracle can call'", async function () {
      await bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: depositAmount });

      await expect(
        bounty.connect(reviewer1).claimReward(testPlaceHash, reviewer1.address)
      ).to.be.revertedWith("Only oracle can call");
    });

    it("T2.14: claimReward when pool is insufficient reverts 'Bounty pool insufficient'", async function () {
      const smallDeposit = ethers.parseEther("0.1");
      await bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: smallDeposit });

      // First claim succeeds
      await bounty.connect(oracle).claimReward(testPlaceHash, reviewer1.address);

      // Second claim should revert
      await expect(
        bounty.connect(oracle).claimReward(testPlaceHash, reviewer2.address)
      ).to.be.revertedWith("Bounty pool insufficient");
    });

    it("T2.15: claimReward with 1 Pioneer gives 100% of 5% share to that single Pioneer", async function () {
      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);
      await bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: depositAmount });

      const pioneerBalBefore = await ethers.provider.getBalance(reviewer1.address);
      await bounty.connect(oracle).claimReward(testPlaceHash, reviewer2.address);

      expect(await ethers.provider.getBalance(reviewer1.address)).to.equal(
        pioneerBalBefore + ethers.parseEther("0.005")
      );
    });

    it("T2.16: claimReward with 3 Pioneers splits 5% equally among all 3", async function () {
      await registry.connect(reviewer1).recordReview(testPlaceHash, makeSlipHash("REF001"), 5);
      await registry.connect(reviewer2).recordReview(testPlaceHash, makeSlipHash("REF002"), 5);
      await registry.connect(reviewer3).recordReview(testPlaceHash, makeSlipHash("REF003"), 5);

      await bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: depositAmount });

      const p1Before = await ethers.provider.getBalance(reviewer1.address);
      const p2Before = await ethers.provider.getBalance(reviewer2.address);
      const p3Before = await ethers.provider.getBalance(reviewer3.address);

      await bounty.connect(oracle).claimReward(testPlaceHash, reviewer4.address);

      const expectedPerPioneer = ethers.parseEther("0.005") / 3n;
      expect(await ethers.provider.getBalance(reviewer1.address)).to.equal(p1Before + expectedPerPioneer);
      expect(await ethers.provider.getBalance(reviewer2.address)).to.equal(p2Before + expectedPerPioneer);
      expect(await ethers.provider.getBalance(reviewer3.address)).to.equal(p3Before + expectedPerPioneer);
    });

    it("T2.17: claimReward when NO pioneers exist sends pioneer 5% share to Treasury", async function () {
      await bounty.connect(merchant).fundBounty(testPlaceHash, rewardPerVisit, { value: depositAmount });

      const treasuryBalBefore = await ethers.provider.getBalance(treasury.address);
      await bounty.connect(oracle).claimReward(testPlaceHash, reviewer1.address);

      // Treasury receives 25% + 5% fallback = 30% of 0.1 AVAX = 0.03 AVAX
      expect(await ethers.provider.getBalance(treasury.address)).to.equal(
        treasuryBalBefore + ethers.parseEther("0.03")
      );
    });

    it("T2.18: Pool auto-deactivates when remaining balance < rewardPerVisit", async function () {
      const exactOneReward = ethers.parseEther("0.1");
      await bounty.connect(merchant).fundBounty(testPlaceHash, exactOneReward, { value: exactOneReward });

      const before = await bounty.getBountyInfo(testPlaceHash);
      expect(before.active).to.be.true;

      await bounty.connect(oracle).claimReward(testPlaceHash, reviewer1.address);

      const after = await bounty.getBountyInfo(testPlaceHash);
      expect(after.remaining).to.equal(0n);
      expect(after.active).to.be.false;
    });

    it("T2.19: setOracle by owner succeeds and emits OracleUpdated", async function () {
      const newOracle = reviewer4.address;
      await expect(bounty.connect(treasury).setOracle(newOracle))
        .to.emit(bounty, "OracleUpdated")
        .withArgs(oracle.address, newOracle);

      expect(await bounty.oracleAddress()).to.equal(newOracle);
    });

    it("T2.20: setOracle by non-owner reverts 'Only owner'", async function () {
      await expect(
        bounty.connect(reviewer1).setOracle(reviewer2.address)
      ).to.be.revertedWith("Only owner");
    });
  });
});
