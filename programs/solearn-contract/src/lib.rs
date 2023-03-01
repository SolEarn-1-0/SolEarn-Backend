use anchor_lang::prelude::*;
use std::collections::HashMap;

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
        employees: Vec<Pubkey>,
        amounts: Vec<u64>,
        sol_tokens: u64,
    ) -> Result<()> {
        let employer_account = &mut ctx.accounts.employer_account;
        let payroll_account = &mut ctx.accounts.payroll_account;

        let total_amount: u64 = amounts.iter().sum();
        require!(total_amount == sol_tokens, SolEarnError::InsufficientSol);
        require!(
            employees.len() == amounts.len(),
            SolEarnError::InvalidEmployeeAmountCount
        );

        employer_account.employee_count = employees.len() as u16;

        let mut employee_allocations = HashMap::new();
        for (i, employee) in employees.iter().enumerate() {
            employee_allocations.insert(*employee, amounts[i]);
        }

        for employee in employees {
            payroll_account.employee_addresses.push(employee.key());
            payroll_account
                .employee_salaries
                .push(employee_allocations[&employee.key()])
        }

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction()]
pub struct Initialize<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(init, payer = employer, space = 8 + std::mem::size_of::<Organization>(), seeds = [EMPLOYER_TAG, employer.key().as_ref()], bump)]
    pub employer_account: Box<Account<'info, Organization>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction()]
pub struct AddEmployees<'info> {
    #[account(mut, has_one = employer)]
    pub employer_account: Box<Account<'info, Organization>>,

    #[account(
        init,
        seeds = [EMPLOYEES_TAG, employer.key().as_ref()],
        bump,
        payer = employer,
        space = std::mem::size_of::<Payroll>() + 8,
    )]
    pub payroll_account: Box<Account<'info, Payroll>>,

    #[account(mut)]
    pub employer: Signer<'info>,

    pub system_program: Program<'info, System>,
}
