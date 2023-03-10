import * as anchor from "@project-serum/anchor";
import { BorshCoder, EventParser, Program, web3 } from "@project-serum/anchor";
import { AccountMeta, PublicKey } from '@solana/web3.js';
import {
    Connection,
    Keypair,
    SystemProgram,
    LAMPORTS_PER_SOL,
    Transaction,
    sendAndConfirmTransaction,
    clusterApiUrl
} from "@solana/web3.js";
import { SolearnContract } from "../target/types/solearn_contract";

export interface AccountMetaInterface {
    pubkey: anchor.web3.PublicKey;
    isSigner: boolean;
    isWritable: boolean;
}

export async function generateMetas(num: Number, extra: PublicKey): Promise<AccountMeta[]> {
    const keys = [];

    for (let i = 0; i < num; i++) {
        let key: AccountMetaInterface = {
            pubkey: anchor.web3.Keypair.generate().publicKey,
            isSigner: false,
            isWritable: true,
        }
        keys.push(key);
    }

    keys.push({
        pubkey: extra,
        isSigner: false,
        isWritable: true,
    });

    return keys;
}

export async function generatePubkeys(num: Number) {
    const keys = [];

    for (let i = 0; i < num; i++) {
        let key = anchor.web3.Keypair.generate();
        keys.push(key);
    }

    return keys;
}

export function generateRandomNumber() {
    // Generate a random number between 100 and 999 (inclusive)
    const randomNumber = Math.floor(Math.random() * 999999999) + 100000000;

    // If the number starts with 0, generate a new one
    if (randomNumber.toString().charAt(0) === '0') {
        return generateRandomNumber();
    }

    return randomNumber;
}

export async function generateAmounts(num: Number): Promise<number[]> {
    const amounts = [];

    for (let i = 0; i < num; i++) {
        // Generate a random number between 100 and 999 (inclusive)
        const randomNumber = Math.floor(Math.random() * 999999999) + 100000000;

        // If the number starts with 0, generate a new one
        if (randomNumber.toString().charAt(0) === '0') {
            return generateRandomNumber();
        }

        amounts.push(randomNumber);
    }
    console.log(amounts.reduce((a, b) => a + b, 0))
    return amounts;
}

export async function log(tx: string, program: Program<SolearnContract>) {
    console.log("Transaction: ", tx);

    const txs = anchor.getProvider().connection.getTransaction(tx, {
        commitment: "confirmed",
    })

    const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
    const events = eventParser.parseLogs((await txs).meta.logMessages);
    for (let event of events) {
        console.log("------Event-----");
        console.log({ "name": event.name, "data": Number(event.data?.data) });
    }
}

export async function airdrop(account: PublicKey) {
    const connection = new Connection(
        "http://127.0.0.1:8899",
        "confirmed"
    );

    const airdropSignature = await connection.requestAirdrop(
        account,
        LAMPORTS_PER_SOL
    );

    await connection.confirmTransaction(airdropSignature);
}

export const getAllBalances = async (publicKeys: PublicKey) => {

    const connection = new Connection("http://127.0.0.1:8899");

    const pk = new PublicKey(publicKeys);
    console.log(pk);

    const balance = await connection.getBalance(pk);
    let netBalance = balance;

    console.log(`netBalance = ${netBalance}`);
};

export const removeBefore = async (str: string, word: string): Promise<string> => {
    const index = str.indexOf(word);
    if (index !== -1) {
        return str.substring(index + word.length);
    } else {
        return str;
    }
}
