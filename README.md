<div align="center">
<h1 align="center">
<img src="https://github.com/Vabble/assets/blob/main/logo/Fill/Fill_LogoVabble_128x128.png" width="100" />
<br>VabbleDAO</h1>
<h3>◦ Unlocking decentralized media possibilities!</h3>
<h3>◦ Developed with the software and tools below.</h3>

<p align="center">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style&logo=JavaScript&logoColor=black" alt="JavaScript" />
<img src="https://img.shields.io/badge/Prettier-F7B93E.svg?style&logo=Prettier&logoColor=black" alt="Prettier" />
<img src="https://img.shields.io/badge/Chai-A30701.svg?style&logo=Chai&logoColor=white" alt="Chai" />
<img src="https://img.shields.io/badge/JSON-000000.svg?style&logo=JSON&logoColor=white" alt="JSON" />
<img src="https://img.shields.io/badge/Markdown-000000.svg?style&logo=Markdown&logoColor=white" alt="Markdown" />
</p>
<img src="https://img.shields.io/github/license/Vabble/VabbleDAO?style&color=5D6D7E" alt="GitHub license" />
<img src="https://img.shields.io/github/last-commit/Vabble/VabbleDAO?style&color=5D6D7E" alt="git-last-commit" />
<img src="https://img.shields.io/github/commit-activity/m/Vabble/VabbleDAO?style&color=5D6D7E" alt="GitHub commit activity" />
<img src="https://img.shields.io/github/languages/top/Vabble/VabbleDAO?style&color=5D6D7E" alt="GitHub top language" />
</div>

---

