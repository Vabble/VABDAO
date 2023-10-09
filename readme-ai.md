<div align="center">
<h1 align="center">
<img src="https://raw.githubusercontent.com/PKief/vscode-material-icon-theme/ec559a9f6bfd399b82bb44393651661b08aaf7ba/icons/folder-markdown-open.svg" width="100" />
<br>dao-sc</h1>
<h3>◦ Unlock the power of decentralized autonomy.</h3>
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

The project is a decentralized application (dApp) that aims to provide a platform for creating and managing various types of NFTs (Non-Fungible Tokens) related to films. It includes contracts for creating film NFTs, subscription-based NFTs, and tiered NFTs. The project also incorporates functionality for funding films, staking assets, and voting on proposals. By leveraging blockchain technology, the project offers transparency, traceability, and security in the film industry, enabling filmmakers and investors to participate in a decentralized and innovative ecosystem.

---

## 📦 Features

|    | Feature            | Description                                                                                                        |
|----|--------------------|--------------------------------------------------------------------------------------------------------------------|
| ⚙️ | **Architecture**   | The project appears to be a DAO (Data Access Object) layer for the Vabble application. It separates the business logic from the data access logic, providing a structured way to interact with the application's persistence layer. |
| 📄 | **Documentation**  | The quality and comprehensiveness of the documentation could not be determined based on the provided information. |
| 🔗 | **Dependencies**   | No external dependencies were mentioned in the provided information, indicating that the project may rely solely on standard Python libraries or modules. |
| 🧩 | **Modularity**     | The project seems to follow a modular structure, organizing code into different files or modules. This modular approach allows for easier maintenance and reusability of code components. |
| 🧪 | **Testing**        | The testing strategies and tools employed in the project could not be determined based on the provided information. Further analysis or exploration of the codebase would be required. |
| ⚡️ | **Performance**    | The performance characteristics of the system could not be determined based on the provided information. Further analysis or profiling may be necessary to evaluate its speed, efficiency, and resource usage. |
| 🔐 | **Security**       | The security measures implemented by the project could not be ascertained from the given information. An examination of the codebase or additional details would be needed to assess the security features in place. |
| 🔀 | **Version Control**| The project's use of version control was not mentioned. However, considering the reference to a Git codebase, it can be assumed that Git is used for version control, allowing for effective collaboration and code management. |
| 🔌 | **Integrations**   | The specific integrations with other systems or services could not be determined from the provided information. Further exploration of the codebase or additional documentation would be required. |
| 📶 | **Scalability**    | The scalability of the system was not discussed in the provided information. Additional details, such as its ability to handle increasing data volumes or concurrent users, would be needed to assess its scalability characteristics. |

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
    ├── hardhat.config.js
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

