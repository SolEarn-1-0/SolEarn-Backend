use anchor_lang::prelude::*;
use std::collections::HashMap;

#[account]
#[derive(Default)]
pub struct Organization {
    pub employer: Pubkey,
    pub employee_count: u16,
}

#[account]
#[derive(Default)]
pub struct Payroll {
    pub employer: Pubkey,
    pub employee_addresses: Vec<Pubkey>,
    pub employee_salaries: Vec<u64>,
}
