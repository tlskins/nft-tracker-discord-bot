import { BinaryReader, BinaryWriter } from "borsh";
import { PublicKey } from "@solana/web3.js";
import base58 from "bs58";

const PubKeysInternedMap = new Map<string, PublicKey>();

// Borsh extension for pubkey stuff
(BinaryReader.prototype as any).readPubkey = function () {
  const reader = this as unknown as BinaryReader;
  const array = reader.readFixedArray(32);
  return new PublicKey(array);
};

(BinaryWriter.prototype as any).writePubkey = function (value: PublicKey) {
  const writer = this as unknown as BinaryWriter;
  writer.writeFixedArray(value.toBuffer());
};

(BinaryReader.prototype as any).readPubkeyAsString = function () {
  const reader = this as unknown as BinaryReader;
  const array = reader.readFixedArray(32);
  return base58.encode(array) as StringPublicKey;
};

(BinaryWriter.prototype as any).writePubkeyAsString = function (
  value: StringPublicKey
) {
  const writer = this as unknown as BinaryWriter;
  writer.writeFixedArray(base58.decode(value));
};

export type StringPublicKey = string;

export const toPublicKey = (key: string | PublicKey): PublicKey => {
  if (typeof key !== "string") {
    return key;
  }

  let result = PubKeysInternedMap.get(key);
  if (!result) {
    result = new PublicKey(key);
    PubKeysInternedMap.set(key, result);
  }

  return result;
};

export const findProgramAddress = async (
  seeds: (Buffer | Uint8Array)[],
  programId: PublicKey
): Promise<[string, number]> => {
  const key =
    "pda-" +
    seeds.reduce((agg, item) => agg + item.toString("hex"), "") +
    programId.toString();

  const result = await PublicKey.findProgramAddress(seeds, programId);

  return [result[0].toBase58(), result[1]] as [string, number];
};
