const web3 = require('@solana/web3.js');
require("dotenv/config");

const lampsInSol = 1000000000.0
const treasury = process.env.TREASURY_ADDRESS

console.log(`Treasury ${treasury}`)

let connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');

(async () => {
    const trx = await connection.getTransaction(
        "58rUGsYmZ2mcou9Vn5eABCLvhi6Qukx3bio2gtEGVSwvL4byyf8397Rzgvg7yKzpYw3mycUz3QwqxJ3FahKrHgKf",
        { encoding: "jsonParsed", commitment: "finalized" },
    );

    // console.log(trx)
    // console.log(trx.transaction.message.accountKeys.map( key => key.toString() ))
    // trx.transaction.message.instructions.map( instruction => {
    //     console.log(instruction)
    //     instruction.accounts.forEach( accountIdx => {
    //         console.log(trx.transaction.message.accountKeys[accountIdx].toString())
    //     })
    // })

    let treasuryChange = 0.0

    trx.transaction.message.accountKeys.forEach( (accountKey, acctIdx) => {
        const account = accountKey.toString()
        if ( account === treasury ) {
            const preBal = trx.meta.preBalances[acctIdx]
            const postBal = trx.meta.postBalances[acctIdx]
            console.log(`${account} ${preBal / lampsInSol} -> ${postBal / lampsInSol}`)
            treasuryChange += postBal - preBal
        }
    })

    console.log(`Treasury Net Change: ${treasuryChange / lampsInSol}`)
})()
