# Vabble DAO Smart contract

- [DAO smart contract](https://github.com/Vabble/dao-sc#diagram-flow)
- [Staking](https://github.com/Vabble/dao-sc#staking--)
- [Audit Service](https://github.com/Vabble/dao-sc#audit-service)
- [Governance](https://github.com/Vabble/dao-sc#governance)
- [Manage the Vault (Treasury)](https://github.com/Vabble/dao-sc#manage-the-vaulttreasury)
- [FilmBoard](https://github.com/Vabble/dao-sc#filmboard)
- [Deployment](https://github.com/Vabble/dao-sc#deployment)
- [Assets store](https://github.com/Vabble/dao-sc#assets-store)

## Diagram flow
![image](https://user-images.githubusercontent.com/44410798/172245583-e01f3d29-46f1-4fda-864c-4a52d4e190bc.png)

- A customer can rent a film for 72 hours.
- If enough VAB (governance token) is in the customer's DAO account then Vabble payment gateway service will process some logic, if not enough funds, then the streaming service will reject and alert user about unavailable VAB.

## Staking -
- Vab holders must be staking to receive voting rights.
- In order to vote, the user has to be staking.
- Locking
  - Allow the user to stop staking, and withdraw after the length of their last proposal vote as long as it's over the length of time for a proposal, plus the initial 30 days.
  - If they add more VAB, it increases the lock on the whole balance for 30 days.
- Staking Rewards
  - The rewards should pay out 0.01% of the available pool balance over a 30-day period.
    - Only for film funding votes: 50% of the reward will be locked until the film is funded, and released based on film metrics.
    - Metrics:
      - Reward for correct vote: 0.0001% of the available pool balance. (_Note: The reason it's so low, because we want it to cost more for the proposal, than the reward for being able to game the rewards_)
      - How to determine correct vote: Average revenue per film (_Look at Audit Service -> #4_), then if the film preforms better than over 50% of the average film in the smart contract, that reward would be sent back to the address up to 100% of the reward, otherwise it will be sent to the rewards pool.
      - Have a check method that any user can call that will loop through the funded films, and check to see if the performance metric has been meet on all funded films. Then any films where not meet for over 2 years, then the rewards get released back to the rewards pool. _(Designed so that the user have to pay the fee)_
        - Exception: If the film is delisted before those 2 years, then the funds are released back to the rewards pool. 
  - The more weight (_More VAB Held_) the more of the rewards they get.
  - The rewards will be based on if they participated in the proposals in day of the lock for 30 days.
  - If VAB is added, the 30-day lock is reset.
  - Rewards only become available after the 30 days to calculate if they participated or not in the proposals.

## Voting Options
- Yes, No and Abstain.

## Audit Service
- Vabble audit service will submit periodically the audit actions to DAO contract.
- DAO contract has ability as follows:
  1) Ability to add the price of VAB when the video was rented.
  2) Ability to approve actions
      - Move VAB to appropriate accounts and approve actions
  3) Vote by VAB Stakers
    - Auditor governance by the VAB holders:
      - A proposal to change the auditor address will need be a significant amount of VAB (_At least 150 million staked VAB_) to vote on this change over a 30-day period. Because this is an attack vector, there will need to be a grade period of 30 days to dispute the proposal. This will require double the amount of VAB Staked to vote agents. (60 Days Total)
  4) Average over film revenue once every week.
 
 ## Governance
 - To start **ANY** proposal we will charge $100 worth of VAB using the UniswapRouter as a price aggregator, this VAB will go into the rewards pool.
 - All of the properties of the governance should be able to change with a proposal of more than **75m** staked VAB.
 - Film Governance are by the **film board** and **VAB Stakers**. If passes by >=51%, proposal is accepted, otherwise it's rejected.
      - **Film Proposals:**
        - If the proposal is for funding of a film, the studio has the ability to set the amount of VAB they are seeking to raise for the film.
          - Two ways a film can be funded:
            - 1. Community Vote.
            - 2. No Vote
              - If the studio decides to add the film to funding without a vote, this will still be approved, but will be with a different status APPROVED_WITHOUTVOTE
              - An additional fee of double the price of the proposal. Example: $100 worth of VAB for a voted proposal $200 of VAB for a non-voted proposal (Gets paid back into the rewards pool).
        - If the vote is for simply listing a film on the platform without needing funding and passes with majority vote, the status of the film can be listed in the smart contract.

## Studio 
- After a film is added to the smart contract as successfully listed, each studio will be able to define the addresses based on % (this can be individuals who the studio agrees to pay a certain % of VAB received by the viewers) and NFT address to those who get a % of revenue.
- The studio will also be able to define if they want to accept a static amount of VAB (100 VAB) or if they want to use the Vabble aggregator to get $1 for 100% of the film.

## Manage the Vault (Treasury).
- Staking vault and rewards vault will all have properties of how much users will be rewarded, and for these properties to change, there will need to be a governance vote.

## FilmBoard
 - Are whitelisted addresses and voted on by the stakers.
  - A proposal is created with the case to be added to the film board, where stakers can vote.
 - Film board addresses carry more weight per vote **only for funding of films**.
  - Filmboard max weight is 30%
    - _Example:_ If only half of board vote, that equates to 15%, leaving a remainder of 85% to be made up by community.
 - Rewards to the film board 25% higher than the community rewards for voting only for funding of films.
 - If a member of the film board does **NOT** vote on any proposal over 3 months amount of time, the person is removed from the film board.

## Funding (Launch Pad)
### Funding Raise from Tokens:
 - Once the funding is approved for a film funding proposal then users can deposit VAB (Minimum $50, Maximum $5000 per address) for that film
 - Allow the studio that created the proposal to define how many days to keep the funding pool open.
 - If funding fails to meet the amount requested to raise, then return the funds back to the users (A method for the studio or anyone to kick off).
 - Allow the studio to raise in VAB and/or USDT and/or USDC.
 - 2% fee on the amount raised.
    - Whatever funds are raised in VAB, the fee gets added to the rewards pool.
    - Any other asset like USDT, USDC or ETH, the fee will be sold by the UniswapRouter and VAB bought, then VAB deposited into the rewards pool.
### Funding Raise from NFT's:
 - Allow the studio to define the amount of NFT's they want to sell to fund the film, like an NFT marketplace for them to sell the NFT's, and raise funds for that film.
 - It's open indefinitely until sold out.
 - Funds from purchased NFT go straight to the studio.
 - Allow studio to define the collection fee NFT up to 10%.
 - 2% of the initial sell of the NFT will be charged, and the 2% fee automatically sold from the USDT/USDC/ETH, and buy VAB from the UniswapRouter, then put into the rewards pool.
 - Studio's define the film what % of revenue of the NFT.
    - Example: 1000 NFT's are minted, the studio can say each NFT get's 0.01% of the revenue each, and the rest is defined by the studioPayee rules set in the film. (Director, Actor, etc..)


## Other Information:
### Deployment
  1) Testnet Rinkeby
    - VAB:   
  2) Mainnet Ethereum
    - VAB: 0xe7aE6D0C56CACaf007b7e4d312f9af686a9E9a04
  3) Other networks(BSC, Polygon)
    - VAB: 

### Assets store
  - User
    Customer
  - Auditor
    Asset Manager


- EIP1967 pattern implementation
