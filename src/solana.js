const web3 = require('@solana/web3.js');

const lampsInSol = 1000000000.0

export const checkBalChange = async (trxAddr, walletAddr) => {
    console.log(`Checking trx bal change ${trxAddr}`)
    
    let connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    const trx = await connection.getTransaction(
        trxAddr,
        { encoding: "jsonParsed", commitment: "finalized" },
    );

    let treasuryChange = 0.0

    trx.transaction.message.accountKeys.forEach( (accountKey, acctIdx) => {
        const account = accountKey.toString()
        if ( account === walletAddr ) {
            const preBal = trx.meta.preBalances[acctIdx]
            const postBal = trx.meta.postBalances[acctIdx]
            console.log(`${account} ${preBal / lampsInSol} -> ${postBal / lampsInSol}`)
            treasuryChange += postBal - preBal
        }
    })

    console.log(`Treasury Net Change: ${treasuryChange / lampsInSol}`)

    return treasuryChange / lampsInSol
}