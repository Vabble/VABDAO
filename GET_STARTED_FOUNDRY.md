- [Getting Started](#getting-started)
  - [Requirements](#requirements)
  - [Installation](#installation)
    - [Create a Deployer wallet](#create-a-deployer-wallet)
      - [Environment](#environment)
- [Usage](#usage)
  - [Build](#build)
  - [Deployment](#deployment)
  - [Testing](#testing)
    - [Test Coverage](#test-coverage)
  - [Security Tools](#security-tools)
    - [Aderyn](#aderyn)
    - [Slither](#slither)
- [Good To Know](#good-to-know)

# Getting Started

## Requirements

-   [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
    -   You'll know you did it right if you can run `git --version` and you see a response like `git version x.x.x`
-   [foundry](https://getfoundry.sh/)
    -   You'll know you did it right if you can run `forge --version` and you see a response like `forge 0.2.0 (816e00b 2023-03-16T00:05:26.396218Z)`

## Installation

```bash
git clone git@github.com:Mill1995/VABDAO.git
cd VABDAO
git checkout foundry_setup
npm install
make
```

### Create a Deployer wallet

This will Import a private key into an encrypted keystore.

```bash
cast wallet import Deployer --interactive
```

#### Environment

-   Create a .env and paste in these values, so hardhat doesn't freak out:

```javascript
    BASE_SEPOLIA_RPC_URL="https://sepolia.base.org/"
    API_KEY_BASESCAN="YOUR_API_KEY"
    // default foundry Mnemonic, only for testing purpose !!!
    MNEMONIC=test test test test test test test test test test test junk
    // default foundry private key, only for testing purpose !!!
    DEPLOY_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
    DEPLOYER_ADDRESS="<The Public Address of the Deployer Wallet>"
```

# Usage

## Build

```
make build
```

## Deployment

```
make deploy ARGS="--network base_sepolia"
```

## Testing

```
make test
```

```
forge test -vvvv
```

### Test Coverage

```
forge coverage
```

and for coverage based testing:

```
forge coverage --report debug
```

## Security Tools

### Aderyn

```
make aderyn
```

### Slither

```
make slither
```

... find more commands in the Makefile & Foundry Docs

# Good To Know

-   Checkout foundry.toml
-   Checkout Makefile for commands and more
-   Deploy Scripts are inside ./scripts/foundry
