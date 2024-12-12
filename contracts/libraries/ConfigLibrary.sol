    // SPDX-License-Identifier: MIT
pragma solidity ^0.8.4;

library ConfigLibrary {
    enum PropertyListIndex {
        FILM_VOTE_PERIOD, // 0
        AGENT_VOTE_PERIOD, // 1
        DISPUTE_GRACE_PERIOD, // 2
        PROPERTY_VOTE_PERIOD, // 3
        LOCK_PERIOD, // 4
        REWARD_RATE, // 5
        FILM_REWARD_CLAIM_PERIOD, // 6
        MAX_ALLOW_PERIOD, // 7
        PROPOSAL_FEE_AMOUNT, // 8
        FUND_FEE_PERCENT, // 9
        MIN_DEPOSIT_AMOUNT, // 10
        MAX_DEPOSIT_AMOUNT, // 11
        MAX_MINT_FEE_PERCENT, // 12
        MIN_VOTE_COUNT, // 13
        MIN_STAKER_COUNT_PERCENT, // 14
        AVAILABLE_VAB_AMOUNT, // 15
        BOARD_VOTE_PERIOD, // 16
        BOARD_VOTE_WEIGHT, // 17
        REWARD_VOTE_PERIOD, // 18
        SUBSCRIPTION_AMOUNT, // 19
        BOARD_REWARD_RATE // 20

    }

    struct PropertyTimePeriodConfig {
        uint256 filmVotePeriod;
        uint256 agentVotePeriod;
        uint256 disputeGracePeriod;
        uint256 propertyVotePeriod;
        uint256 lockPeriod;
        uint256 filmRewardClaimPeriod;
        uint256 maxAllowPeriod;
        uint256 boardVotePeriod;
        uint256 rewardVotePeriod;
    }

    struct PropertyRatesConfig {
        uint256 rewardRate;
        uint256 fundFeePercent;
        uint256 maxMintFeePercent;
        uint256 minStakerCountPercent;
        uint256 boardVoteWeight;
        uint256 boardRewardRate;
    }

    struct PropertyAmountsConfig {
        uint256 proposalFeeAmount;
        uint256 minDepositAmount;
        uint256 maxDepositAmount;
        uint256 availableVABAmount;
        uint256 subscriptionAmount;
        uint256 minVoteCount;
    }

    struct PropertyMinMaxListConfig {
        uint256[] minPropertyList;
        uint256[] maxPropertyList;
    }
}
