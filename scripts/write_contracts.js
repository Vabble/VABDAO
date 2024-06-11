const fs = require("fs")

const args = process.argv.slice(2)

const contracts = {
    ownablee: args[0],
    uniHelper: args[1],
    stakingPool: args[2],
    vote: args[3],
    property: args[4],
    factoryFilmNFT: args[5],
    factorySubNFT: args[6],
    vabbleFund: args[7],
    vabbleDAO: args[8],
    factoryTierNFT: args[9],
    subscription: args[10],
    helperConfig: args[11],
}

const output = JSON.stringify(contracts, null, 2)
fs.writeFileSync("deployed_contracts.json", output, "utf8")
console.log("Contracts written to deployed_contracts.json")
