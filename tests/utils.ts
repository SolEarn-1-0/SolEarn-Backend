import * as anchor from "@project-serum/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import * as BufferLayout from "buffer-layout";
import * as fs from "fs";

import * as employee_account from "./keys/employee_payout_account.json";
import * as program_account from "./keys/program_account_pda.json";

const masterAccount = anchor.web3.Keypair.generate();
const organizationAccount = anchor.web3.Keypair.generate();
const payrollAccount = anchor.web3.Keypair.generate();

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

export const getMasterAccountAndPDA = async (programId: PublicKey): Promise<{
    pubkey: anchor.web3.PublicKey;
    seckey: Uint8Array;
    PDA: anchor.web3.PublicKey;
}> => {
    let [PDA, bump] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('MASTER_STATE')], programId);
    let result = {
        "pubkey": masterAccount.publicKey,
        "seckey": masterAccount.secretKey,
        PDA
    }

    return result;
}

export const getOrganizationAccountAndPDA = async (lastId: number, programId: PublicKey): Promise<{
    pubkey: anchor.web3.PublicKey;
    seckey: Uint8Array;
    PDA: anchor.web3.PublicKey;
}> => {
    let [PDA, bump] = await anchor.web3.PublicKey.findProgramAddressSync([
        utf8.encode('EMPLOYER_STATE'),
        Buffer.from(lastId.toString(16).padStart(8, '0'), 'hex').reverse()
    ], programId);

    let result = {
        "pubkey": organizationAccount.publicKey,
        "seckey": organizationAccount.secretKey,
        PDA
    }

    return result;
}

export const getPayrollAccountAndPDA = async (payrollId: number, owner: PublicKey, programId: PublicKey): Promise<{
    pubkey: anchor.web3.PublicKey;
    seckey: Uint8Array;
    PDA: anchor.web3.PublicKey;
}> => {
    let [PDA, bump] = await anchor.web3.PublicKey.findProgramAddressSync([
        utf8.encode('PAYROLL_STATE'),
        owner.toBuffer(),
        Buffer.from(payrollId.toString(16).padStart(8, '0'), 'hex').reverse()
    ], programId);

    let result = {
        "pubkey": payrollAccount.publicKey,
        "seckey": payrollAccount.secretKey,
        PDA
    }

    return result;
}