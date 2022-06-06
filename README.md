# Vabble DAO Smart contract

- DAO smart contract.

## Diagram flow
- A customer rent a film for 72 hours after login.
- If VAB(governance token) enough in customer's account then Vabble payment gateway service process some logic, not reject and alert user about unavailable funds(VAB)
- Vabble audit service submit periodically the audit actions to DAO contract
- DAO contract has ability as follows
  1) Ability to add definition for films
    - Each studio will be able to define the addresses based on %(this cab be individuals who the studio agrees to pay a certain % of revenue) and NFT address to those who get a % of revenue
  2) Ability to approve actions
    - Move VAB to appropriate accounts and Approve actions
  3) Vote by VAB holders
    - VAB holders can vote on the address that has the ability to be the auditor
  4) Manage the Vault(Treasury) 
    - Rewards vault, Revenue vault

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
