<div align="center">
<h1 align="center">
<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/ec559a9f6bfd399b82bb44393651661b08aaf7ba/icons/folder-markdown-open.svg" width="100" />
<br>dao-sc</h1>
<h3>◦ Unlocking collaboration, revolutionizing code.</h3>
<h3>◦ Developed with the software and tools below.</h3>

<p align="center">
<img src="https://img.shields.io/badge/JavaScript-F7DF1E.svg?style&logo=JavaScript&logoColor=black" alt="JavaScript" />
<img src="https://img.shields.io/badge/Prettier-F7B93E.svg?style&logo=Prettier&logoColor=black" alt="Prettier" />
<img src="https://img.shields.io/badge/Chai-A30701.svg?style&logo=Chai&logoColor=white" alt="Chai" />
<img src="https://img.shields.io/badge/JSON-000000.svg?style&logo=JSON&logoColor=white" alt="JSON" />
<img src="https://img.shields.io/badge/Markdown-000000.svg?style&logo=Markdown&logoColor=white" alt="Markdown" />
</p>
<img src="https://img.shields.io/github/license/?style&color=5D6D7E" alt="GitHub license" />
<img src="https://img.shields.io/github/last-commit/?style&color=5D6D7E" alt="git-last-commit" />
<img src="https://img.shields.io/github/commit-activity/m/?style&color=5D6D7E" alt="GitHub commit activity" />
<img src="https://img.shields.io/github/languages/top/?style&color=5D6D7E" alt="GitHub top language" />
</div>

---

