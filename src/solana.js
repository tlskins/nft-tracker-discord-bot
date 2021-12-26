const web3 = require('@solana/web3.js');

const lampsInSol = 1000000000.0

export const getSolTransaction = async (trxAddr) => {
    console.log(`Getting solana transaction ${trxAddr}`)
    
    let connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');
    const transaction = await connection.getTransaction(
        trxAddr,
        { encoding: "jsonParsed", commitment: "finalized" },
    );
    return transaction
}

export const checkBalChange = async (trx, walletAddr) => {
    let walletChg = 0.0

    trx.transaction.message.accountKeys.forEach( (accountKey, acctIdx) => {
        const account = accountKey.toString()
        if ( account === walletAddr ) {
            const preBal = trx.meta.preBalances[acctIdx]
            const postBal = trx.meta.postBalances[acctIdx]
            console.log(`${account} ${preBal / lampsInSol} -> ${postBal / lampsInSol}`)
            walletChg += postBal - preBal
        }
    })

    const walletChgSol = walletChg / lampsInSol
    console.log(`${ walletAddr } walletChg: ${walletChgSol}`)

    return walletChgSol
}