use anchor_lang::prelude::*;

declare_id!("7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS");

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MarketStatResponse {
    odds_a: u64,
    odds_b: u64,
    numberOfBetters: u64,
    total_value: u64,
}
pub struct MarketPair {}
pub struct Share {}
pub struct Market {
    pub name: String,
    pub description: String,
    pub image: String,
    pub price: u64,
    pub start_timestamp: u64,
    pub end_timestamp: u64,
    pub creator: Pubkey,
    pub is_active: bool,
    pub total_value: u64,
    pub total_participants: u64,
    pub resolution_url: String,
}

#[program]
pub mod market {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
