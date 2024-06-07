-   [Getting Started](#getting-started) - [Environment](#environment)
-   [Usage](#usage)
    -   [Build](#build)
    -   [Deployment](#deployment)
    -   [Security Tools](#security-tools)
        -   [Aderyn](#aderyn)
        -   [Slither](#slither)
-   [Good To Know](#good-to-know)

# Getting Started

```bash
make
```

### Create a Deployer wallet

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
```

# Usage

## Build

```bash
make build
```

## Deployment

```bash
make deploy ARGS="--network base_sepolia"
```

## Testing

```bash
forge test
```

```bash
make test
```

### Test Coverage

```bash
forge coverage --report debug
```

## Security Tools

### Aderyn

```bash
make aderyn
```

### Slither

```bash
make slither
```

... find more commands in the Makefile & Foundry Docs

# Good To Know

-   Checkout foundry.toml
-   Checkout Makefile for commands and more
-   Deploy Scripts are inside ./scripts/foundry
