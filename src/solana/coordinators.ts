import * as web3 from "@solana/web3.js";
import * as metadata from "./metaplex";

import { IMetadata } from "../types";

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

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export const getSolAccount = async (acctAddr: string): Promise<string[]> => {
  const connection = new web3.Connection(
    web3.clusterApiUrl("mainnet-beta"),
    "confirmed"
  );
  const data = await connection.getParsedTokenAccountsByOwner(
    new web3.PublicKey(acctAddr),
    { programId: new web3.PublicKey(TOKEN_PROGRAM_ID) }
  );

  return data.value
    .filter(
      (v) =>
        v.account.data.parsed.info.tokenAmount.amount === "1" &&
        v.account.data.parsed.info.tokenAmount.uiAmount === 1
    )
    .map((v) => v.account.data.parsed.info.mint);
};

export const getSolMetadata = async (
  tokenAddr: string
): Promise<IMetadata | undefined> => {
  // Connect to cluster
  const connection = new web3.Connection(
    web3.clusterApiUrl("mainnet-beta"),
    "confirmed"
  );

  // get metadata account that holds the metadata information
  const m = await metadata.getMetadataAccount(tokenAddr);

  // get the account info for that account
  const accInfo = await connection.getAccountInfo(new web3.PublicKey(m));

  // finally, decode metadata
  if (!accInfo) return;
  return metadata.decodeMetadata(accInfo.data).serialize();
};
