import * as anchor from "@project-serum/anchor";
// import { Program } from "@project-serum/anchor";
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { BN } from "bn.js";
import { assert } from "chai";
import { SolearnContract } from "../target/types/solearn_contract";
import {BorshCoder, EventParser, Program, web3} from "@project-serum/anchor";

describe("solearn-contract", () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.SolearnContract as Program<SolearnContract>;
  let PDA: anchor.web3.PublicKey;
  const employerKey = provider.wallet.publicKey.toBuffer();
  const systemProgram = anchor.web3.SystemProgram.programId;

  // beforeEach(async () => {
  //   const employerKey = provider.wallet.publicKey.toBuffer();
  //   [PDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYER_STATE'), employerKey], program.programId)

    
  //   // Add your test here.
  //   const tx = await program.methods.initialize().accounts({
  //     employer: provider.wallet.publicKey,
  //     employerAccount: PDA,
  //     systemProgram: anchor.web3.SystemProgram.programId,

  //   }).rpc();
  // })

  async function generatePubkeys(num: Number) {
    const keys = [];

    for (let i = 0; i < num; i++) {
      let key = anchor.web3.Keypair.generate();
      keys.push(key);
    }

    return keys;
  }

  function generateRandomNumber() {
    // Generate a random number between 100 and 999 (inclusive)
    const randomNumber = Math.floor(Math.random() * 900) + 100;
  
    // If the number starts with 0, generate a new one
    if (randomNumber.toString().charAt(0) === '0') {
      return generateRandomNumber();
    }
  
    return randomNumber;
  }

  async function generateAmounts(num: Number) {
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

  
  it("Is initialized!", async () => {
    [PDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYER_STATE'), employerKey], program.programId)
    
    // Add your test here.
    const tx = await program.methods.initialize().accounts({
      employer: provider.wallet.publicKey,
      employerAccount: PDA,
      systemProgram,

    }).rpc();
  

    const employerAccount = await program.account.organization.fetch(PDA);
    console.log(employerAccount);
    

    console.log("Transaction: ", tx);

    const txs = anchor.getProvider().connection.getTransaction(tx, {
      commitment: "confirmed",
    })

    const eventParser = new EventParser(program.programId, new BorshCoder(program.idl));
    const events = eventParser.parseLogs((await txs).meta.logMessages);
    for (let event of events) {
        console.log("------Message-----");
        console.log(event);
    }

    // assert.isAbove(slot, 0);
    // console.log(event.data);
  });

  it("All Employer to AddEmployees", async () => {
    const employees: anchor.web3.PublicKey[] = await generatePubkeys(3);
    const amounts = await generateAmounts(3);
    const amountsBN: anchor.BN[] = await amounts.reduce(amount => new BN(amount));
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const totalAmountBN: anchor.BN = new BN(1000);

    
    const [PayrollPDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYEES_STATE'), employerKey], program.programId)
    
    const tx = await program.methods.addEmployees(totalAmountBN, amountsBN).accounts({
      employer: provider.wallet.publicKey,
      employerAccount: PDA,
      payrollAccount: PayrollPDA,
      systemProgram,
    }).rpc();

    // const employerAccount = await program.account.organization.fetch(PDA);
    // console.log(employerAccount);


    // const payrollAccount = await program.account.payroll.fetch(PayrollPDA);
    // console.log(payrollAccount);
    
  })
});

