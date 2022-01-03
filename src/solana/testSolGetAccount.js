const web3 = require('@solana/web3.js');
// import * as metadata from "./metaplex.ts"; 

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"

let connection = new web3.Connection(web3.clusterApiUrl('mainnet-beta'), 'confirmed');

(async () => {
    const data = await connection.getParsedTokenAccountsByOwner(
        new web3.PublicKey("83Ups5qviXSPRXMYbWHgUfmE7FEv8EYYVqg32PW14xDf"),
        { programId: new web3.PublicKey(TOKEN_PROGRAM_ID) },
        { encoding: "jsonParsed" }
    );

    const accounts = data.value
    for (let i=0;i < accounts.length; i++) {
        const account = accounts[i]
        console.log(account.pubkey.toString())
        console.log(account.account)
        console.log(account.account.data)
        console.log(account.account.data.parsed.info.tokenAmount)
    }

    // const tokenAddress = new web3.PublicKey(
    //     "CxkKDaBvtHqg8aHBVY8E4YYBsCfJkJVsTAEdTo5k4SEw"
    //   );
    // // get metadata account that holds the metadata information
    // const m = await metadata.getMetadataAccount(tokenAddress);
    // console.log("metadata acc: ", m);
    
    // // get the account info for that account
    // const accInfo = await connection.getAccountInfo(m);
    // console.log(accInfo);

    // // finally, decode metadata
    // console.log(metadata.decodeMetadata(accInfo?.data));

})()
