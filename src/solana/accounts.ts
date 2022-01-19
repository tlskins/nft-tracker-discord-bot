import * as web3 from "@solana/web3.js";

const TOKEN_PROGRAM_ID = "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA";

export const getSolAccountMintIds = async (
  acctAddr: string
): Promise<string[]> => {
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
