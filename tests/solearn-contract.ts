import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, transferInstructionData } from "@solana/spl-token";
import { AccountMeta } from '@solana/web3.js';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { BN } from "bn.js";
import { assert } from "chai";
import { SolearnContract } from "../target/types/solearn_contract";
import { BorshCoder, EventParser, Program, web3 } from "@project-serum/anchor";

import { generateAmounts, generateMetas, generatePubkeys, generateRandomNumber, log, airdrop, getAllBalances } from "./helper";
import { getKeypair, getProgramKeypair, getEmployeeAccountPubkey, getEmployeeAccountKeypair } from "./utils";

describe("solearn-contract", () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.SolearnContract as Program<SolearnContract>;
  let PDA: anchor.web3.PublicKey;
  const employerKey = provider.wallet.publicKey.toBuffer();
  const employer = provider.wallet.publicKey;
  const systemProgram = anchor.web3.SystemProgram.programId;

  const program_account = anchor.web3.Keypair.generate();
  const employee_payout_account = anchor.web3.Keypair.generate();

  // it("Assign authority to PDA take control of employee payout account", async () => {
  //   const employeeAccountKeypair = getEmployeeAccountKeypair();
  //   const employeeKeyPair = getKeypair(employeeAccountKeypair);
  //   const employeeAccountPubkey = getEmployeeAccountPubkey();

  //   await program.methods.assignAuthorityToPda().accounts({
  //     currentAuthoritySigner: employeeAccountPubkey,
  //     programPubkey: employeeAccountPubkey,
  //     tokenProgram: TOKEN_PROGRAM_ID,
  //   }).signers([employeeKeyPair]).rpc();
  // })


  it("initialized!", async () => {
    [PDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYER_STATE'), employerKey], program.programId)

    // Add your test here.
    const tx = await program.methods.initialize().accounts({
      employer,
      organizationAccount: PDA,
      systemProgram,

    }).rpc();


    const employerAccount = await program.account.organization.fetch(PDA);
    console.log(employerAccount);

    assert(employerAccount.employeeCount == 0);
    assert(employerAccount.employer.toBase58() == employer.toBase58())
  });

  it("AddEmployees", async () => {
    const employeesMetas: AccountMeta[] = await generateMetas(3, employee_payout_account.publicKey);
    const amounts: number[] = await generateAmounts(4);
    const amountsBN = await amounts.map(amount => new BN(amount));
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const totalAmountBN: anchor.BN = new BN(totalAmount);

    // Iteratively derive the escrow pubkey
    let [payout_account, bump_seed] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('SOLEARN_PAYOUT_ACCOUNT')], program.programId);

    //* Request airdrop
    await airdrop(payout_account);


    const [PayrollPDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYEES_STATE'), employerKey], program.programId)

    const tx = await program.methods.addEmployees(amountsBN, totalAmountBN).accounts({
      employer,
      organizationAccount: PDA,
      payrollAccount: PayrollPDA,
      payoutAccount: payout_account,
      systemProgram,
    }).remainingAccounts(employeesMetas).rpc();

    const employerAccount = await program.account.organization.fetch(PDA);
    console.log(employerAccount);


    const payrollAccount = await program.account.payroll.fetch(PayrollPDA);
    console.log(payrollAccount);

    // for (let i = 0; i < payrollAccount.employeeSalaries.length; i++) {

    //   console.log(`${i}:`, Number(payrollAccount.employeeSalaries[i]));
    // }

    let _total = payrollAccount.employeeSalaries.reduce((a, b) => Number(a) + Number(b), 0);
    console.log("Total from contract: ", _total)

    log(tx, program);

    const total = payrollAccount.employeeSalaries.reduce((a, b) => Number(a) + Number(b), 0)
    assert(total == totalAmount);
    assert(payrollAccount.employer.toBase58() == employerAccount.employer.toBase58());
  })


  it("Should payout", async () => {
    const [PayrollPDA] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('EMPLOYEES_STATE'), employerKey], program.programId);

    let [payout_account, bump_seed] = await anchor.web3.PublicKey.findProgramAddressSync([utf8.encode('SOLEARN_PAYOUT_ACCOUNT')], program.programId);

    //* Request airdrop
    await airdrop(employee_payout_account.publicKey);

    const tx = await program.methods.payout(bump_seed).accounts({
      // pda: PayoutPDA,
      employer,
      employerAccount: PDA,
      payrollAccount: PayrollPDA,
      employeeAccount: employee_payout_account.publicKey,
      payoutAccount: payout_account,
      systemProgram,
    }).rpc()

    log(tx, program);
  })
});

