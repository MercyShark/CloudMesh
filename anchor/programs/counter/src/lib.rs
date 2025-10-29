use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Clock;

declare_id!("2pbdwB29EXvsfEcigJrMwEaDx2T16zZ47aK5oGabjx7S");

#[program]
pub mod cloudmesh {
    use super::*;

    pub fn initialize_job(
        ctx: Context<InitializeJob>,
        title: String,
        code_cid: String,
        job_type: JobType,
    ) -> Result<()> {
        require!(title.len() > 0 && title.len() <= 100, ErrorCode::InvalidTitle);
        require!(code_cid.len() > 0 && code_cid.len() <= 100, ErrorCode::InvalidCID);

        let job = &mut ctx.accounts.job;
        let clock = Clock::get()?;

        job.owner = ctx.accounts.owner.key();
        job.title = title;
        job.code_cid = code_cid;
        job.result_cid = String::new();
        job.start_time = clock.unix_timestamp;
        job.end_time = 0;
        job.status = JobStatus::Pending;
        job.job_type = job_type;
        job.cost = 0;
        job.cost_paid = false;
        job.bump = ctx.bumps.job;

        emit!(JobCreated {
            job_key: job.key(),
            owner: job.owner,
            title: job.title.clone(),
        });

        Ok(())
    }

    pub fn complete_job(
        ctx: Context<CompleteJob>,
        result_cid: String,
        cost: u64,
    ) -> Result<()> {
        require!(result_cid.len() > 0 && result_cid.len() <= 100, ErrorCode::InvalidCID);
        require!(cost > 0, ErrorCode::InvalidCost);
        
        let job = &mut ctx.accounts.job;
        require!(job.status != JobStatus::Completed, ErrorCode::JobAlreadyCompleted);
        require!(job.status != JobStatus::Cancelled, ErrorCode::JobCancelled);

        let clock = Clock::get()?;
        
        job.result_cid = result_cid;
        job.end_time = clock.unix_timestamp;
        job.cost = cost;
        job.status = JobStatus::Completed;

        emit!(JobCompleted {
            job_key: job.key(),
            result_cid: job.result_cid.clone(),
            end_time: job.end_time,
            cost: job.cost,
        });

        Ok(())
    }

    pub fn mark_payment(ctx: Context<MarkPayment>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(!job.cost_paid, ErrorCode::AlreadyPaid);

        job.cost_paid = true;

        emit!(PaymentMarked {
            job_key: job.key(),
            amount: job.cost,
        });

        Ok(())
    }

    pub fn cancel_job(ctx: Context<CancelJob>) -> Result<()> {
        let job = &mut ctx.accounts.job;
        require!(job.status != JobStatus::Completed, ErrorCode::JobAlreadyCompleted);
        require!(job.status != JobStatus::Cancelled, ErrorCode::JobAlreadyCancelled);

        let clock = Clock::get()?;
        job.status = JobStatus::Cancelled;
        job.end_time = clock.unix_timestamp;

        emit!(JobCancelled {
            job_key: job.key(),
            cancelled_at: job.end_time,
        });

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(title: String)]
pub struct InitializeJob<'info> {
    #[account(
        init,
        payer = owner,
        space = JOB_ACCOUNT_SIZE,
        seeds = [b"job", owner.key().as_ref(), title.as_bytes()],
        bump
    )]
    pub job: Account<'info, Job>,
    
    #[account(mut)]
    pub owner: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CompleteJob<'info> {
    #[account(
        mut,
        seeds = [b"job", job.owner.as_ref(), job.title.as_bytes()],
        bump = job.bump,
    )]
    pub job: Account<'info, Job>,
    
    /// Worker authorized to complete jobs
    pub worker: Signer<'info>,
}

#[derive(Accounts)]
pub struct MarkPayment<'info> {
    #[account(
        mut,
        seeds = [b"job", job.owner.as_ref(), job.title.as_bytes()],
        bump = job.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub job: Account<'info, Job>,
    
    pub owner: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelJob<'info> {
    #[account(
        mut,
        seeds = [b"job", job.owner.as_ref(), job.title.as_bytes()],
        bump = job.bump,
        has_one = owner @ ErrorCode::Unauthorized
    )]
    pub job: Account<'info, Job>,
    
    pub owner: Signer<'info>,
}

#[account]
pub struct Job {
    pub owner: Pubkey,        // 32 bytes
    pub title: String,        // 4 + max_len (100)
    pub code_cid: String,     // 4 + max_len (100)
    pub result_cid: String,   // 4 + max_len (100)
    pub start_time: i64,      // 8 bytes
    pub end_time: i64,        // 8 bytes
    pub status: JobStatus,    // 1 byte (enum tag)
    pub job_type: JobType,    // 1 byte (enum tag)
    pub cost: u64,            // 8 bytes
    pub cost_paid: bool,      // 1 byte
    pub bump: u8,             // 1 byte
}


pub const JOB_ACCOUNT_SIZE: usize = 8 + 300;

// Enums
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobStatus {
    Pending,
    Completed,
    Cancelled,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum JobType {
    Cron,
    Api,
    Manual,
}

// Events
#[event]
pub struct JobCreated {
    pub job_key: Pubkey,
    pub owner: Pubkey,
    pub title: String,
}

#[event]
pub struct JobCompleted {
    pub job_key: Pubkey,
    pub result_cid: String,
    pub end_time: i64,
    pub cost: u64,
}

#[event]
pub struct PaymentMarked {
    pub job_key: Pubkey,
    pub amount: u64,
}

#[event]
pub struct JobCancelled {
    pub job_key: Pubkey,
    pub cancelled_at: i64,
}

// Errors
#[error_code]
pub enum ErrorCode {
    #[msg("Title must be between 1 and 100 characters")]
    InvalidTitle,
    
    #[msg("CID must be between 1 and 100 characters")]
    InvalidCID,
    
    #[msg("Cost must be greater than 0")]
    InvalidCost,
    
    #[msg("Job is already completed")]
    JobAlreadyCompleted,
    
    #[msg("Job has been cancelled")]
    JobCancelled,
    
    #[msg("Job is already cancelled")]
    JobAlreadyCancelled,
    
    #[msg("Invalid status transition")]
    InvalidStatusTransition,
    
    #[msg("Payment already marked as paid")]
    AlreadyPaid,
    
    #[msg("Unauthorized: Only owner can perform this action")]
    Unauthorized,
}