use anchor_lang::prelude::*;
use anchor_lang::{
    system_program::Transfer, 
    system_program::transfer, 
    solana_program::native_token::sol_to_lamports,
    system_program::{assign, create_account},
    solana_program::{system_instruction, program::invoke_signed}
};
use anchor_spl::token::{self, CloseAccount, Burn, Mint, MintTo, SetAuthority, TokenAccount, InitializeAccount};
use spl_token::instruction::AuthorityType;

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
        let employer_account = &mut ctx.accounts.organization_account;
        employer_account.employer = ctx.accounts.employer.key();
        employer_account.employee_count = 0;

        Ok(())
    }

    pub fn add_employees(
        ctx: Context<AddEmployees>,
        amounts: Vec<u64>,
        sol_tokens: u64,
    ) -> Result<()> {
        let employer_account = &mut ctx.accounts.organization_account;
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
        // emit!(MyEvent{ data: employer_lamports });

        // let lmps: u64 = ctx.accounts.payout_account.to_account_info().lamports();
        // emit!(MyEvent{ data: lmps });

        payroll_account.payroll_total = sol_tokens;

        let transfer_cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: ctx.accounts.employer.to_account_info(),
                to: ctx.accounts.payout_account.to_account_info()
            },
        );

        transfer(transfer_cpi_context, sol_tokens).unwrap();

        // ---- Transfer end -----//

        employer_account.employee_count = employees.len() as u16;

        for (i, employee) in employees.iter().enumerate() {
            payroll_account.employee_addresses.push(employee.key());
            payroll_account.employee_salaries.push(amounts[i]);
        }
        
        //---- LOGS ----// 
        // let lmps_after: u64 = ctx.accounts.payout_account.to_account_info().lamports();
        // emit!(MyEvent{ data: lmps_after });

        // let employer_lamports: u64 = ctx.accounts.employer.lamports();
        // emit!(MyEvent{ data: employer_lamports });
        // ---- LOGS end -----//

        Ok(())
    }

    pub fn payout(ctx: Context<Payout>, instruction_data: u8) -> Result<()> {
        let (pda, _bump) = Pubkey::find_program_address(&[b"SOLEARN_PAYOUT_ACCOUNT"], ctx.program_id);
        let bump_seed = instruction_data;

        let employer_account = &mut ctx.accounts.employer_account;
        let payroll_account = &mut ctx.accounts.payroll_account;

        require!(payroll_account.employer.key() == ctx.accounts.employer.key(), SolEarnError::Unauthorized);
        require!(payroll_account.employee_addresses.len() as u16 == employer_account.employee_count, SolEarnError::InvalidEmployeePayrollCount);

        let lmps: u64 = ctx.accounts.employee_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        require!(payroll_account.employee_addresses.contains(&ctx.accounts.employee_account.key()), SolEarnError::NotMember);

        let position = payroll_account.employee_addresses.iter().position(|&x| x == ctx.accounts.employee_account.key()).unwrap();

        let lmps: u64 = ctx.accounts.payout_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        let lmps: u64 = ctx.accounts.employee_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        // let seeds = vec![bump_seed];
        // let seeds = vec![b"SOLEARN_PAYOUT_ACCOUNT".as_ref(), seeds.as_slice()];
        // let seeds = vec![seeds.as_slice()];
        // let seeds = seeds.as_slice();

        // let transfer_cpi_context = CpiContext::new_with_signer(
        //     ctx.accounts.system_program.to_account_info(),
        //     Transfer {
        //         from: ctx.accounts.payout_account.to_account_info(),
        //         to: ctx.accounts.employee_account.to_account_info(),
        //     },
        //     seeds
        // );

        // transfer(transfer_cpi_context, payroll_account.employee_salaries[position]).unwrap();
        
        let ix = &system_instruction::transfer(&ctx.accounts.payout_account.key, &ctx.accounts.employee_account.key, payroll_account.employee_salaries[position]);
        invoke_signed(ix, &[
            ctx.accounts.payout_account.to_account_info(),
            ctx.accounts.employee_account.to_account_info(),
            ctx.accounts.system_program.to_account_info()
        ], &[&[b"SOLEARN_PAYOUT_ACCOUNT", &[bump_seed]]])?;

        let lmps: u64 = ctx.accounts.payout_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        let lmps: u64 = ctx.accounts.employee_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        // **ctx.accounts.payout_account.try_borrow_mut_lamports()? -= payroll_account.employee_salaries[position];
        // **ctx.accounts.employee_account.try_borrow_mut_lamports()? += payroll_account.employee_salaries[position];

        Ok(())
    }

    pub fn assign_authority_to_pda(ctx: Context<AssignAuthorityToPDA>) -> Result<()> {
        let (pda, _bump) = Pubkey::find_program_address(&[b"solearnpda"], ctx.program_id);

        let cpi_accounts = SetAuthority {
            current_authority: ctx.accounts.current_authority_signer.to_account_info(),
            account_or_mint: ctx.accounts.program_pubkey.to_account_info()
        };

        token::set_authority(CpiContext::new(ctx.accounts.token_program.clone(), cpi_accounts), AuthorityType::AccountOwner, Some(pda))?;

        Ok(())
    }
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
    pub organization_account: Box<Account<'info, Organization>>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction()]
pub struct AddEmployees<'info> {
    #[account(mut)]
    pub employer: Signer<'info>,

    #[account(mut, has_one = employer)]
    pub organization_account: Box<Account<'info, Organization>>,

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
    pub payout_account: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    // pub token_program: Program<'info, TokenAccount>,
}

#[derive(Accounts)]
#[instruction()]
pub struct Payout<'info> {
    // #[account(mut)]
    // pub pda: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub employer: AccountInfo<'info>,

    #[account(mut)]
    pub employer_account: Box<Account<'info, Organization>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub payout_account: AccountInfo<'info>,

    #[account(mut)]
    pub payroll_account: Box<Account<'info, Payroll>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    employee_account: AccountInfo<'info>,


    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AssignAuthorityToPDA<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    current_authority_signer: Signer<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub program_pubkey: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub token_program: AccountInfo<'info>,
}

#[event]
pub struct MyEvent {
    pub data: u64,
}

#[event]
pub struct MyEventTest {
    pub data: u16,
}