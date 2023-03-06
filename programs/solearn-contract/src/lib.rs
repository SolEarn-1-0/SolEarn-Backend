use anchor_lang::prelude::*;

use constants::*;
use errors::*;
use state::*;

pub mod constants;
pub mod errors;
pub mod state;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
mod solearn_contract {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let employer_account = &mut ctx.accounts.employer_account;
        employer_account.employer = ctx.accounts.employer.key();
        employer_account.employee_count = 0;
        Ok(())
    }

    pub fn add_employees(
        ctx: Context<AddEmployees>,
        amounts: Vec<u64>,
        sol_tokens: u64,
    ) -> Result<()> {
        let employer_account = &mut ctx.accounts.employer_account;
        let payroll_account = &mut ctx.accounts.payroll_account;
        payroll_account.employer = ctx.accounts.employer.key();
        let employees = &ctx.remaining_accounts;

        let total_amount: u64 = amounts.iter().sum();
        require!(total_amount == sol_tokens, SolEarnError::InsufficientSol);
        require!(
            employees.len() as u16 == amounts.len() as u16,
            SolEarnError::InvalidEmployeeAmountCount
        );

        employer_account.employee_count = employees.len() as u16;

        for (i, employee) in employees.iter().enumerate() {
            payroll_account.employee_addresses.push(employee.key());
            payroll_account.employee_salaries.push(amounts[i]);
        }

        Ok(())
    }

    // pub fn payout(ctx: Context<Payout>) -> Result<()> {
    //     let employer_account = &mut ctx.accounts.employer_account;

    //     for (employee_address, allocation) in employer
    // }
}

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(
        init, 
        payer = employer, 
        space = 8 + std::mem::size_of::<Organization>(), 
        seeds = [EMPLOYER_TAG, employer.key().as_ref()], 
        bump
    )]
    pub employer_account: Box<Account<'info, Organization>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction()]
pub struct AddEmployees<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(mut, has_one = employer)]
    pub employer_account: Box<Account<'info, Organization>>,

    #[account(
        init,
        seeds = [EMPLOYEES_TAG, employer.key().as_ref()],
        bump,
        payer = employer,
        space = std::mem::size_of::<Payroll>() + (10 * (std::mem::size_of::<Pubkey>() + std::mem::size_of::<u64>())) + 8,
    )]
    pub payroll_account: Box<Account<'info, Payroll>>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct MyEvent {
    pub data: u16,
}

#[event]
pub struct MyEventTest {
    pub data: u16,
}

// #[derive(Accounts)]
// #[instruction()]
// pub struct Payout<'info> {
//     #[account(mut)]
//     pub employer_account: Box<Account<'info, Organization>>,
//     // pub employer: AccountInfo<'info>,
//     #[account(mut)]
//     pub system_program: Program<'info, System>,
// }
