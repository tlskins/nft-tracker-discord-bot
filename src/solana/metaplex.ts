/**
 * This blob of a file is pulled together from different files from the metaplex
 * repository.
 * Metaplex does not have a NPM package at the current time to make this easier, so instead of
 * trying to reference their stuff, I copied all of the minimum necessary code into this file
 */
import { deserializeUnchecked } from "borsh";
import * as web3 from "@solana/web3.js";

import { StringPublicKey, findProgramAddress, toPublicKey } from "./helpers";
import { IMetadata, IMetaplexCreator } from "../types";

import rest from "../bots/src-discord-cron-bot/rest";

interface NetworkResp<T> {
  data: T;
}

interface NftData {
  name: string;
  symbol: string;
  description: string;
  seller_fee_basis_points: number;
  image: string;
  external_url: string;
  attributes: NftAttribute[];
  collection: NftCollection;
  properties: NftProperty[];
}

interface NftAttribute {
  trait_type: string;
  value: string;
}

interface NftCollection {
  name: string;
  family: string;
}

interface NftFile {
  type: string;
  uri: string;
}
interface NftCreator {
  address: string;
  share: number;
}

interface NftProperty {
  category: string;
  files: NftFile[];
  creators: NftCreator[];
}

export const testSolana = async (): Promise<undefined> => {
  console.log("testing solana...");

  const metadata = await getSolMetadata(
    "3RFQmL7HqWsvJDZYM6NNVsMBZhmWSTFb5usN6v4nQv7z"
  );
  if (!metadata) {
    console.log("metadata not found");
    return;
  }

  console.log(metadata);
  console.log(metadata.data.uri);

  const resp = (await rest.get(metadata.data.uri)) as NetworkResp<NftData>;
  console.log(resp.data);
  resp.data.attributes.forEach((attr) => {
    console.log(attr);
  });

  return;
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
  const m = await getMetadataAccount(tokenAddr);

  // get the account info for that account
  const accInfo = await connection.getAccountInfo(new web3.PublicKey(m));

  // finally, decode metadata
  if (!accInfo) return;
  return decodeMetadata(accInfo.data).serialize();
};

export const METADATA_PROGRAM_ID =
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s" as StringPublicKey;
export const METADATA_PREFIX = "metadata";

export enum MetadataKey {
  Uninitialized = 0,
  MetadataV1 = 4,
  EditionV1 = 1,
  MasterEditionV1 = 2,
  MasterEditionV2 = 6,
  EditionMarker = 7,
}

class Creator {
  address: StringPublicKey;
  verified: boolean;
  share: number;

  constructor(args: {
    address: StringPublicKey;
    verified: boolean;
    share: number;
  }) {
    this.address = args.address;
    this.verified = args.verified;
    this.share = args.share;
  }

  serialize(): IMetaplexCreator {
    return {
      address: this.address,
      verified: this.verified ? 1 : 0,
      share: this.share,
    };
  }
}

class Data {
  name: string;
  symbol: string;
  uri: string;
  sellerFeeBasisPoints: number;
  creators: Creator[] | null;
  constructor(args: {
    name: string;
    symbol: string;
    uri: string;
    sellerFeeBasisPoints: number;
    creators: Creator[] | null;
  }) {
    this.name = args.name;
    this.symbol = args.symbol;
    this.uri = args.uri;
    this.sellerFeeBasisPoints = args.sellerFeeBasisPoints;
    this.creators = args.creators;
  }
}

class Metadata {
  key: MetadataKey;
  updateAuthority: StringPublicKey;
  mint: StringPublicKey;
  data: Data;
  primarySaleHappened: boolean;
  isMutable: boolean;
  editionNonce: number | null;

  // set lazy
  masterEdition?: StringPublicKey;
  edition?: StringPublicKey;

  constructor(args: {
    updateAuthority: StringPublicKey;
    mint: StringPublicKey;
    data: Data;
    primarySaleHappened: boolean;
    isMutable: boolean;
    editionNonce: number | null;
  }) {
    this.key = MetadataKey.MetadataV1;
    this.updateAuthority = args.updateAuthority;
    this.mint = args.mint;
    this.data = args.data;
    this.primarySaleHappened = args.primarySaleHappened;
    this.isMutable = args.isMutable;
    this.editionNonce = args.editionNonce;
  }

  serialize(): IMetadata {
    return {
      key: this.key,
      updateAuthority: this.updateAuthority,
      mint: this.mint,
      primarySaleHappened: this.primarySaleHappened ? 1 : 0,
      isMutable: this.isMutable ? 1 : 0,
      editionNonce: this.editionNonce,
      data: {
        name: this.data.name,
        symbol: this.data.symbol,
        uri: this.data.uri,
        sellerFeeBasisPoints: this.data.sellerFeeBasisPoints,
        creators: this.data.creators?.map((c) => c.serialize()) || null,
      },
    };
  }
}

const METADATA_SCHEMA = new Map<any, any>([
  [
    Data,
    {
      kind: "struct",
      fields: [
        ["name", "string"],
        ["symbol", "string"],
        ["uri", "string"],
        ["sellerFeeBasisPoints", "u16"],
        ["creators", { kind: "option", type: [Creator] }],
      ],
    },
  ],
  [
    Creator,
    {
      kind: "struct",
      fields: [
        ["address", "pubkeyAsString"],
        ["verified", "u8"],
        ["share", "u8"],
      ],
    },
  ],
  [
    Metadata,
    {
      kind: "struct",
      fields: [
        ["key", "u8"],
        ["updateAuthority", "pubkeyAsString"],
        ["mint", "pubkeyAsString"],
        ["data", Data],
        ["primarySaleHappened", "u8"], // bool
        ["isMutable", "u8"], // bool
      ],
    },
  ],
]);

export async function getMetadataAccount(
  tokenMint: StringPublicKey
): Promise<StringPublicKey> {
  return (
    await findProgramAddress(
      [
        Buffer.from(METADATA_PREFIX),
        toPublicKey(METADATA_PROGRAM_ID).toBuffer(),
        toPublicKey(tokenMint).toBuffer(),
      ],
      toPublicKey(METADATA_PROGRAM_ID)
    )
  )[0];
}

const METADATA_REPLACE = new RegExp("\u0000", "g");
export const decodeMetadata = (buffer: Buffer): Metadata => {
  const metadata = deserializeUnchecked(
    METADATA_SCHEMA,
    Metadata,
    buffer
  ) as Metadata;

  metadata.data.name = metadata.data.name.replace(METADATA_REPLACE, "");
  metadata.data.uri = metadata.data.uri.replace(METADATA_REPLACE, "");
  metadata.data.symbol = metadata.data.symbol.replace(METADATA_REPLACE, "");
  return metadata;
};