## 📖 Table of Contents
- [📖 Table of Contents](#-table-of-contents)
- [📍 Overview](#-overview)
- [📂 Repository Structure](#-repository-structure)
- [⚙️ Modules](#-modules)
- [🚀 Getting Started](#-getting-started)
    - [🔧 Installation](#-installation)
    - [🤖 Running VabbleDAO](#-running-VabbleDAO)
    - [🧪 Tests](#-tests)
- [🤝 Contributing](#-contributing)

---


## 📍 Overview

The project is a decentralized application (dApp) that aims to facilitate film funding and distribution through blockchain technology. It provides a platform for studios to create and manage film-specific non-fungible tokens (NFTs) and subscription NFTs. Users can activate and manage subscriptions for renting films, and usera can deposit tokens into film funding pools. The project offers robust contract functionality, secure asset management, and integration with external APIs and decentralized exchanges. Overall, it aims to revolutionize the film industry by leveraging blockchain technology for transparent and efficient film funding and distribution.

---



## 📂 Repository Structure

```sh
└── VabbleDAO/
    ├── .env.example
    ├── .gitignore
    ├── .prettierrc.js
    ├── contracts/
    │   ├── dao/
    │   ├── interfaces/
    │   ├── libraries/
    │   └── mocks/
    ├── data/
    │   ├── ERC20.json
    │   └── ERC721.json
    ├── deploy/
    │   ├── deploy_factory_film_nft.js
    │   ├── deploy_factory_sub_nft.js
    │   ├── deploy_factory_tier_nft.js
    │   ├── deploy_ownablee.js
    │   ├── deploy_property.js
    │   ├── deploy_staking_pool.js
    │   ├── deploy_subscription.js
    │   ├── deploy_uni_helper.js
    │   ├── deploy_vabble_dao.js
    │   ├── deploy_vabble_funding.js
    │   └── deploy_vote.js
    ├── deploy_address.txt
    ├── hardhat.config.js
    ├── LICENSE
    ├── package.json
    ├── README.md
    ├── scripts/
    │   ├── deploy_mock_vab.js
    │   └── utils.js
    └── test/
        ├── factoryFilmNFT.test.js
        ├── factorySubNFT.test.js
        ├── main.test.js
        ├── owner.test.js
        ├── research.js
        ├── stakingPool.test.js
        ├── subscription.test.js
        ├── vabbleDAO.test.js
        └── vote.test.js
```


---

## ⚙️ Modules

<details closed><summary>Root</summary>

| File                                                                                                           | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---                                                                                                            | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [.prettierrc.js](https://github.com/Vabble/VabbleDAO/blob/master/.prettierrc.js)                                    | The code in the.prettierrc.js file sets up formatting rules for different file types. For *.sol files, it disables bracket spacing, sets the print width to 130 characters, indents with 4 spaces, uses spaces instead of tabs, enforces explicit types, and disables single quotes. For *.js files, it sets the print width to 120 characters, adds semicolons, removes trailing commas, and enforces the use of single quotes.                                                                                                                 |
| [deploy_address.txt](https://github.com/Vabble/VabbleDAO/blob/master/deploy_address.txt)                            | Addresses of deployed contracts                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [hardhat.config.js](https://github.com/Vabble/VabbleDAO/blob/master/hardhat.config.js)                              | This code is a configuration file for the Hardhat development environment. It sets up various networks, deploys contracts, and provides gas reporting. It also integrates with external APIs for etherscan and coinmarketcap.                                                                                                                                                                                                                                                                                                                    |
| [FactoryFilmNFT.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/FactoryFilmNFT.sol)              | The FactoryFilmNFT contract allows studios to create and manage film-specific non-fungible tokens (NFTs). Studios can set minting information, deploy NFT contracts per film, and mint NFTs to specific addresses. The contract also handles token payments, fee distribution, and integrates with other contracts such as the VabbleDAO and StakingPool.                                                                                                                                                                                        |
| [FactorySubNFT.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/FactorySubNFT.sol)                | The FactorySubNFT contract is responsible for creating and managing subscription NFTs. It allows users to mint NFTs for a specific subscription period and locks them for a specified duration. It also handles the transfer of payment tokens and the deployment of the VabbleNFT contract. The contract includes various functions for minting, locking, and unlocking NFTs, as well as retrieving information about minting and locking details.                                                                                              |
| [FactoryTierNFT.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/FactoryTierNFT.sol)              | The FactoryTierNFT contract is responsible for creating and managing tiered NFTs for films. It allows film owners to set tier information based on the amount funded in their films. It also enables the deployment of tiered NFT contracts and the minting of tiered NFTs based on the funded amount. The contract includes functions to retrieve information about tiered NFTs and their owners.                                                                                                                                           |
| [Ownablee.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/Ownablee.sol)                          | The "Ownablee" contract is responsible for managing ownership and various functionalities related to depositing and withdrawing assets. It allows for setting up contracts, adding and removing deposit assets, changing the Vabble wallet address, and performing deposits and withdrawals of VAB tokens. It also includes modifiers to restrict access to certain functions.                                                                                                                                                                   |
| [Property.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/Property.sol)                          | The contract manages proposals related to film projects, including auditor replacements, DAO fund rewards, film board memberships, and property updates, ensuring participation and fee payment by stakeholders. It also allows the modification of member addresses and logs activities through events.                                                                                                                                                                                                                                                                                                                                                                           |
| [StakingPool.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/StakingPool.sol)                    | The "StakingPool" contract is a Solidity smart contract that manages staking, rewards, and film rental deposits. Users can stake tokens for rewards, withdraw rewards, and deposit tokens for film rentals. Auditors oversee pending withdrawals, and rewards are calculated based on stake duration, voting activity, and proposals during the staking period within a broader ecosystem.                                                                                                                                                                                                                                                                                                                                                                                        |
| [Subscription.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/Subscription.sol)                  | The Subscription contract allows users to activate and manage their subscriptions for renting films. Users can pay with various tokens, and the contract handles the conversion and transfer of funds. It includes functionality for calculating expected subscription amounts, checking if subscriptions are active, and adding discount percentages. The contract is secure and prevents reentrancy attacks.                                                                                                                                   |
| [UniHelper.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/UniHelper.sol)                        | The UniHelper contract is a solidity smart contract that provides functionalities for interacting with Uniswap and Sushiswap decentralized exchanges. It allows users to swap tokens, calculate expected amounts, and handle asset transfers. The contract is designed to work with ERC20 tokens and ETH, and it integrates with Uniswap and Sushiswap routers and factories for decentralized exchange operations.                                                                                                                              |
| [VabbleDAO.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/VabbleDAO.sol)                        | The VabbleDAO contract is a part of a decentralized film proposal and funding system on Ethereum. Users can create film proposals, which can be approved or rejected through voting. It handles the allocation of funds, studio pools, and final film distribution with an auditor overseeing the process.                                                                                                                                                                                                                                                                                                                                                                                      |
| [VabbleFunding.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/VabbleFunding.sol)                | The VabbleFunding contract is responsible for handling the funding process of films on the Vabble platform. It allows users to deposit tokens or native currency into a specific film's funding pool. After the funding period ends, the contract facilitates the distribution of funds to the film's owner and the reward pool. Users can also withdraw their funds if the funding target is not reached. The contract keeps track of the deposited assets per film and user, as well as the list of processed and withdrawn films. |
| [VabbleNFT.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/VabbleNFT.sol)                        | The VabbleNFT contract is an ERC721 token contract that represents non-fungible tokens (NFTs) on the Vabble platform. It includes functionalities for minting NFTs, transferring NFTs, and retrieving token metadata. It also implements the ERC2981 standard for royalty fees. The contract supports enumeration of tokens and provides a collection URI for the entire token collection. The contract is integrated with the Vabble Factory contract, which controls the minting process.                                                      |
| [Vote.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/dao/Vote.sol)                                  | This Solidity contract outlines a voting system on the Ethereum blockchain for various purposes, including voting for films, agents, film boards, reward addresses, and properties. It employs events, structures, and functions to enable voting, approvals, and updates, and utilizes modifiers to enforce permissions and conditions. The contract is initialized and interacts with various external contracts, ensuring only stakers can vote and applying conditions for voting eligibility, counting, and approval mechanisms.                                                                                                                                                                                                                                                                                                                                                                                                  |
| [IFactoryFilmNFT.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IFactoryFilmNFT.sol)     | This code defines an interface for a factory contract that creates film NFTs. It provides functions to retrieve information about minting parameters, film token IDs, and raised amounts for a specific film.                                                                                                                                                                                                                                                                                                                                    |
| [IOwnablee.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IOwnablee.sol)                 | The "IOwnablee.sol" interface defines functions related to ownership and asset management. It includes functions to handle the replacement of an auditor, check if an asset can be deposited, retrieve the list of deposit assets, and get addresses for various tokens. It also includes functions to add funds to a studio pool and withdraw funds from an edge pool.                                                                                                                                                                          |
| [IProperty.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IProperty.sol)                 | The "IProperty" interface defines the core functionalities and properties related to property voting and governance. It includes methods to retrieve and update various parameters, such as voting periods, fee amounts, reward rates, and whitelist management. It also provides functions to track and manage property and governance proposal times.                                                                                                                                                                                          |
| [IStakingPool.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IStakingPool.sol)           | This code defines the interface for a staking pool contract. It includes functions to manage stake amounts, withdrawal times, vote counts, reward distribution, and VAB transfers.                                                                                                                                                                                                                                                                                                                                                               |
| [IUniHelper.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IUniHelper.sol)               | The IUniHelper interface defines two core functionalities for a helper contract. It provides a method to calculate the expected amount when swapping assets and another method to actually perform the asset swap.                                                                                                                                                                                                                                                                                                                               |
| [IUniswapV2Factory.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IUniswapV2Factory.sol) | The code defines an interface for the Uniswap V2 Factory contract. It includes functions to get and create pairs of tokens, set fee addresses, and retrieve information about existing pairs.                                                                                                                                                                                                                                                                                                                                                    |
| [IUniswapV2Router.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IUniswapV2Router.sol)   | The code provides an interface for interacting with the UniswapV2Router2 contract on the Uniswap decentralized exchange. It includes functions for adding and removing liquidity, swapping tokens for tokens or ETH, and getting token exchange rates.                                                                                                                                                                                                                                                                                           |
| [IVabbleDAO.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IVabbleDAO.sol)               | IVabbleDAO is an interface that defines the core functionalities for managing film proposals and funding in the VabbleDAO system. It includes functions for retrieving film details, approving proposals by voting, enabling claimers, and interacting with the studio pool.                                                                                                                                                                                                                                                                     |
| [IVabbleFunding.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IVabbleFunding.sol)       | The IVabbleFunding interface provides functions to retrieve the raised funding amount for a specific film by token ID, as well as the fund amount per film for a specific customer.                                                                                                                                                                                                                                                                                                                                                              |
| [IVote.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/interfaces/IVote.sol)                         | The code defines an interface for the "Vote" contract, specifying a function to retrieve the last vote time for a given member.                                                                                                                                                                                                                                                                                                                                                                                                                  |
| [Helper.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/libraries/Helper.sol)                        | The Helper.sol library provides various safe transfer functions for different types of tokens (ERC20, ERC721, ERC1155). It also includes utility functions for token approval and checking if an address is a smart contract.                                                                                                                                                                                                                                                                                                                    |
| [MockERC1155.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/mocks/MockERC1155.sol)                  | The MockERC1155 contract extends the ERC1155 contract from the OpenZeppelin library. It sets a URI for each token and mints three different tokens with their corresponding names and quantities, which are "Kitty", "Dog", and "Dolphin".                                                                                                                                                                                                                                                                                                       |
| [MockERC20.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/mocks/MockERC20.sol)                      | The code is a mock ERC20 token contract that inherits from the OpenZeppelin ERC20 implementation. It allows the token owner to mint tokens, sets a supply limit, and implements a faucet function to distribute tokens within a defined limit. The contract is also Ownable, granting exclusive access and control to the owner.                                                                                                                                                                                                                 |
| [MockERC721.sol](https://github.com/Vabble/VabbleDAO/blob/master/contracts/mocks/MockERC721.sol)                    | The code is a mock ERC721 contract that inherits from the ERC721Enumerable and Ownable contracts. It allows the owner to mint tokens, either individually or in batches, with a unique tokenURI for each token.                                                                                                                                                                                                                                                                                                                                  |
| [deploy_factory_film_nft.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_factory_film_nft.js)     | This code is used to deploy the FactoryFilmNFT contract with specified arguments. It retrieves the addresses of other deployed contracts (Ownablee and UniHelper) and initializes the FactoryFilmNFT contract with these addresses.                                                                                                                                                                                                                                                                                                              |
| [deploy_factory_sub_nft.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_factory_sub_nft.js)       | This code is responsible for deploying the'FactorySubNFT' smart contract. It retrieves the addresses of other deployed contracts ('Ownablee' and'UniHelper') and uses them as arguments during deployment.                                                                                                                                                                                                                                                                                                                                       |
| [deploy_factory_tier_nft.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_factory_tier_nft.js)     | This code deploys a contract called FactoryTierNFT, using the addresses of three other contracts (Ownablee, VabbleDAO, and VabbleFunding) as arguments. It ensures the deployment is logged and not skipped if already deployed.                                                                                                                                                                                                                                                                                                                 |
| [deploy_ownablee.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_ownablee.js)                     | The code deploys the Ownablee contract with configurable parameters based on the network. The contract is deployed with the necessary arguments and logs the deployment.                                                                                                                                                                                                                                                                                                                                                                         |
| [deploy_property.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_property.js)                     | This code is responsible for deploying the "Property" contract. It retrieves the addresses of the required contracts, sets the deployment arguments, and deploys the contract using the deploy function.                                                                                                                                                                                                                                                                                                                                         |
| [deploy_staking_pool.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_staking_pool.js)             | The code deploys a StakingPool contract using the Ownablee contract's address as an argument. It also has some commented out code for initializing the deployed contract with other contract addresses.                                                                                                                                                                                                                                                                                                                                          |
| [deploy_subscription.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_subscription.js)             | This code is responsible for deploying the Subscription contract on the blockchain. It fetches the necessary contract addresses and deploys the Subscription contract with the required arguments. The code ensures logs are generated and allows for redeployment if needed.                                                                                                                                                                                                                                                                    |
| [deploy_uni_helper.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_uni_helper.js)                 | This code is responsible for deploying the "UniHelper" contract. It determines the contract deployment based on the network (Mumbai, Ethereum, or Polygon) and sets the necessary factory and router addresses. It then deploys the contract with the specified arguments and options.                                                                                                                                                                                                                                                           |
| [deploy_vabble_dao.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_vabble_dao.js)                 | The code deploys the VabbleDAO contract by fetching the addresses of several other contracts (Ownablee, UniHelper, Vote, StakingPool, Property, FactoryFilmNFT) and passing them as arguments. It also handles deployment logging and dependency management.                                                                                                                                                                                                                                                                                     |
| [deploy_vabble_funding.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_vabble_funding.js)         | The code deploys the VabbleFunding contract by fetching the addresses of other deployed contracts from the development network. The VabbleFunding contract requires the addresses of six contracts as arguments: Ownablee, UniHelper, StakingPool, Property, FilmNFTFactory, and VabbleDAO.                                                                                                                                                                                                                                                      |
| [deploy_vote.js](https://github.com/Vabble/VabbleDAO/blob/master/deploy/deploy_vote.js)                             | The code is a deployment script for the "Vote" contract. It retrieves the address of the "Ownablee" contract, and then deploys the "Vote" contract with that address as an argument. The script allows for logging and ensures the contract is not already deployed.                                                                                                                                                                                                                                                                             |
| [deploy_mock_vab.js](https://github.com/Vabble/VabbleDAO/blob/master/scripts/deploy_mock_vab.js)                    | This code deploys a mock ERC20 token contract called'MockERC20' with the name'Vabble' and symbol'VAB'. It skips deployment if already deployed and logs deployment details.                                                                                                                                                                                                                                                                                                                                                                      |
| [utils.js](https://github.com/Vabble/VabbleDAO/blob/master/scripts/utils.js)                                        | The code in utils.js provides various utility functions and constants for the project. It includes addresses and configurations for different networks, token types, statuses, and discounts. It also provides functions for generating random addresses and numbers, converting numbers to BigIntegers, and getting signatures. Additionally, it includes data for films, NFTs, and proposals, along with functions for encoding and decoding the data.                                                                                         |
| [factoryFilmNFT.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/factoryFilmNFT.test.js)               | This test is for the FactoryFilmNFT contract. It involves setting up various smart contracts and entities including tokens, DAO, staking pools, voting, and NFTs for films and tiers. The test checks if these contracts are deployed correctly, if the functions related to voting, staking, and NFT minting work as expected, and ensures only authorized users can call specific functions, all while handling different types of tokens (e.g., VAB, EXM, USDC).                                                                                                                                                                                                                                                                                                                                                                                                   |
| [factorySubNFT.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/factorySubNFT.test.js)                 | This test sets up smart contract instances and tokens, and tests the deployment, minting, and interactions with the FactorySubscriptionNFT contract, ensuring functions like minting NFTs and permissions are working as expected. Only auditors can deploy and mint tokens.                                                                                                                                                                                                                                                                                                                                                                                               |
| [main.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/main.test.js)                                   | The code consists of multiple test files for various functionalities, including testing the owner, vote, vabbleDAO, stakingPool, factoryFilmNFT, factorySubNFT, subscription, and research.                                                                                                                                                                                                                                                                                                                                                      |
| [owner.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/owner.test.js)                                 | The code in the file "owner.test.js" sets up and tests the core functionalities of the Ownablee contract. It initializes several other contracts and performs tests related to transferring ownership and adding/removing deposit assets.                                                                                                                                                                                                                                                                                                        |
| [research.js](https://github.com/Vabble/VabbleDAO/blob/master/test/research.js)                                     | The code is a test script for the VabbleDAO functionality. It sets up various contract factories and deploy contracts, transfers tokens, initializes a staking pool, and proposes films by studios. It also includes assertions to verify the expected behavior.                                                                                                                                                                                                                                                                                 |
| [stakingPool.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/stakingPool.test.js)                     | The test script is for Ethereum smart contracts, involving the initialization, staking, and unstaking of VAB tokens. It prepares multiple user roles, contracts, and tokens, simulating a staking pool in a voting context, and ensures correct behavior and constraints like lock periods and reward calculations are adhered to.                                                                                                                                                                                                                                                                                                                                                                                                  |
| [subscription.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/subscription.test.js)                   | The test script is for a subscription service on a blockchain, specifically Ethereum. It sets up various contracts and users, then tests the subscription activation process, checking for different periods and types of tokens (including VAB, USDC, and EXM). Time manipulation is used to test subscription expiration.                                                                                                                                                                                                                                                                                                                                                                                                |
| [vabbleDAO.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/vabbleDAO.test.js)                         | The test tests the Vab DAO, focusing on deploying contracts, managing film proposals, voting, and token allocations. It validates contract interactions, token balances, and ensures the DAO operates as expected, especially concerning film proposals and voting.                                                                                                                                                                                                                                                                                                                                                                                                |
| [vote.test.js](https://github.com/Vabble/VabbleDAO/blob/master/test/vote.test.js)                                   | The test tests the deployment of multiple contract factories and the proposal and voting process for changing property values, like film vote periods and reward rates. It includes initializing and testing the functionality of staking pools and voting contracts, handling token transfers, staking, proposing new property values, voting on them, and updating the properties after the vote.                                                                                                                                                                                                                                                                                                                                                                                                |

</details>

---

## 🚀 Getting Started

### 🔧 Installation

1. Clone the VabbleDAO repository:
```sh
git clone https://github.com/Vabble/VabbleDAO
```

2. Change to the project directory:
```sh
cd VabbleDAO
```

3. Install the dependencies:
```sh
►  npm install
```

### 🤖 Running VabbleDAO

```sh
► npm mumbai:deploy
```

### 🧪 Tests
```sh
► npm run test
```


---

## 🤝 Contributing

Contributions are always welcome! Please follow these steps:
1. Fork the project repository. This creates a copy of the project on your account that you can modify without affecting the original project.
2. Clone the forked repository to your local machine using a Git client like Git or GitHub Desktop.
3. Create a new branch with a descriptive name (e.g., `new-feature-branch` or `bugfix-issue-123`).
```sh
git checkout -b new-feature-branch
```
4. Make changes to the project's codebase.
5. Commit your changes to your local branch with a clear commit message that explains the changes you've made.
```sh
git commit -m 'Implemented new feature.'
```
6. Push your changes to your forked repository on GitHub using the following command
```sh
git push origin new-feature-branch
```
7. Create a new pull request to the original project repository. In the pull request, describe the changes you've made and why they're necessary.
The project maintainers will review your changes and provide feedback or merge them into the main branch.

---



[↑ Return](#Top)

---
