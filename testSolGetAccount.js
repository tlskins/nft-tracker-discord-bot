const web3 = require('@solana/web3.js');
require("dotenv/config");

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

let connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');

(async () => {
    const data = await connection.getParsedTokenAccountsByOwner(
        new web3.PublicKey("83Ups5qviXSPRXMYbWHgUfmE7FEv8EYYVqg32PW14xDf"),
        { programId: new web3.PublicKey(TOKEN_PROGRAM_ID), },
        { encoding: "jsonParsed" }
    );

    const accounts = data.value
    for (let i=0;i < accounts.length; i++) {
        const account = accounts[i]
        console.log(account.pubkey.toString())
        console.log(account.account.data)

        const programAccount = await connection.getProgramAccounts(account.pubkey)
        console.log(programAccount)
    }
})()
