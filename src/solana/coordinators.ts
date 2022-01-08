import { IMetadata, IWallet, IWalletUpsert } from "../types";
import { getSolAccountMintIds } from "./accounts";
import { getSolMetadata } from "./metaplex";
import { getMetadatas, upsertMetadatas, upsertWallet } from "../api";
import Moment from "moment";

export const getWallets = async (
  userId: string,
  addrs: string[],
  handleErr: (msg: string) => Promise<void>
): Promise<IWallet[] | undefined> => {
  const wallets = [] as IWallet[];
  for (let i = 0; i < addrs.length; i++) {
    const addr = addrs[0];
    const mintIds = await getSolAccountMintIds(addr);
    console.log(`Got ${mintIds.length} nfts in your wallet...`);
    // check store first for metadata
    const metadatas = await getMetadatas(mintIds, handleErr);
    if (!metadatas) return;
    const metaMap = metadatas.reduce((map, metadata) => {
      map.set(metadata.mint, metadata);
      return map;
    }, new Map<string, IMetadata>());

    // any missing meta get from solana rpc
    const missingMetadats = [] as IMetadata[];
    const missingIds = mintIds.filter((mintId) => !metaMap.get(mintId));
    for (let i = 0; i < missingIds.length; i++) {
      const mintId = missingIds[i];
      const metadata = await getSolMetadata(mintId);
      if (metadata) {
        missingMetadats.push(metadata);
        metaMap.set(mintId, metadata);
      }
    }
    console.log(`Got ${missingMetadats.length} missing nfts...`);

    // upsert to store any newly found metadata
    if (missingMetadats.length > 0) {
      const success = await upsertMetadatas(missingMetadats, handleErr);
      if (!success) return;
    }

    const upsert = {
      id: addr,
      lastSynced: Moment().format(),
      publicKey: addr,
      userId,
      metadata: [...metadatas, ...missingMetadats],
    } as IWalletUpsert;
    const wallet = await upsertWallet(upsert, handleErr);
    if (wallet) wallets.push(wallet);
  }

  console.log(`Got ${wallets.length} wallets...`);

  console.log(wallets);

  return wallets;
};
