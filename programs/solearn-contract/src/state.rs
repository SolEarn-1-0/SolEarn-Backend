use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Organization {
    pub employer: Pubkey,
    pub employee_count: u16,
}

#[account()]
pub struct Payroll {
    pub employer: Pubkey,
    pub employee_addresses: Vec<Pubkey>,
    pub employee_salaries: Vec<u64>,
    pub payroll_total: u64,
}
