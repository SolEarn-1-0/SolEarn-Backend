use anchor_lang::prelude::*;

#[error_code]
pub enum SolEarnError {
    #[msg("Total sol and sum of sol allocation not equal.")]
    IncorrectAllocations,
    #[msg("Insufficient SOL for payroll.")]
    InsufficientSol,
    #[msg("Number of employees dont match number of payout amounts.")]
    InvalidEmployeeAmountCount,
    #[msg("Not Signer! Can't initiate transfer")]
    NotSigner,
}
