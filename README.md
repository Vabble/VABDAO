# Vabble DAO Smart contract

- DAO smart contract.

## Diagram flow
![image](https://user-images.githubusercontent.com/44410798/172245583-e01f3d29-46f1-4fda-864c-4a52d4e190bc.png)

- A customer can rent a film for 72 hours.
- If enough VAB(governance token) is in the customer's DAO account then Vabble payment gateway service will process some logic, if not enogh funds, then the streaming service will reject and alert user about unavailable VAB.

## Staking -
- Vab holders must be staking to receive voting rights.
- Stakers must cast a vote within a 30day period to receive staking reward.
- Condition. If proposal = zero during 30 day period, everyone receives reward.
- Otherwise, it is a percentage of proposals voted on. Example. 10 proposals but only voted on 5, 50% of rewards will be issued.
- Locking
  - Inital start of staking, there is a 30 days lock on the VAB.
  - After the 30 days, they can claim the rewards.
  - If they add more VAB, it increases the lock on the whole balance for 30 days.
- Staking Rewards
  - The rewards will be paid at a rate of 0.02% of the available pool balance.
  - The more weight (More VAB Held) the more of the rewards they get.
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
  3) Vote by VAB holders
    - Auditor governance by the VAB holders:
      - A purposal to change the auditor address will need be a significant amount of VAB to vote on this change. Because this is an attack vector, there will need to be a grade period of 30 days to overturn the purposal. 
        - For example at least 100 million VAB required to pass the governance to change from current auditor address to new address, and then 30 days to overturn the purposal will require double the amount of VAB to vote agenst.
 
 ## Governance
 - Film Governance by the VAB holders
      - Vote if a film should be listed on the platform.
        - If the vote is for funding of a film, have the ability to hold the ability to get hold a defined amount of VAB for the film.
        - If the vote is for simply listing a film on the platform and passes with majority vote, the film ID will be added to the smart contract.
  4) Manage the Vault(Treasury).
      - Rewards vault, Revenue vault
  - If film is already funded, studio will select non funded. Film will go to community Vote. Film ID added to Smart Contract
  - If film needs funding, studio creates prospoal for film. Proposal goes to community vote. If passes by 51%, goes to funding. If <49% proposal rejected.

 ## FilmBoard
 - Are whitelisted addresses and voted on by the stakers.
 - Film board addresses are whitelisted as part of community but whitelist address carry more weight per vote.
 - Filmboard max weight is 30%
    - Example: If only half of board vote, that equates to 15%, leaving a remainder of 85% to be made up by community.
      

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
  - Admin
    Asset Manager



- EIP1967 pattern implementation
