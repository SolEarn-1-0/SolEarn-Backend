import * as anchor from "@project-serum/anchor";
import { BorshCoder, EventParser, Program, web3 } from "@project-serum/anchor";
import { SolearnContract } from "../target/types/solearn_contract";

interface AccountMeta {
    pubkey: anchor.web3.PublicKey;
    isSigner: boolean;
    isWritable: boolean;
}

export async function generateMetas(num: Number) {
    const keys = [];

    for (let i = 0; i < num; i++) {
        let key: AccountMeta = {
            pubkey: anchor.web3.Keypair.generate().publicKey,
            isSigner: false,
            isWritable: false
        }
        keys.push(key);
    }

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
    const randomNumber = Math.floor(Math.random() * 900) + 100;

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
        const randomNumber = Math.floor(Math.random() * 900) + 100;

        // If the number starts with 0, generate a new one
        if (randomNumber.toString().charAt(0) === '0') {
            return generateRandomNumber();
        }

        amounts.push(randomNumber);
    }

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
        console.log(event);
    }
}