import { Connection, Keypair, PublicKey } from "@solana/web3.js";

import * as BufferLayout from "buffer-layout";

import * as fs from "fs";

import * as employee_account from "./keys/employee_payout_account.json";
import * as program_account from "./keys/program_account_pda.json";

export const logError = (msg: string) => {
    console.log(`\x1b[31m${msg}\x1b[0m`);
};

export const getProgramKeypair = () => [new PublicKey(program_account.pubkey), Uint8Array.from(program_account.secretkey)];

export const getEmployeeAccountKeypair = () => [new PublicKey(employee_account.pubkey), Uint8Array.from(employee_account.secretkey)];
export const getEmployeeAccountPubkey = () => new PublicKey(employee_account.pubkey);

export const getKeypair = (data) =>
    new Keypair({
        publicKey: data[0],
        secretKey: data[1],
    });