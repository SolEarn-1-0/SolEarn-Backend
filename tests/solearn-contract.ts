import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, transferInstructionData } from "@solana/spl-token";
import { AccountMeta, Keypair, PublicKey, Connection } from '@solana/web3.js';
import { utf8 } from "@project-serum/anchor/dist/cjs/utils/bytes";
import { BN } from "bn.js";
import { assert } from "chai";
import { SolearnContract } from "../target/types/solearn_contract";
import { BorshCoder, EventParser, Program, web3 } from "@project-serum/anchor";

import { generateAmounts, generateMetas, generatePubkeys, generateRandomNumber, log, airdrop, getAllBalances, removeBefore } from "./helper";
import {
  getKeypair,
  getProgramKeypair,
  getMasterAccountAndPDA,
  getPayrollAccountAndPDA,
  getEmployeeAccountPubkey,
  getEmployeeAccountKeypair,
  getOrganizationAccountAndPDA,
} from "./utils";

describe("solearn-contract", () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  anchor.setProvider(provider);

  const program = anchor.workspace.SolearnContract as Program<SolearnContract>;
  let PDA: anchor.web3.PublicKey;

  const employerKey = provider.wallet.publicKey.toBuffer();
  const authority_or_ownerAccount = provider.wallet.publicKey;
  const systemProgram = anchor.web3.SystemProgram.programId;

  const program_account = anchor.web3.Keypair.generate();
  const employee_payout_account = anchor.web3.Keypair.generate();


  let masterAccount;
  let masterAccountPDA;
  let organizationAccount;
  let organizationAccountPDA;
  let _orgID;
  let payrollAccount;
  let payrollAccountPDA;
  let _payrollID;

  let intialPayrollTotal;
  let intialEmployeeSalary;

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
    masterAccount = await getMasterAccountAndPDA(program.programId);
    // let master = new Keypair({
    //   publicKey: masterAccount.pubkey.toBuffer(),
    //   secretKey: masterAccount.seckey
    // })

    // Add your test here.
    const tx = await program.methods.initialize().accounts({
      masterAccount: masterAccount.PDA,
      authority: authority_or_ownerAccount,
      systemProgram,

    }).rpc();


    masterAccountPDA = await program.account.master.fetch(masterAccount.PDA);

    assert(masterAccountPDA.lastId == 0);
  });

  it("Create Organization", async () => {
    organizationAccount = await getOrganizationAccountAndPDA(masterAccountPDA.lastId + 1, program.programId);

    const tx = await program.methods.createOrganization().accounts({
      masterAccount: masterAccount.PDA,
      organizationAccount: organizationAccount.PDA,
      ownerAccount: authority_or_ownerAccount,
      systemProgram,
    }).rpc();

    organizationAccountPDA = await program.account.organization.fetch(organizationAccount.PDA);

    assert(organizationAccountPDA.owner.toBase58() == authority_or_ownerAccount.toBase58());
  })

  it("AddEmployees", async () => {
    _orgID = organizationAccountPDA.organizationId;
    payrollAccount = await getPayrollAccountAndPDA(organizationAccountPDA.lastPayrollId + 1, authority_or_ownerAccount, program.programId);

    const employeesMetas: AccountMeta[] = await generateMetas(3, employee_payout_account.publicKey);
    const amounts: number[] = await generateAmounts(4);
    const amountsBN = await amounts.map(amount => new BN(amount));
    const totalAmount = amounts.reduce((a, b) => a + b, 0);
    const totalAmountBN: anchor.BN = new BN(totalAmount);

    //* Request airdrop
    // await airdrop(payout_account);

    const tx = await program.methods.createPayroll(_orgID, amountsBN, totalAmountBN).accounts({
      ownerAccount: authority_or_ownerAccount,
      organizationAccount: organizationAccount.PDA,
      payrollAccount: payrollAccount.PDA,
      systemProgram,
    }).remainingAccounts(employeesMetas).rpc();

    const _employerAccount = await program.account.organization.fetch(organizationAccount.PDA);

    payrollAccountPDA = await program.account.payroll.fetch(payrollAccount.PDA);

    // log(tx, program);

    const total = payrollAccountPDA.employeeSalaries.reduce((a, b) => Number(a) + Number(b), 0)
    intialPayrollTotal = Number(payrollAccountPDA.payrollTotal);
    intialEmployeeSalary = Number(payrollAccountPDA.employeeSalaries[3])

    assert(total == totalAmount);
    assert(payrollAccountPDA.employer.toBase58() == _employerAccount.owner.toBase58());
  })


  it("Should payout", async () => {
    //* Request airdrop
    // await airdrop(employee_payout_account.publicKey);
    _payrollID = payrollAccountPDA.payrollId;

    const tx = await program.methods.initializePayout(_orgID, _payrollID).accounts({
      ownerAccount: authority_or_ownerAccount,
      employeeAccount: employee_payout_account.publicKey,
      payrollAccount: payrollAccount.PDA,
      organizationAccount: organizationAccount.PDA,
      systemProgram,
    }).signers([employee_payout_account]).rpc()

    log(tx, program);

    const newCallToPayrollPDA = await program.account.payroll.fetch(payrollAccount.PDA);
    const updatedPayrollSalaryForEmployee = Number(newCallToPayrollPDA.employeeSalaries[3]);

    const updatedPayrollTotal = Number(payrollAccountPDA.payrollTotal);

    assert(updatedPayrollSalaryForEmployee == 0, "Employee updated salary not Equal 0");
    assert(intialPayrollTotal - intialEmployeeSalary <= updatedPayrollTotal, "Not LessThan or EqualTo updatedPayrollTotal");
  })

  it("Should fail to payout", async () => {
    //* Request airdrop
    // await airdrop(employee_payout_account.publicKey);
    _payrollID = payrollAccountPDA.payrollId;

    try {
      await program.methods.initializePayout(_orgID, _payrollID).accounts({
        ownerAccount: authority_or_ownerAccount,
        employeeAccount: employee_payout_account.publicKey,
        payrollAccount: payrollAccount.PDA,
        organizationAccount: organizationAccount.PDA,
        systemProgram,
      }).signers([employee_payout_account]).rpc()
    } catch (error) {
      let err = await removeBefore(error.toString(), 'Error Message: ')
      assert.strictEqual(err, 'Salary already claimed!.')
      return;
    }

    assert.fail('Expected transaction to fail with Salary already claimed!.');
  })
});