## 📖 Table of Contents
- [📖 Table of Contents](#-table-of-contents)
- [📍 Overview](#-overview)
- [📦 Features](#-features)
- [📂 Repository Structure](#-repository-structure)
- [⚙️ Modules](#modules)
- [🚀 Getting Started](#-getting-started)
    - [🔧 Installation](#-installation)
    - [🤖 Running dao-sc](#-running-dao-sc)
    - [🧪 Tests](#-tests)
- [🛣 Roadmap](#-roadmap)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👏 Acknowledgments](#-acknowledgments)

---


## 📍 Overview

The project is a decentralized application (DApp) for the Vabble platform, which focuses on film crowdfunding and NFT creation. It includes contracts for creating and managing film-specific NFTs, subscription-based ERC721 tokens, and tiered NFTs. The contracts handle various functionalities such as minting NFTs, managing subscriptions, facilitating asset swapping on decentralized exchanges, and handling the deposit, processing, and withdrawal of funds for film projects. The project aims to provide a decentralized and transparent platform for film crowdfunding, NFT creation, and subscription management, with the goal of revolutionizing the film industry and empowering creators.

---

## 📦 Features

|    | Feature            | Description                                                                                                             |
|----|--------------------|-------------------------------------------------------------------------------------------------------------------------|
| ⚙️ | **Architecture**   | The architectural design of the system could not be determined from the provided information.                         |
| 📄 | **Documentation**  | The quality and comprehensiveness of the documentation could not be determined from the provided information.          |
| 🔗 | **Dependencies**   | The external libraries or other systems that this system relies on could not be determined from the provided information. |
| 🧩 | **Modularity**     | The organization of the system into smaller, interchangeable components could not be determined from the provided information. |
| 🧪 | **Testing**        | The system's testing strategies and tools could not be determined from the provided information.                         |
| ⚡️ | **Performance**    | The performance of the system considering speed, efficiency, and resource usage could not be determined from the provided information. |
| 🔐 | **Security**       | The measures the system uses to protect data and maintain functionality could not be determined from the provided information. |
| 🔀 | **Version Control**| The system's version control strategies and tools could not be determined from the provided information.                    |
| 🔌 | **Integrations**   | The interaction of the system with other systems and services could not be determined from the provided information.       |
| 📶 | **Scalability**    | The system's ability to handle growth could not be determined from the provided information.                               |

---


## 📂 Repository Structure

```sh
└── dao-sc/
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
    ├── Docs.md
    ├── hardhat.config.js
    ├── package.json
    ├── readme-ai.md
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

| File                                                                                              | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---                                                                                               | ---                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| [.prettierrc.js](https://github.com//blob/main/.prettierrc.js)                                    | This code specifies the formatting options for JavaScript and Solidity files. It sets different configurations for each file type, including options for indentation, line length, quotation marks, and other formatting preferences. This ensures consistent code style and readability.                                                                                                                                                                                                                                                                                                |
| [deploy_address.txt](https://github.com//blob/main/deploy_address.txt)                            | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [hardhat.config.js](https://github.com//blob/main/hardhat.config.js)                              | This code is a configuration file for the Hardhat development environment. It sets up networks for different Ethereum chains, deploys contracts, and enables functionality such as gas reporting and named accounts. It also integrates with external services like Etherscan and Alchemy for API access.                                                                                                                                                                                                                                                                                |
| [FactoryFilmNFT.sol](https://github.com//blob/main/contracts\dao\FactoryFilmNFT.sol)              | The FactoryFilmNFT contract is responsible for creating and managing film-specific NFT contracts. It allows film studios to set minting information, deploy NFT contracts for their films, mint NFTs for users, handle payment, and track various statistics such as total supply and raised funds. The contract also interacts with other contracts such as the VabbleDAO, StakingPool, and UniHelper for various functionality.                                                                                                                                                        |
| [FactorySubNFT.sol](https://github.com//blob/main/contracts\dao\FactorySubNFT.sol)                | The FactorySubNFT contract is responsible for creating and minting subscription-based ERC721 tokens. It allows users to mint NFTs by paying a specified amount in a given token. The contract also handles locking and unlocking of NFTs based on predetermined lock periods. Additionally, it includes functions for retrieving NFT owner information, mint information per category, and lock information per token ID. It implements the IERC721Receiver interface for receiving ERC721 tokens.                                                                                       |
| [FactoryTierNFT.sol](https://github.com//blob/main/contracts\dao\FactoryTierNFT.sol)              | The FactoryTierNFT contract is responsible for creating and managing tiered NFTs. It allows studios to set tier information for their films, deploy tier NFT contracts, and mint tier NFTs based on the invested amount in a film's funding. It also provides functions to retrieve information about tier NFTs such as ownership, total supply, token ID lists, and token URIs. The contract ensures that only the film owner and the auditor can perform certain actions.                                                                                                              |
| [Ownablee.sol](https://github.com//blob/main/contracts\dao\Ownablee.sol)                          | The code in the `Ownablee.sol` contract implements various functionalities such as setting up contract addresses, managing deposit assets, transferring ownership, and handling token transfers. It includes modifiers to restrict access to certain functions.                                                                                                                                                                                                                                                                                                                          |
| [Property.sol](https://github.com//blob/main/contracts\dao\Property.sol)                          | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [StakingPool.sol](https://github.com//blob/main/contracts\dao\StakingPool.sol)                    | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [Subscription.sol](https://github.com//blob/main/contracts\dao\Subscription.sol)                  | The Subscription contract is responsible for handling the activation and management of user subscriptions. It allows users to activate a subscription by paying a specified amount of tokens for a certain period of time. The contract handles different types of tokens, including ETH, USDC, USDT, and VAB. It also incorporates a discount system based on the subscription period (3 months, 6 months, or 12 months). The contract keeps track of the user's subscription status and expiration time. Additionally, it provides functions to add and retrieve discount percentages. |
| [UniHelper.sol](https://github.com//blob/main/contracts\dao\UniHelper.sol)                        | The `UniHelper` contract is used to facilitate asset swapping on both Uniswap and Sushiswap decentralized exchanges. It allows users to estimate the amount of a token they will receive in a swap and perform the swap itself. The contract supports swapping both ERC20 tokens and ETH, and automatically transfers any remaining tokens or ETH back to the caller after the swap is completed.                                                                                                                                                                                        |
| [VabbleDAO.sol](https://github.com//blob/main/contracts\dao\VabbleDAO.sol)                        | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [VabbleFunding.sol](https://github.com//blob/main/contracts\dao\VabbleFunding.sol)                | The VabbleFunding contract facilitates the deposit, processing, and withdrawal of funds for film projects. Investors can deposit tokens to fund a film project, and if the funding meets the raise amount, a portion of the funds is sent to a reward pool. If the funding fails to meet the raise amount, investors can withdraw their funds. The contract tracks the deposited funds per film, investor lists, and processed film IDs.                                                                                                                                                 |
| [VabbleNFT.sol](https://github.com//blob/main/contracts\dao\VabbleNFT.sol)                        | The VabbleNFT contract is an ERC721 compatible contract for minting and managing NFTs. It supports functionalities such as minting NFTs, transferring NFTs, getting the total supply of NFTs, and retrieving token URIs. It also implements the ERC2981 standard for royalty payments.                                                                                                                                                                                                                                                                                                   |
| [Vote.sol](https://github.com//blob/main/contracts\dao\Vote.sol)                                  | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [IFactoryFilmNFT.sol](https://github.com//blob/main/contracts\interfaces\IFactoryFilmNFT.sol)     | This interface provides functions for retrieving information about film NFTs, including minting details, film token IDs, and the raised amount by an NFT.                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [IOwnablee.sol](https://github.com//blob/main/contracts\interfaces\IOwnablee.sol)                 | The code defines an interface called IOwnablee. It includes functions to get and replace the auditor's address, check if an asset is a deposit asset, get a list of deposit assets, retrieve addresses for specific tokens, add to a studio pool, and withdraw funds from an edge pool.                                                                                                                                                                                                                                                                                                  |
| [IProperty.sol](https://github.com//blob/main/contracts\interfaces\IProperty.sol)                 | The `IProperty` interface provides functions to access and update various properties related to voting periods, reward rates, fees, deposit amounts, etc. It also includes functions to manage whitelist addresses for rewards and board members. Additionally, it allows for tracking proposal approval times for properties and governance.                                                                                                                                                                                                                                            |
| [IStakingPool.sol](https://github.com//blob/main/contracts\interfaces\IStakingPool.sol)           | The code defines an interface for a Staking Pool contract with functionalities that include getting stake amount and withdrawable time, updating withdrawable time and vote count, adding rewards to the pool, managing limit count, tracking proposal creation, and managing sending VAB tokens.                                                                                                                                                                                                                                                                                        |
| [IUniHelper.sol](https://github.com//blob/main/contracts\interfaces\IUniHelper.sol)               | The code contains an interface called IUniHelper, which defines two functions. The expectedAmount function calculates the expected amount when swapping assets, and the swapAsset function performs the asset swap operation.                                                                                                                                                                                                                                                                                                                                                            |
| [IUniswapV2Factory.sol](https://github.com//blob/main/contracts\interfaces\IUniswapV2Factory.sol) | The code defines an interface for the UniswapV2Factory, which is responsible for creating and managing pairs of tokens in the Uniswap decentralized exchange. It includes functions for creating pairs, fetching pair addresses, and setting fee parameters.                                                                                                                                                                                                                                                                                                                             |
| [IUniswapV2Router.sol](https://github.com//blob/main/contracts\interfaces\IUniswapV2Router.sol)   | The code defines the interface for the UniswapV2Router contract, which provides functions for adding and removing liquidity, swapping tokens, and getting token amounts in a UniswapV2 exchange. It also includes functions for swapping tokens with ETH and vice versa.                                                                                                                                                                                                                                                                                                                 |
| [IVabbleDAO.sol](https://github.com//blob/main/contracts\interfaces\IVabbleDAO.sol)               | The IVabbleDAO interface consists of various functions that allow interaction with the Vabble DAO smart contract. These functions include retrieving film-related details such as funding amount, fund period, and financing type, as well as film status, owner, and proposal time. Other functions handle voting approval, enabling claimers, retrieving film shares, getting user film lists for migration, and withdrawing VAB tokens from the studio pool.                                                                                                                          |
| [IVabbleFunding.sol](https://github.com//blob/main/contracts\interfaces\IVabbleFunding.sol)       | The IVabbleFunding interface provides functions for retrieving raised funding amounts for a specific film token and the amount of funding a user has contributed to a film.                                                                                                                                                                                                                                                                                                                                                                                                              |
| [IVote.sol](https://github.com//blob/main/contracts\interfaces\IVote.sol)                         | The code provides an interface IVote to access the getLastVoteTime function from the Vote contract, allowing retrieval of the last vote time for a given member address in a DAO.                                                                                                                                                                                                                                                                                                                                                                                                        |
| [Helper.sol](https://github.com//blob/main/contracts\libraries\Helper.sol)                        | The Helper library in the contracts folder provides utility functions for safe transferring of assets, including tokens and ETH, as well as checking if an address is a contract. It also includes enums for status and token type.                                                                                                                                                                                                                                                                                                                                                      |
| [MockERC1155.sol](https://github.com//blob/main/contracts\mocks\MockERC1155.sol)                  | The code defines a mock ERC1155 token contract that extends the ERC1155 standard.It sets a URI that specifies the location format for token metadata.In the constructor, it mints three different tokens to the contract deployer with specified names and quantities.This contract is used for testing and demonstration purposes.                                                                                                                                                                                                                                                      |
| [MockERC20.sol](https://github.com//blob/main/contracts\mocks\MockERC20.sol)                      | The code is a mock implementation of an ERC20 token. It includes a faucet functionality to distribute tokens and sets an initial supply for the token. The contract is owned by the deployer and inherits from OpenZeppelin's ERC20 and Ownable contracts.                                                                                                                                                                                                                                                                                                                               |
| [MockERC721.sol](https://github.com//blob/main/contracts\mocks\MockERC721.sol)                    | The code is a mock implementation of an ERC721 token contract. It allows for minting tokens to a specified address and supports batch minting. The contract also includes functions to retrieve the token URI and base URI.                                                                                                                                                                                                                                                                                                                                                              |
| [deploy_factory_film_nft.js](https://github.com//blob/main/deploy\deploy_factory_film_nft.js)     | The code deploys the FactoryFilmNFT contract using the Ownablee and UniHelper contracts. It initializes the FactoryFilmNFT contract with the VabbleDAO, VabbleFunding, StakingPool, and Property contracts.                                                                                                                                                                                                                                                                                                                                                                              |
| [deploy_factory_sub_nft.js](https://github.com//blob/main/deploy\deploy_factory_sub_nft.js)       | The code deploys the'FactorySubNFT' smart contract by retrieving the addresses of'Ownablee' and'UniHelper' contracts. The contract is deployed by the'deployer' and the deployment process is logged. It has a dependency on'Ownablee' and'UniHelper'.                                                                                                                                                                                                                                                                                                                                   |
| [deploy_factory_tier_nft.js](https://github.com//blob/main/deploy\deploy_factory_tier_nft.js)     | This code is responsible for deploying the'FactoryTierNFT' smart contract. It takes the addresses of three other contracts ('Ownablee','VabbleDAO', and'VabbleFunding') as inputs. The deployment is logged and can be skipped if the contract is already deployed.                                                                                                                                                                                                                                                                                                                      |
| [deploy_ownablee.js](https://github.com//blob/main/deploy\deploy_ownablee.js)                     | This code deploys the Ownablee contract with specified arguments based on the selected network, using deployment configurations.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| [deploy_property.js](https://github.com//blob/main/deploy\deploy_property.js)                     | The code exports a function that deploys the "Property" contract, using the addresses of various other contracts as arguments.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [deploy_staking_pool.js](https://github.com//blob/main/deploy\deploy_staking_pool.js)             | The code deploys a StakingPool contract by calling the deploy function. It takes the address of an Ownablee contract as an argument. The StakingPool contract is initialized by passing addresses of other contracts (VabbleDAO, VabbleFunding, Property, Vote) to its initializePool function.                                                                                                                                                                                                                                                                                          |
| [deploy_subscription.js](https://github.com//blob/main/deploy\deploy_subscription.js)             | The code in `deploy_subscription.js` exports an async function that deploys a `Subscription` contract. It takes input arguments from the `getNamedAccounts` and `deployments` modules, as well as a discount value from the `utils` module. The deployed contract depends on three other contracts: `Ownablee`, `UniHelper`, and `Property`.                                                                                                                                                                                                                                             |
| [deploy_uni_helper.js](https://github.com//blob/main/deploy\deploy_uni_helper.js)                 | The code exports a function that deploys a contract called UniHelper using named accounts and deployment configurations based on the network. The function takes in arguments for the Uniswap and Sushiswap factories and routers. It also sets the UniHelper contract's deployment options.                                                                                                                                                                                                                                                                                             |
| [deploy_vabble_dao.js](https://github.com//blob/main/deploy\deploy_vabble_dao.js)                 | The code exports a function to deploy the VabbleDAO contract using ethers.js and named accounts. It retrieves the addresses of various contracts and passes them as arguments to the VabbleDAO contract deployment. The deployment is logged, and dependencies and tags are specified. The code aims to deploy the VabbleDAO contract based on specific contract addresses.                                                                                                                                                                                                              |
| [deploy_vabble_funding.js](https://github.com//blob/main/deploy\deploy_vabble_funding.js)         | The code deploys the VabbleFunding contract using the `deploy` function. It initializes the contract with the addresses of other required contracts, such as Ownablee, UniHelper, StakingPool, Property, FilmNFTFactory, and VabbleDAO. This code ensures the VabbleFunding contract is deployed with the correct dependencies and configurations.                                                                                                                                                                                                                                       |
| [deploy_vote.js](https://github.com//blob/main/deploy\deploy_vote.js)                             | The code deploys a'Vote' contract using the'Ownablee' contract as a dependency. It retrieves the deployer's address, gets the'Ownablee' contract address, and then deploys the'Vote' contract with the deployer's address as the sender.                                                                                                                                                                                                                                                                                                                                                 |
| [deploy_mock_vab.js](https://github.com//blob/main/scripts\deploy_mock_vab.js)                    | The code deploys a mock ERC20 token named "Vabble" with the symbol "VAB" using the deploy function. It ensures that the deployment is logged, non-deterministic, and only executed if the contract has not been deployed before. The code is tagged as'MockERC20' and has an identifier'deploy_vab'.                                                                                                                                                                                                                                                                                     |
| [utils.js](https://github.com//blob/main/scripts\utils.js)                                        | The code in utils.js provides various utility functions and configurations for working with Ethereum and Polygon networks. It includes constants, token addresses, contract factories, and helper functions for encoding and decoding data. It also has functions related to film data, NFTs, proposals, voting, and gate content.                                                                                                                                                                                                                                                       |
| [factoryFilmNFT.test.js](https://github.com//blob/main/test\factoryFilmNFT.test.js)               | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [factorySubNFT.test.js](https://github.com//blob/main/test\factorySubNFT.test.js)                 | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [main.test.js](https://github.com//blob/main/test\main.test.js)                                   | The code includes tests for owner, voting, and DAO functionalities. Additional tests for staking pool, NFT factories, subscription, and research are currently commented out.                                                                                                                                                                                                                                                                                                                                                                                                            |
| [owner.test.js](https://github.com//blob/main/test\owner.test.js)                                 | The code is a test suite for the "Ownablee" contract. It deploys various contracts and sets up necessary approvals and transfers. It also tests the functionality of transferring ownership and adding/removing deposit assets.                                                                                                                                                                                                                                                                                                                                                          |
| [research.js](https://github.com//blob/main/test\research.js)                                     | The code in the file "test\research.js" sets up and tests functionalities for the VabbleDAO contract. It includes the deployment of various contracts such as VabbleDAO, Vote, UniHelper, StakingPool, Property, Ownablee, and NFTFilm. It also tests the functionality of proposing films by studios and verifies the expected results.                                                                                                                                                                                                                                                 |
| [stakingPool.test.js](https://github.com//blob/main/test\stakingPool.test.js)                     | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [subscription.test.js](https://github.com//blob/main/test\subscription.test.js)                   | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [vabbleDAO.test.js](https://github.com//blob/main/test\vabbleDAO.test.js)                         | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| [vote.test.js](https://github.com//blob/main/test\vote.test.js)                                   | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

</details>

---

## 🚀 Getting Started

***Dependencies***

Please ensure you have the following dependencies installed on your system:

`- ℹ️ Dependency 1`

`- ℹ️ Dependency 2`

`- ℹ️ ...`

### 🔧 Installation

1. Clone the dao-sc repository:
```sh
git clone C:\Users\danie\Projekte\Vabble\dao-sc/
```

2. Change to the project directory:
```sh
cd dao-sc
```

3. Install the dependencies:
```sh
► INSERT-TEXT
```

### 🤖 Running dao-sc

```sh
► INSERT-TEXT
```

### 🧪 Tests
```sh
► INSERT-TEXT
```

---


## 🛣 Roadmap

> - [X] `ℹ️  Task 1: Implement X`
> - [ ] `ℹ️  Task 2: Implement Y`
> - [ ] `ℹ️ ...`


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

## 📄 License

This project is licensed under the `ℹ️  LICENSE-TYPE` License. See the [LICENSE-Type](LICENSE) file for additional info.

---

## 👏 Acknowledgments

`- ℹ️ List any resources, contributors, inspiration, etc.`

[↑ Return](#Top)

---
