import * as web3 from "@solana/web3.js";

const lampsInSol = 1000000000.0;

export const getSolTransaction = async (
  trxAddr: string
): Promise<web3.TransactionResponse | null> => {
  console.log(`Getting solana transaction ${trxAddr}`);

  const connection = new web3.Connection(
    web3.clusterApiUrl("mainnet-beta"),
    "confirmed"
  );
  const transaction = await connection.getTransaction(trxAddr, {
    commitment: "finalized",
  });
  return transaction;
};

export const checkBalChange = async (
  trx: web3.TransactionResponse,
  walletAddr: string
): Promise<number> => {
  let walletChg = 0.0;

  trx.transaction.message.accountKeys.forEach((accountKey, acctIdx) => {
    const account = accountKey.toString();
    if (account === walletAddr) {
      const preBal = trx?.meta?.preBalances[acctIdx] || 0.0;
      const postBal = trx?.meta?.postBalances[acctIdx] || 0.0;
      console.log(
        `${account} ${preBal / lampsInSol} -> ${postBal / lampsInSol}`
      );
      walletChg += postBal - preBal;
    }
  });

  const walletChgSol = walletChg / lampsInSol;
  console.log(`${walletAddr} walletChg: ${walletChgSol}`);

  return walletChgSol;
};
