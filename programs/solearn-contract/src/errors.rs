use anchor_lang::prelude::*;

#[error_code]
pub enum SolEarnError {
    #[msg("Insufficient SOL for payroll.")]
    InsufficientSol,
    #[msg("Number of employees dont match number of payout amounts.")]
    InvalidEmployeeAmountCount,
}
