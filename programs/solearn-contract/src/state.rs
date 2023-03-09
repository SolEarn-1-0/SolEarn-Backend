use anchor_lang::prelude::*;

#[account]
#[derive(Default)]
pub struct Master {
    pub last_id: u32,
}

#[account]
#[derive(Default)]
pub struct Organization {
    pub owner: Pubkey,
    pub organization_id: u32,
    pub last_payroll_id: u32,
    pub employee_count: u16,
}

#[account()]
#[derive(Default)]
pub struct Payroll {
    pub payroll_id: u32,
    pub employer: Pubkey,
    pub employee_addresses: Vec<Pubkey>,
    pub employee_salaries: Vec<u64>,
    pub payroll_total: u64,
    pub is_payroll_complete: bool,
}
