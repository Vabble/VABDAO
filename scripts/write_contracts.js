const fs = require("fs")

const args = process.argv.slice(2)
const filePath = "deployed_contracts.json"

// Read existing contracts if file exists
let existingContracts = {}
if (fs.existsSync(filePath)) {
    try {
        const fileContent = fs.readFileSync(filePath, "utf8")
        existingContracts = JSON.parse(fileContent)
    } catch (error) {
        console.log("Error reading existing file, starting fresh")
    }
}

// Update contracts based on the number of arguments
if (args.length === 7) {
    // First batch
    existingContracts = {
        ...existingContracts,
        ownablee: args[0],
        uniHelper: args[1],
        stakingPool: args[2],
        vote: args[3],
        property: args[4],
        helperConfig: args[5],
    }
} else if (args.length === 4) {
    // Second batch part 1
    existingContracts = {
        ...existingContracts,
        factoryFilmNFT: args[0],
        factorySubNFT: args[1],
        vabbleFund: args[2],
        vabbleDAO: args[3],
    }
} else if (args.length === 2) {
    // Second batch part 2
    existingContracts = {
        ...existingContracts,
        factoryTierNFT: args[0],
        subscription: args[1],
    }
}

// Write updated contracts to file
const output = JSON.stringify(existingContracts, null, 2)
fs.writeFileSync(filePath, output, "utf8")
console.log(`Contracts updated in ${filePath}`)

// Log current state of contracts
console.log("\nCurrent contracts in file:")
console.log(existingContracts)
