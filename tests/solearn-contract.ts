import * as anchor from "@project-serum/anchor";
import { AccountMeta, PublicKey } from '@solana/web3.js';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { BN } from "bn.js";
import { assert } from "chai";
import { SolearnContract } from "../target/types/solearn_contract";
import { BorshCoder, EventParser, Program, web3 } from "@project-serum/anchor";

import { generateAmounts, generateMetas, generatePubkeys, generateRandomNumber, log, airdrop } from "./helper";

describe("solearn-contract", () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.SolearnContract as Program<SolearnContract>;
  let PDA: anchor.web3.PublicKey;
  const employerKey = provider.wallet.publicKey.toBuffer();
  const employer = provider.wallet.publicKey;
  const systemProgram = anchor.web3.SystemProgram.programId;
  const toAccount = anchor.web3.Keypair.generate();

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


  it("Is initialized!", async () => {
    [PDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYER_STATE'), employerKey], program.programId)

    // Add your test here.
    const tx = await program.methods.initialize().accounts({
      employer,
      employerAccount: PDA,
      systemProgram,

    }).rpc();


    const employerAccount = await program.account.organization.fetch(PDA);
    console.log(employerAccount);

    assert(employerAccount.employeeCount == 0);
    assert(employerAccount.employer.toBase58() == employer.toBase58())
  });

  it("All Employer to AddEmployees", async () => {
    const employeesMetas: AccountMeta[] = await generateMetas(3);
    const amounts: number[] = await generateAmounts(3);
    const amountsBN = await amounts.map(amount => new BN(amount));
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const totalAmountBN: anchor.BN = new BN(totalAmount);

    //* Request airdrop
    await airdrop(toAccount);


    const [PayrollPDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYEES_STATE'), employerKey], program.programId)

    const tx = await program.methods.addEmployees(amountsBN, totalAmountBN).accounts({
      employer,
      employerAccount: PDA,
      payrollAccount: PayrollPDA,
      to: toAccount.publicKey,
      systemProgram,
    }).remainingAccounts(employeesMetas).rpc();

    const employerAccount = await program.account.organization.fetch(PDA);
    console.log(employerAccount);


    const payrollAccount = await program.account.payroll.fetch(PayrollPDA);
    console.log(payrollAccount);

    for (let i = 0; i < payrollAccount.employeeSalaries.length; i++) {
      console.log(`${i}:`, Number(payrollAccount.employeeSalaries[i]));
    }

    log(tx, program);

    const total = payrollAccount.employeeSalaries.reduce((a, b) => Number(a) + Number(b), 0)
    assert(total == totalAmount);
    assert(payrollAccount.employer.toBase58() == employerAccount.employer.toBase58());
  })
});

