use anchor_lang::prelude::*;
// use anchor_spl::token::{self, SetAuthority, TokenAccount, Transfer, InitializeAccount};
use anchor_lang::{system_program::Transfer, system_program::transfer, solana_program::native_token::sol_to_lamports, solana_program::program::invoke_signed};

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
        require!(total_amount == sol_tokens, SolEarnError::IncorrectAllocations);
        require!(
            employees.len() as u16 == amounts.len() as u16,
            SolEarnError::InvalidEmployeeAmountCount
        );
        require!(ctx.accounts.employer.is_signer, SolEarnError::NotSigner);

        let employer_lamports: u64 = ctx.accounts.employer.lamports();
        require!(employer_lamports > sol_to_lamports(sol_tokens as f64), SolEarnError::InsufficientSol);
        emit!(MyEvent{ data: employer_lamports });

        let lmps: u64 = ctx.accounts.to.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        let transfer_cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.employer.to_account_info(),
                to: ctx.accounts.to.to_account_info()
            },
        );

        transfer(transfer_cpi_context, sol_tokens).unwrap();

        employer_account.employee_count = employees.len() as u16;

        for (i, employee) in employees.iter().enumerate() {
            payroll_account.employee_addresses.push(employee.key());
            payroll_account.employee_salaries.push(amounts[i]);
        }
        
        let lmps_after: u64 = ctx.accounts.to.to_account_info().lamports();
        emit!(MyEvent{ data: lmps_after });

        let employer_lamports: u64 = ctx.accounts.employer.lamports();
        emit!(MyEvent{ data: employer_lamports });

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

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub to: UncheckedAccount<'info>, 

    pub system_program: Program<'info, System>,
    // pub token_program: Program<'info, TokenAccount>,
}

#[derive(Accounts)]
pub struct AssignAuthorityToPDA<'info> {
    #[account(mut)]
    current_authority_signer: AccountInfo<'info>,
    #[account(mut)]
    pub program_pubkey: AccountInfo<'info>,
}

#[event]
pub struct MyEvent {
    pub data: u64,
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


// impl<'info> AddEmployees<'info> {
//     fn transfer_context(&self) -> CpiContext<'_, '_, '_, 'info, Transfer<'info>> {
//         let cpi_accounts = Transfer {
//             from: self.employer.to_account_info().clone(),
//             to: self.to.to_account_info().clone(),
//             authority: self.payroll_account.to_account_info().clone(),
//         };
//     }
// }