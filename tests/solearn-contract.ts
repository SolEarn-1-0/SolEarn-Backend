import * as anchor from "@project-serum/anchor";
import { TOKEN_PROGRAM_ID, transferInstructionData } from "@solana/spl-token";
import { AccountMeta, Keypair, PublicKey, Connection } from '@solana/web3.js';
import { BN } from "bn.js";
import { assert } from "chai";
import { SolearnContract } from "../target/types/solearn_contract";
import { Program } from "@project-serum/anchor";

import {
  generateAmounts,
  generateMetas,
  log,
  airdrop,
  removeBefore
} from "./helper";

import {
  getMasterAccountAndPDA,
  getPayrollAccountAndPDA,
  getOrganizationAccountAndPDA,
} from "./utils";

describe("solearn-contract", () => {
  const provider = anchor.AnchorProvider.env();
  // Configure the client to use the local cluster.
  console.log(provider);
  anchor.setProvider(provider);

  const program = anchor.workspace.SolearnContract as Program<SolearnContract>;

  const authority_or_ownerAccount = provider.wallet.publicKey;
  const systemProgram = anchor.web3.SystemProgram.programId;

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


  it("initialized!", async () => {
    masterAccount = await getMasterAccountAndPDA(program.programId);

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

    // log(tx, program);

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