| File                                                                                              | Summary                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---                                                                                               | ---                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| [.prettierrc.js](https://github.com//blob/main/.prettierrc.js)                                    | The code specifies formatting options for two types of files: Solidity (*.sol) and JavaScript (*.js). For Solidity files, it enforces specific formatting rules like tab width, quote style, and explicit types. For JavaScript files, it sets formatting options such as line width, semi-colon usage, and trailing commas.                                                                                                                     |
| [deploy_address.txt](https://github.com//blob/main/deploy_address.txt)                            | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [hardhat.config.js](https://github.com//blob/main/hardhat.config.js)                              | This code sets up the configuration for a Hardhat project. It includes network settings for Ethereum mainnet, testnets (Goerli, BSC, Polygon), and Avalanche (testnet and mainnet). It also configures Solidity compiler settings and deploys the contracts. Additionally, it integrates with Etherscan for contract verification and reporting gas usage.                                                                                       |
| [FactoryFilmNFT.sol](https://github.com//blob/main/contracts\dao\FactoryFilmNFT.sol)              | The FactoryFilmNFT contract is responsible for creating and managing Film NFTs. It allows film owners to set minting information for their films, deploy NFT contracts per film, and mint NFTs to individual addresses. It also handles the payment and distribution of fees and revenue generated from the minting process.                                                                                                                     |
| [FactorySubNFT.sol](https://github.com//blob/main/contracts\dao\FactorySubNFT.sol)                | The FactorySubNFT contract serves as a platform for creating subscription-based NFTs. It allows users to mint NFTs with different subscription periods and lock them for a specified time. The contract handles payments in multiple tokens and ensures that the minting process follows the defined rules set by the contract owner. Users can also lock and unlock their NFTs as required.                                                     |
| [FactoryTierNFT.sol](https://github.com//blob/main/contracts\dao\FactoryTierNFT.sol)              | The FactoryTierNFT contract is responsible for creating and managing tiered NFTs for films. It allows film owners to set tier information based on investment amounts, deploy tier NFT contracts, mint tier NFTs for investors, and retrieve information about the NFTs and their owners. The contract also provides functionality to set base and collection URI for the NFTs.                                                                  |
| [Ownablee.sol](https://github.com//blob/main/contracts\dao\Ownablee.sol)                          | The code in the "Ownablee.sol" contract implements functionalities related to ownership and management of assets. It allows the auditor to set up contracts, add or remove assets for deposit, change the VAB wallet address, and facilitate the deposit and withdrawal of tokens. It also includes modifiers to restrict access to certain functions.                                                                                           |
| [Property.sol](https://github.com//blob/main/contracts\dao\Property.sol)                          | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [StakingPool.sol](https://github.com//blob/main/contracts\dao\StakingPool.sol)                    | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [Subscription.sol](https://github.com//blob/main/contracts\dao\Subscription.sol)                  | The code implements a subscription contract that allows users to subscribe and pay for renting films using tokens. It supports multiple payment options and calculates the expected subscription amount based on the chosen subscription period. The contract also includes functionality to check if a subscription is active and allows an auditor to set discount percentages for different subscription periods.                             |
| [UniHelper.sol](https://github.com//blob/main/contracts\dao\UniHelper.sol)                        | The UniHelper contract is a helper contract that facilitates swapping of assets on the Uniswap and Sushiswap decentralized exchanges. It provides functions for calculating the expected amount before swapping, checking the availability of specific pools, and performing asset swaps. The contract also handles the transfer of assets between the contract and the caller.                                                                  |
| [VabbleDAO.sol](https://github.com//blob/main/contracts\dao\VabbleDAO.sol)                        | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [VabbleFunding.sol](https://github.com//blob/main/contracts\dao\VabbleFunding.sol)                | The VabbleFunding contract allows users to deposit tokens to fund films, process funds after the funding period, and withdraw funds if the funding goal is not met. It keeps track of deposited assets per film and per user, as well as the list of investors and processed films. The contract also handles token swaps and reward distribution.                                                                                               |
| [VabbleNFT.sol](https://github.com//blob/main/contracts\dao\VabbleNFT.sol)                        | The VabbleNFT contract is an ERC721 NFT contract that allows users to mint new tokens, transfer them to other addresses, and retrieve the token metadata URI. It also supports the ERC2981 standard for royalty payments. The contract keeps track of the total supply of minted tokens and provides functions to get the list of tokens owned by a specific address. The contract includes a factory address that controls the minting process. |
| [Vote.sol](https://github.com//blob/main/contracts\dao\Vote.sol)                                  | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [IFactoryFilmNFT.sol](https://github.com//blob/main/contracts\interfaces\IFactoryFilmNFT.sol)     | The code provides an interface for a FactoryFilmNFT contract in Solidity. It includes functions to retrieve information about film NFTs, such as tier, mint amount, price, fee and revenue percentages, NFT and studio addresses. It also allows fetching a list of film token IDs and the raised amount by NFT.                                                                                                                                 |
| [IOwnablee.sol](https://github.com//blob/main/contracts\interfaces\IOwnablee.sol)                 | The code is an interface for an Ownable contract that allows for managing the auditor address, checking if an asset can be deposited, retrieving a list of deposit asset addresses, and accessing various token addresses. It also provides functions for adding to a studio pool and withdrawing VAB tokens from an edge pool.                                                                                                                  |
| [IProperty.sol](https://github.com//blob/main/contracts\interfaces\IProperty.sol)                 | The code defines an interface for a Property contract which provides various functionalities such as retrieving and updating different properties, managing reward addresses and whitelists, handling board members and proposals, and retrieving proposal times. It also includes several getter functions for different parameters and constants.                                                                                              |
| [IStakingPool.sol](https://github.com//blob/main/contracts\interfaces\IStakingPool.sol)           | The IStakingPool interface defines functions for managing staking pools, including getting stake amounts, withdrawable times, updating withdrawable times, updating vote counts, adding rewards, managing limit counts, proposal creation times, and sending virtual asset balances.                                                                                                                                                             |
| [IUniHelper.sol](https://github.com//blob/main/contracts\interfaces\IUniHelper.sol)               | This code defines an interface for a Helper contract in which functions are provided to calculate expected token amounts and swap assets on a decentralized exchange.                                                                                                                                                                                                                                                                            |
| [IUniswapV2Factory.sol](https://github.com//blob/main/contracts\interfaces\IUniswapV2Factory.sol) | The code defines an interface for the UniswapV2Factory contract, specifying functions to create and retrieve pairs of tokens, manage fees, and interact with the factory's internal data.                                                                                                                                                                                                                                                        |
| [IUniswapV2Router.sol](https://github.com//blob/main/contracts\interfaces\IUniswapV2Router.sol)   | The code provides an interface for interacting with the UniswapV2Router contract. It includes functions for adding and removing liquidity, swapping tokens, getting token amounts in and out, and more. The interface allows seamless integration with the Uniswap decentralized exchange.                                                                                                                                                       |
| [IVabbleDAO.sol](https://github.com//blob/main/contracts\interfaces\IVabbleDAO.sol)               | The IVabbleDAO interface defines the core functionalities of the VabbleDAO contract. It includes functions to get film details such as funding information, status, owner, and proposal time. It also provides functions to approve films by vote, check if claimer is enabled, get film shares, and get user film list for migration. Additionally, there is a function to withdraw VAB tokens from the studio pool.                            |
| [IVabbleFunding.sol](https://github.com//blob/main/contracts\interfaces\IVabbleFunding.sol)       | IVabbleFunding is an interface that provides core functionalities for Vabble funding contracts. It includes functions to retrieve the raised funding amount for a film by its ID and to get the funding amount contributed by a user for a specific film.                                                                                                                                                                                        |
| [IVote.sol](https://github.com//blob/main/contracts\interfaces\IVote.sol)                         | This code defines an interface for the IVote contract, which includes a function to get the last vote time for a specific member.                                                                                                                                                                                                                                                                                                                |
| [Helper.sol](https://github.com//blob/main/contracts\libraries\Helper.sol)                        | The `Helper` library in the `Helper.sol` file provides various helper functions for safe transfers and approvals of tokens (ERC20, ERC721, ERC1155). It also includes functions for transferring ETH and NFTs. Additionally, it includes a function to check if an address is a contract.                                                                                                                                                        |
| [MockERC1155.sol](https://github.com//blob/main/contracts\mocks\MockERC1155.sol)                  | The code implements a mock ERC1155 contract that extends the OpenZeppelin ERC1155 contract. It initializes with three tokens (Kitty, Dog, and Dolphin) and sets a URI for metadata. The URI template is set to fetch metadata from a specific JSON file based on the token ID.                                                                                                                                                                   |
| [MockERC20.sol](https://github.com//blob/main/contracts\mocks\MockERC20.sol)                      | The code is a mock ERC20 token contract that inherits from the OpenZeppelin ERC20 and Ownable contracts. It allows the contract owner to mint a fixed supply of tokens and allows users to request additional tokens through a faucet function, up to a specified limit.                                                                                                                                                                         |
| [MockERC721.sol](https://github.com//blob/main/contracts\mocks\MockERC721.sol)                    | Exception:                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| [deploy_factory_film_nft.js](https://github.com//blob/main/deploy\deploy_factory_film_nft.js)     | This code deploys the FactoryFilmNFT contract, initializing it with the addresses of the Ownablee and UniHelper contracts.                                                                                                                                                                                                                                                                                                                       |
| [deploy_factory_sub_nft.js](https://github.com//blob/main/deploy\deploy_factory_sub_nft.js)       | This code deploys the'FactorySubNFT' contract, using the'Ownablee' and'UniHelper' contracts as arguments. The deployment is logged and not deterministic. The code also defines the necessary ID, tags, and dependencies.                                                                                                                                                                                                                        |
| [deploy_factory_tier_nft.js](https://github.com//blob/main/deploy\deploy_factory_tier_nft.js)     | This code is responsible for deploying the FactoryTierNFT contract. It retrieves the addresses of the dependent contracts (Ownablee, VabbleDAO, and VabbleFunding) and passes them as arguments to the deployment. Additionally, it includes some deployment configurations and dependencies.                                                                                                                                                    |
| [deploy_ownablee.js](https://github.com//blob/main/deploy\deploy_ownablee.js)                     | The code deploys the Ownablee contract with specified arguments, including the VAB token and USDC address. It determines the token and address based on the selected network. The deployment is logged and can be skipped if already deployed. The setupVote function is called on the contract.                                                                                                                                                 |
| [deploy_property.js](https://github.com//blob/main/deploy\deploy_property.js)                     | The code deploys a "Property" contract with the specified arguments such as the addresses of the "Ownablee," "UniHelper," "Vote," and "StakingPool" contracts. It also allows logging and disables the deterministic deployment and skip if already deployed flags. The contract deployment is triggered by the named account "deployer.                                                                                                         |
| [deploy_staking_pool.js](https://github.com//blob/main/deploy\deploy_staking_pool.js)             | The code deploys a staking pool contract, passing the address of the "Ownablee" contract as an argument. It retrieves the deployer's address and uses it to deploy the staking pool contract. The code also includes commented out sections for initializing the staking pool contract with other contract addresses.                                                                                                                            |
| [deploy_subscription.js](https://github.com//blob/main/deploy\deploy_subscription.js)             | This code deploys the Subscription contract, which requires the addresses of the Ownablee, UniHelper, and Property contracts as arguments. It also sets up discounts for different subscription durations.                                                                                                                                                                                                                                       |
| [deploy_uni_helper.js](https://github.com//blob/main/deploy\deploy_uni_helper.js)                 | The code deploys a contract called'UniHelper' using the deployment tool. The deployment parameters are based on the selected network (Mumbai, Ethereum, or Polygon). The UniHelper contract requires initial configuration values such as Uniswap and Sushiswap factory and router addresses.                                                                                                                                                    |
| [deploy_vabble_dao.js](https://github.com//blob/main/deploy\deploy_vabble_dao.js)                 | This code is responsible for deploying the VabbleDAO contract. It takes the addresses of various contracts as arguments and deploys the VabbleDAO contract with these addresses. The code also includes the deployment dependencies and tags for better organization and tracking.                                                                                                                                                               |
| [deploy_vabble_funding.js](https://github.com//blob/main/deploy\deploy_vabble_funding.js)         | The code deploys the VabbleFunding contract, which requires the deployment of several other contracts as dependencies. The VabbleFunding contract is initialized with the addresses of these dependencies.                                                                                                                                                                                                                                       |
| [deploy_vote.js](https://github.com//blob/main/deploy\deploy_vote.js)                             | The code deploys a Vote contract using the Ownablee contract address as an argument. It allows for specifying the deployer's address, logs deployment details, and determines if the deployment is deterministic. The contract is deployed if it's not already deployed.                                                                                                                                                                         |
| [deploy_mock_vab.js](https://github.com//blob/main/scripts\deploy_mock_vab.js)                    | This code is responsible for deploying a mock ERC20 token called "Vabble" with the symbol "VAB". It ensures that the deployment is logged, not deterministic, and skips deployment if it's already deployed.                                                                                                                                                                                                                                     |
| [utils.js](https://github.com//blob/main/scripts\utils.js)                                        | The utils.js file provides various utility functions and configurations for the codebase. It includes constants, token addresses, contract routers, and functions for encoding data. Additionally, it features functions for generating random addresses and numbers, converting amounts to BigNumbers, and obtaining signatures from signers.                                                                                                   |
| [factoryFilmNFT.test.js](https://github.com//blob/main/test\factoryFilmNFT.test.js)               | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [factorySubNFT.test.js](https://github.com//blob/main/test\factorySubNFT.test.js)                 | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [main.test.js](https://github.com//blob/main/test\main.test.js)                                   | The code runs tests for various modules, including owner, voting, Vabble DAO, staking pool, film NFT, subscription, and research.                                                                                                                                                                                                                                                                                                                |
| [owner.test.js](https://github.com//blob/main/test\owner.test.js)                                 | The code defines tests for the functionalities of the `Ownablee` smart contract. It initializes various contract factories, creates contract instances, and performs operations such as ownership transfer and adding/removing deposit assets.                                                                                                                                                                                                   |
| [research.js](https://github.com//blob/main/test\research.js)                                     | The code in the "research.js" file sets up and tests various functionalities of the VabbleDAO smart contract. It initializes different contract factories, deploys contracts, transfers tokens, initializes staking pools, and tests the proposal of films by studios. The code performs these actions and tests to ensure the smooth functioning of the VabbleDAO system.                                                                       |
| [stakingPool.test.js](https://github.com//blob/main/test\stakingPool.test.js)                     | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [subscription.test.js](https://github.com//blob/main/test\subscription.test.js)                   | HTTPStatus Exception: 400                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [vabbleDAO.test.js](https://github.com//blob/main/test\vabbleDAO.test.js)                         | HTTPStatus Exception: 429                                                                                                                                                                                                                                                                                                                                                                                                                        |
| [vote.test.js](https://github.com//blob/main/test\vote.test.js)                                   | HTTPStatus Exception: 429                                                                                                                                                                                                                                                                                                                                                                                                                        |

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
