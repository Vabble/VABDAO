-include .env

.PHONY: all test clean deploy fund help install snapshot format anvil scopefile coverage-html

DEFAULT_ANVIL_KEY := 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
COVERAGE_OUTPUT_DIR = coverage_foundry
LCOV_INFO = lcov.info

all: remove install build

# Clean the repo
clean  :; forge clean

# Remove modules
remove :; rm -rf .gitmodules && rm -rf .git/modules/* && rm -rf lib && touch .gitmodules && git add . && git commit -m "modules"

install :; forge install foundry-rs/forge-std --no-commit && forge install openzeppelin/openzeppelin-contracts --no-commit && forge install Cyfrin/foundry-devops --no-commit

# Update Dependencies
update:; forge update

build:; forge build

test :; forge test --summary --detailed

test-unit :; forge test --summary --detailed --match-path "./test/foundry/unit/*.sol"

test-fuzz :; forge test --summary --detailed --match-path "./test/foundry/fuzz/*.sol" -vvvv

test-fork :; forge test --summary --detailed --match-path "./test/foundry/fork/*.sol"

snapshot :; forge snapshot

coverage:; forge coverage --report summary

coverage-html: coverage-report generate-html

coverage-report:; forge coverage --report lcov
	
generate-html:;
	genhtml -o $(COVERAGE_OUTPUT_DIR) $(LCOV_INFO)
	

format :; forge fmt

anvil :; anvil -m 'test test test test test test test test test test test junk' --steps-tracing --block-time 1

slither :; slither . --config-file slither.config.json --checklist > ./reports/slither.md

aderyn :; aderyn --src contracts --output  ./reports/aderyn.md

scopefile :; @tree ./contracts/ | sed 's/└/#/g' | awk -F '── ' '!/\.sol$$/ { path[int((length($$0) - length($$2))/2)] = $$2; next } { p = "src"; for(i=2; i<=int((length($$0) - length($$2))/2); i++) if (path[i] != "") p = p "/" path[i]; print p "/" $$2; }' > scope.txt

scope :; tree ./contracts/ | sed 's/└/#/g; s/──/--/g; s/├/#/g; s/│ /|/g; s/│/|/g'

NETWORK_ARGS := --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY) -vvvvv
ETHERSCAN_API_KEY := $(API_KEY_ETHERSCAN)
CHAIN_ID := 31337

ifeq ($(ARGS),--network base)
    CHAIN_ID := 8453
    NETWORK_ARGS := --chain-id $(CHAIN_ID) --rpc-url $(BASE_RPC_URL)
    ETHERSCAN_API_KEY := $(API_KEY_BASESCAN)
endif

ifeq ($(ARGS),--network base_sepolia)
    CHAIN_ID := 84532
    NETWORK_ARGS := --chain-id $(CHAIN_ID) --rpc-url $(BASE_SEPOLIA_RPC_URL)
    ETHERSCAN_API_KEY := $(API_KEY_BASESCAN)
endif

# run this with: make deploy ARGS="--network base_sepolia"
deploy:
	@forge script scripts/foundry/01_Deploy.s.sol:DeployerScript $(NETWORK_ARGS) --account Deployer --broadcast --force --slow --optimize --optimizer-runs 200 --verify  --etherscan-api-key $(ETHERSCAN_API_KEY)

# make get-deployed-contracts ARGS="--network base_sepolia"
# Get deployed contract addresses - first batch
get-deployed-contracts-1: 
	@echo "Fetching first batch of deployed contracts..."
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --chain-id $(CHAIN_ID)

# Get deployed contract addresses - second batch
get-deployed-contracts-2:
	@echo "Fetching second batch of deployed contracts..."
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "runSecondBatch()" --chain-id $(CHAIN_ID)

# Get all deployed contracts (runs both batches)
# make get-deployed-contracts ARGS="--network base_sepolia"
get-deployed-contracts: get-deployed-contracts-1 
	@echo "\nFirst batch complete. Starting second batch...\n"
	@make get-deployed-contracts-2

fund-all:
	@forge script scripts/foundry/03_FundContracts.s.sol:FundContracts $(NETWORK_ARGS) --account Deployer --sender $(DEPLOYER_ADDRESS) --broadcast

# make migrate-films ARGS="--network base_sepolia"
migrate-films:
	@forge script scripts/foundry/05_FilmMigration.s.sol $(NETWORK_ARGS) --account Deployer --sender $(DEPLOYER_ADDRESS) --broadcast

SHELL := /bin/bash
