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

aderyn :; aderyn --src contracts/dao --output  ./reports/aderyn.md

scopefile :; @tree ./contracts/ | sed 's/└/#/g' | awk -F '── ' '!/\.sol$$/ { path[int((length($$0) - length($$2))/2)] = $$2; next } { p = "src"; for(i=2; i<=int((length($$0) - length($$2))/2); i++) if (path[i] != "") p = p "/" path[i]; print p "/" $$2; }' > scope.txt

scope :; tree ./contracts/ | sed 's/└/#/g; s/──/--/g; s/├/#/g; s/│ /|/g; s/│/|/g'

NETWORK_ARGS := --rpc-url http://localhost:8545 --private-key $(DEFAULT_ANVIL_KEY) -vvvvv
ETHERSCAN_API_KEY := $(API_KEY_ETHERSCAN)
CHAIN_ID := 31337
ACCOUNT_OPTION := --account Deployer # Default to Deployer account

ifeq ($(findstring --network base,$(ARGS)),--network base)
    CHAIN_ID := 8453
    NETWORK_ARGS := --chain-id $(CHAIN_ID) --rpc-url $(BASE_RPC_URL)
    ETHERSCAN_API_KEY := $(API_KEY_BASESCAN)
endif

ifeq ($(findstring --network base_sepolia,$(ARGS)),--network base_sepolia)
    CHAIN_ID := 84532
    NETWORK_ARGS := --chain-id $(CHAIN_ID) --rpc-url $(BASE_SEPOLIA_RPC_URL)
    ETHERSCAN_API_KEY := $(API_KEY_BASESCAN)
endif

ifneq ($(findstring --ledger,$(ARGS)),)
    ACCOUNT_OPTION := --ledger
endif

# run this with: make deploy ARGS="--network base_sepolia"
deploy:
	@forge script scripts/foundry/01_Deploy.s.sol:DeployerScript $(NETWORK_ARGS) $(ACCOUNT_OPTION) --broadcast --force --slow --optimize --optimizer-runs 200 --verify --etherscan-api-key $(ETHERSCAN_API_KEY)

# Get individual contract addresses
get-helper-config:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getHelperConfig()" --chain-id $(CHAIN_ID)

get-ownablee:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getOwnablee()" --chain-id $(CHAIN_ID)

get-uni-helper:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getUniHelper()" --chain-id $(CHAIN_ID)

get-staking-pool:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getStakingPool()" --chain-id $(CHAIN_ID)

get-vote:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getVote()" --chain-id $(CHAIN_ID)

get-property:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getProperty()" --chain-id $(CHAIN_ID)

get-factory-film-nft:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getFactoryFilmNFT()" --chain-id $(CHAIN_ID)

get-factory-sub-nft:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getFactorySubNFT()" --chain-id $(CHAIN_ID)

get-vabble-fund:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getVabbleFund()" --chain-id $(CHAIN_ID)

get-vabble-dao:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getVabbleDAO()" --chain-id $(CHAIN_ID)

get-factory-tier-nft:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getFactoryTierNFT()" --chain-id $(CHAIN_ID)

get-subscription:
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getSubscription()" --chain-id $(CHAIN_ID)

# Get all deployed contracts in batches
# make get-deployed-contracts ARGS="--network base_sepolia"
get-deployed-contracts:
	@echo "Fetching all contract addresses in batches..."
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getFirstBatch()" --chain-id $(CHAIN_ID)
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getSecondBatch()" --chain-id $(CHAIN_ID)
	@forge script scripts/foundry/02_GetDeployedContracts.s.sol:GetDeployedContracts --sig "getThirdBatch()" --chain-id $(CHAIN_ID)

fund-all:
	@forge script scripts/foundry/03_FundContracts.s.sol:FundContracts $(NETWORK_ARGS) --account Deployer --sender $(DEPLOYER_ADDRESS) --broadcast

# make fetch-film-data ARGS="--network base_sepolia"
fetch-film-data:
	forge script scripts/foundry/04_FilmProposalDetailsFetcher.s.sol $(NETWORK_ARGS) --via-ir

# make migrate-films ARGS="--network base_sepolia"
migrate-films:
	@forge script scripts/foundry/05_FilmMigration.s.sol $(NETWORK_ARGS) --account Deployer --sender $(DEPLOYER_ADDRESS) --broadcast

# make get-vote-info-for-film-proposals ARGS="--network base_sepolia"
get-vote-info-for-film-proposals:
	@forge script scripts/foundry/06_GetVoteInfoForFilmProposals.s.sol $(NETWORK_ARGS) --via-ir

SHELL := /bin/bash
