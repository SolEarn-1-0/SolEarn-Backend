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

    pub fn initialize(_ctx: Context<Initialize>) -> Result<()> {
        Ok(())
    }

    pub fn create_organization(ctx: Context<CreateOrganzation>) -> Result<()> {
        let organization_account = &mut ctx.accounts.organization_account;
        let master = &mut ctx.accounts.master_account;

        // Increment last_id in master
        master.last_id += 1;


        organization_account.organization_id = master.last_id;
        organization_account.owner = ctx.accounts.owner_account.key();
        organization_account.employee_count = 0;
        Ok(())
    }

    pub fn create_payroll(
        ctx: Context<CreatePayroll>,
        _organization_id: u32,
        amounts: Vec<u64>,
        total_sol: u64,
    ) -> Result<()> {
        let organization_account = &mut ctx.accounts.organization_account;
        let payroll_account = &mut ctx.accounts.payroll_account;
        let owner = &ctx.accounts.owner_account;
        let employees = &ctx.remaining_accounts;
        let total_amount: u64 = amounts.iter().sum();
        let employer_lamports: u64 = ctx.accounts.owner_account.lamports();

        payroll_account.employer = ctx.accounts.owner_account.key();

        require!(total_amount == total_sol, SolEarnError::IncorrectAllocations);
        require!(
            employees.len() as u16 == amounts.len() as u16,
            SolEarnError::InvalidEmployeeAmountCount
        );
        require!(owner.is_signer, SolEarnError::NotSigner);
        require!(employer_lamports > total_sol, SolEarnError::InsufficientSol);
        
        // LOG before transaction
        emit!(MyEvent{ data: employer_lamports });

        let lmps: u64 = payroll_account.to_account_info().lamports().clone();
        emit!(MyEvent{ data: lmps });

        payroll_account.payroll_total = total_sol;

        let transfer_cpi_context = CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            Transfer {
                from: owner.to_account_info(),
                to: payroll_account.to_account_info()
            },
        );

        transfer(transfer_cpi_context, total_sol).unwrap();

        organization_account.last_payroll_id += 1;
        payroll_account.payroll_id = organization_account.last_payroll_id;

        // ---- Transfer end -----//

        organization_account.employee_count = employees.len() as u16;

        for (i, employee) in employees.iter().enumerate() {
            payroll_account.employee_addresses.push(employee.key());
            payroll_account.employee_salaries.push(amounts[i]);
        }
        
        //---- LOGS ----// 
        let lmps_after: u64 = ctx.accounts.payroll_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps_after });

        let employer_lamports: u64 = ctx.accounts.owner_account.lamports();
        emit!(MyEvent{ data: employer_lamports });
        // ---- LOGS end -----//

        Ok(())
    }

    pub fn initialize_payout(ctx: Context<Payout>, _organization_id: u32, _payroll_id: u32) -> Result<()> {
        let organization_account = &mut ctx.accounts.organization_account;
        let payroll_account = &mut ctx.accounts.payroll_account;
        let employee_account = &ctx.accounts.employee_account;

        require!(payroll_account.employer.key() == organization_account.owner.key(), SolEarnError::Unauthorized);
        require!(payroll_account.employee_addresses.len() as u16 == organization_account.employee_count, SolEarnError::InvalidEmployeePayrollCount);
        require!(payroll_account.is_payroll_complete == false, SolEarnError::PayrollInactive);

        require!(payroll_account.employee_addresses.contains(&employee_account.key()), SolEarnError::NotMember);

        let position = payroll_account.employee_addresses.iter().position(|&x| x == ctx.accounts.employee_account.key()).unwrap();

        let lmps: u64 = payroll_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        let lmps: u64 = employee_account.to_account_info().lamports();
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

        let salary = payroll_account.employee_salaries[position];
        require!(salary != 0, SolEarnError::SalararyClaim);

        // deduct emlpoyee salary from value in array -> should become 0
        payroll_account.employee_salaries[position] -= salary;
        payroll_account.payroll_total -= salary;

        emit!(MyEventTest{ data: payroll_account.employee_salaries[position] });

        **payroll_account.to_account_info().try_borrow_mut_lamports().unwrap() -= salary;
        **employee_account.to_account_info().try_borrow_mut_lamports().unwrap() += salary;
        
        // let ix = &system_instruction::transfer(&ctx.accounts.payout_account.key, &ctx.accounts.employee_account.key, payroll_account.employee_salaries[position]);
        // invoke_signed(ix, &[
        //     ctx.accounts.payout_account.to_account_info(),
        //     ctx.accounts.employee_account.to_account_info(),
        //     ctx.accounts.system_program.to_account_info()
        // ], &[&[b"SOLEARN_PAYOUT_ACCOUNT", &[bump_seed]]])?;

        let remaining_payroll_balance = payroll_account.payroll_total;

        if remaining_payroll_balance == 0 {
            payroll_account.is_payroll_complete = true;
        }

        let lmps: u64 = payroll_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        let lmps: u64 = employee_account.to_account_info().lamports();
        emit!(MyEvent{ data: lmps });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init, 
        payer = authority, 
        space = 8 + std::mem::size_of::<Master>(), 
        seeds = [MASTER_TAG],
        bump
    )]
    pub master_account: Box<Account<'info, Master>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CreateOrganzation<'info> {
    #[account(
        init,
        payer = owner_account,
        space = 8 + std::mem::size_of::<Organization>(),
        seeds = [ORGANIZATION_TAG, &(master_account.last_id + 1).to_le_bytes()],
        bump,
    )]
    pub organization_account: Account<'info, Organization>,

    #[account(
        mut,
        seeds = [MASTER_TAG],
        bump
    )]
    pub master_account: Account<'info, Master>,

    #[account(mut)]
    pub owner_account: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(organization_id: u32)]
pub struct CreatePayroll<'info> {
    #[account(
        init,
        seeds = [PAYROLL_TAG, owner_account.key().as_ref(), &(organization_account.last_payroll_id + 1).to_le_bytes()],
        bump,
        payer = owner_account,
        space = std::mem::size_of::<Payroll>() + (10 * (std::mem::size_of::<Pubkey>() + std::mem::size_of::<u64>())) + 8,
    )]
    pub payroll_account: Box<Account<'info, Payroll>>,

    #[account(
        mut,
        seeds = [ORGANIZATION_TAG, &organization_id.to_le_bytes()],
        bump
     )]
    pub organization_account: Box<Account<'info, Organization>>,

    #[account(mut)]
    pub owner_account: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(organization_id: u32, payroll_id: u32)]
pub struct Payout<'info> {
    #[account(
        mut,
        seeds = [ORGANIZATION_TAG, &organization_id.to_le_bytes()],
        bump
    )]
    pub organization_account: Box<Account<'info, Organization>>,

    #[account(
        mut,
        seeds = [PAYROLL_TAG, owner_account.key().as_ref(), &payroll_id.to_le_bytes()],
        bump
    )]
    pub payroll_account: Box<Account<'info, Payroll>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub owner_account: AccountInfo<'info>,

    #[account(mut)]
    employee_account: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct MyEvent {
    pub data: u64,
}

#[event]
pub struct MyEventTest {
    pub data: u64,
}