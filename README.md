# Vabble DAO Smart contract

- DAO smart contract.
- Staking.
- Audit Service
- FilmBoard
- Deployment
- Assets store

## Diagram flow
![image](https://user-images.githubusercontent.com/44410798/172245583-e01f3d29-46f1-4fda-864c-4a52d4e190bc.png)

- A customer can rent a film for 72 hours.
- If enough VAB(governance token) is in the customer's DAO account then Vabble payment gateway service will process some logic, if not enogh funds, then the streaming service will reject and alert user about unavailable VAB.

## Staking -
- Vab holders must be staking to receive voting rights.
- Stakers must cast a vote within a 30day period to receive staking reward.
  - Condition. If there are no perposals during the 30 day period from when the user locked, they get the rewards.
  - Otherwise, it is a percentage of proposals voted on. Example. 10 proposals but only voted on 5, 50% of rewards will be issued.
- Locking
  - Inital start of staking, there is a 30 days lock on the VAB.
  - After the 30 days, they can claim the rewards.
  - If they add more VAB, it increases the lock on the whole balance for 30 days.
- Staking Rewards
  - The rewards should pay out 0.02% of the available pool balance over a 30 day period.
  - The more weight (_More VAB Held_) the more of the rewards they get.
  - The rewards will be based on if they participated in the purposals in day of the lock for 30 days.
  - If VAB is added, the 30 day lock is reset.
  - Rewards only become available after the 30 days to calculate if they particitaped or not in the perposals.
  - Allow the user to relock for each 30 days without having them withdraw, allow them to re-stake.

## Audit Service
- Vabble audit service will submit periodically the audit actions to DAO contract.
- DAO contract has ability as follows:
  1) Ability to add definition for films
      - Each studio will be able to define the addresses based on % (this can be individuals who the studio agrees to pay a certain % of VAB recieved by the viewers) and NFT address to those who get a % of revenue.
  2) Ability to approve actions
      - Move VAB to appropriate accounts and approve actions
  3) Vote by VAB Stakers
    - Auditor governance by the VAB holders:
      - A purposal to change the auditor address will need be a significant amount of VAB to vote on this change. Because this is an attack vector, there will need to be a grade period of 30 days to overturn the purposal. 
        - At least 150 million VAB Stakeing required to pass the governance to change from current auditor address to new address over a 30 day period, and then 30 days to dispute the purposal will require double the amount of VAB to vote agenst. (60 Days Total)
 
 ## Governance
 - All of the properties of the governance shold be able to change with a perposal of more than .
 - Film Governance are by the **film board** and **VAB Stakers**. If passes by >=51%, perposal is accepted. If <=50% proposal rejected.
      - **Film Perposals:**
        - If the perposal is for funding of a film, the studio has the ability to set the amount of VAB they are seeking to raise for the film.
        - If the vote is for simply listing a film on the platform without needing funding and passes with majority vote, the status of the film can be listed in the smart contract.

## Manage the Vault(Treasury).
- Rewards vault, Revenue vault

 ## FilmBoard
 - Are whitelisted addresses and voted on by the stakers.
 - Film board addresses are whitelisted as part of community but whitelist address carry more weight per vote.
  - Filmboard max weight is 30%
    - _Example:_ If only half of board vote, that equates to 15%, leaving a remainder of 85% to be made up by community.
      

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
