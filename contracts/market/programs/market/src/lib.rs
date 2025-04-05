use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount, Transfer};
use std::collections::HashMap;

declare_id!("7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS");

#[program]
pub mod solcast {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.admin = ctx.accounts.admin.key();
        state.market_ids = Vec::new();
        state.market_id_counter = 0;
        state.last_market_id = 0;

        Ok(())
    }

    pub fn create_market(
        ctx: Context<CreateMarket>,
        id: String,
        options: Vec<String>,
        end_time: i64,
        buy_token: Pubkey, // Mint address of token used for buying shares
        banner_url: String,
        description: String,
        title: String,
        end_time_string: String,
        start_time_string: String,
        resolution_source: String,
    ) -> Result<()> {
        // Only admin can create markets
        require!(
            ctx.accounts.admin.key() == ctx.accounts.state.admin,
            SolcastError::Unauthorized
        );

        // Check if market ID already exists
        require!(
            !ctx.accounts.state.market_ids.contains(&id),
            SolcastError::MarketIdAlreadyExists
        );

        // Markets must have exactly two options
        require!(options.len() == 2, SolcastError::InvalidOptionsCount);

        // Update state
        let state = &mut ctx.accounts.state;
        state.market_id_counter += 1;
        state.last_market_id = state.market_id_counter;
        state.market_ids.push(id.clone());
        state.market_addresses.push(ctx.accounts.market.key());

        // Create token mints
        // Initialize mint A
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: ctx.accounts.token_a_mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            6, // decimals
            &ctx.accounts.market_authority.key(),
            Some(&ctx.accounts.market_authority.key()),
        )?;

        // Initialize mint B
        token::initialize_mint(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                token::InitializeMint {
                    mint: ctx.accounts.token_b_mint.to_account_info(),
                    rent: ctx.accounts.rent.to_account_info(),
                },
            ),
            6, // decimals
            &ctx.accounts.market_authority.key(),
            Some(&ctx.accounts.market_authority.key()),
        )?;

        // Create market data
        let market = &mut ctx.accounts.market;
        market.id = id;
        market.option_a = options[0].clone();
        market.option_b = options[1].clone();
        market.resolved = false;
        market.outcome = OutcomeState::Unresolved;
        market.end_time = end_time;
        market.total_value = 0;
        market.num_bettors = 0;
        market.buy_token = buy_token;
        market.token_a_mint = ctx.accounts.token_a_mint.key();
        market.token_b_mint = ctx.accounts.token_b_mint.key();
        market.banner_url = banner_url;
        market.description = description;
        market.title = title;
        market.end_time_string = end_time_string;
        market.start_time_string = start_time_string;
        market.resolution_source = resolution_source;
        market.total_option_a = 0;
        market.total_option_b = 0;
        market.authority = ctx.accounts.market_authority.key();
        market.authority_bump = ctx.bumps.market_authority;

        // Initialize the share accounts as empty
        market.shares = Vec::new();

        Ok(())
    }

    pub fn buy_share(
        ctx: Context<BuyShare>,
        market_id: String,
        option: String,
        amount: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        // Check if market exists
        require!(market.id == market_id, SolcastError::MarketNotFound);

        // Check if market is already resolved
        require!(!market.resolved, SolcastError::MarketAlreadyResolved);

        // Validate option is either option_a or option_b
        require!(
            option == market.option_a || option == market.option_b,
            SolcastError::InvalidOption
        );

        // Transfer tokens from user to program authority
        let transfer_ctx = CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.user_token_account.to_account_info(),
                to: ctx.accounts.market_token_account.to_account_info(),
                authority: ctx.accounts.user.to_account_info(),
            },
        );
        token::transfer(transfer_ctx, amount)?;

        // Mint the appropriate option token to the user
        let option_mint = if option == market.option_a {
            ctx.accounts.token_a_mint.to_account_info()
        } else {
            ctx.accounts.token_b_mint.to_account_info()
        };

        // Mint authority seeds for signing
        let authority_seeds = &[
            b"market_authority",
            market.id.as_bytes(),
            &[market.authority_bump],
        ];
        let signer = &[&authority_seeds[..]];

        // Mint tokens to user
        let mint_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            token::MintTo {
                mint: option_mint,
                to: ctx.accounts.user_option_token_account.to_account_info(),
                authority: ctx.accounts.market_authority.to_account_info(),
            },
            signer,
        );
        token::mint_to(mint_ctx, amount)?;

        // Update market state
        market.total_value += amount;

        if option == market.option_a {
            market.total_option_a += amount;
        } else {
            market.total_option_b += amount;
        }

        // Update or add user share
        let user_key = ctx.accounts.user.key();

        // Try to find existing share for this user
        let share_index = market
            .shares
            .iter()
            .position(|s| s.user == user_key && s.option == option);

        if let Some(index) = share_index {
            // Update existing share
            market.shares[index].amount += amount;
        } else {
            // Create new share
            market.shares.push(Share {
                user: user_key,
                option: option.clone(),
                amount,
                has_withdrawn: false,
            });

            // Check if this is a new user for this market
            let user_count = market
                .shares
                .iter()
                .map(|s| s.user)
                .collect::<std::collections::HashSet<_>>()
                .len();

            market.num_bettors = user_count as u64;
        }

        Ok(())
    }

    pub fn resolve(
        ctx: Context<ResolveMarket>,
        market_id: String,
        winning_option: String,
    ) -> Result<()> {
        // Only admin can resolve markets
        require!(
            ctx.accounts.admin.key() == ctx.accounts.state.admin,
            SolcastError::Unauthorized
        );

        let market = &mut ctx.accounts.market;

        // Check if market exists
        require!(market.id == market_id, SolcastError::MarketNotFound);

        // Check if market is already resolved
        require!(!market.resolved, SolcastError::MarketAlreadyResolved);

        // Check if the winning option is valid
        require!(
            winning_option == market.option_a || winning_option == market.option_b,
            SolcastError::InvalidOption
        );

        // Set the market as resolved
        market.resolved = true;

        // Set the outcome
        if winning_option == market.option_a {
            market.outcome = OutcomeState::OptionA;
        } else {
            market.outcome = OutcomeState::OptionB;
        }

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, market_id: String) -> Result<()> {
        let market = &mut ctx.accounts.market;

        // Check if market exists
        require!(market.id == market_id, SolcastError::MarketNotFound);

        // Check if market is resolved
        require!(market.resolved, SolcastError::MarketNotResolved);

        let user = ctx.accounts.user.key();

        // Find user's winning share
        let winning_option = match market.outcome {
            OutcomeState::OptionA => &market.option_a,
            OutcomeState::OptionB => &market.option_b,
            OutcomeState::Unresolved => return Err(SolcastError::MarketNotResolved.into()),
        };

        let share_index = market
            .shares
            .iter()
            .position(|s| s.user == user && s.option == *winning_option);

        // Check if user has a winning share
        let share_index = match share_index {
            Some(index) => index,
            None => return Err(SolcastError::NoWinningShares.into()),
        };

        // Check if user has already withdrawn
        require!(
            !market.shares[share_index].has_withdrawn,
            SolcastError::AlreadyWithdrawn
        );

        // Calculate winnings
        let user_share_amount = market.shares[share_index].amount;
        let total_winning_option = if *winning_option == market.option_a {
            market.total_option_a
        } else {
            market.total_option_b
        };

        // If no one bet on the winning option, this would be a division by zero
        require!(total_winning_option > 0, SolcastError::NoWinningShares);

        // Calculate user's share of the total pool
        // Apply a 5% commission rate on winnings
        const COMMISSION_RATE: u64 = 5; // 5%

        let user_share_ratio = (user_share_amount as f64) / (total_winning_option as f64);
        let total_payout = (market.total_value as f64) * user_share_ratio;
        let commission = total_payout * (COMMISSION_RATE as f64 / 100.0);
        let final_payout = (total_payout - commission) as u64;

        // Mark as withdrawn
        market.shares[share_index].has_withdrawn = true;

        // Transfer tokens from market to user
        let seeds = &[
            b"market_authority",
            market.id.as_bytes(),
            &[market.authority_bump],
        ];
        let signer = &[&seeds[..]];

        let transfer_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.market_token_account.to_account_info(),
                to: ctx.accounts.user_token_account.to_account_info(),
                authority: ctx.accounts.market_authority.to_account_info(),
            },
            signer,
        );
        token::transfer(transfer_ctx, final_payout)?;

        Ok(())
    }

    pub fn get_all_markets(ctx: Context<GetAllMarkets>) -> Result<Vec<MarketInfo>> {
        let state = &ctx.accounts.state;

        let mut market_infos = Vec::new();

        for i in 0..state.market_ids.len() {
            if i < state.market_addresses.len() {
                market_infos.push(MarketInfo {
                    id: state.market_ids[i].clone(),
                    address: state.market_addresses[i],
                });
            }
        }

        Ok(market_infos)
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(init, payer = admin, space = 8 + State::SPACE)]
    pub state: Account<'info, State>,

    #[account(mut)]
    pub admin: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(id: String)]
pub struct CreateMarket<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,

    #[account(init, payer = admin, space = 8 + Market::SPACE)]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub admin: Signer<'info>,

    /// CHECK: This is initialized in the instruction
    #[account(
        seeds = [b"market_authority", id.as_bytes()],
        bump,
    )]
    pub market_authority: UncheckedAccount<'info>,

    /// CHECK: We're initializing the mint with token instructions
    #[account(init, payer = admin, space = 82, owner = token_program.key())]
    pub token_a_mint: UncheckedAccount<'info>,

    /// CHECK: We're initializing the mint with token instructions  
    #[account(init, payer = admin, space = 82, owner = token_program.key())]
    pub token_b_mint: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(market_id: String, option: String)]
pub struct BuyShare<'info> {
    #[account(
        mut,
        constraint = market.authority == market_authority.key() @ SolcastError::InvalidMarketAuthority
    )]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: This authority is verified in the market account
    pub market_authority: UncheckedAccount<'info>,

    /// CHECK: Account ownership and mint are verified in constraints
    #[account(
        mut,
        owner = user.key() @ SolcastError::InvalidTokenAccount,
    )]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: Account ownership and mint are verified in constraints
    #[account(
        mut,
        owner = market_authority.key() @ SolcastError::InvalidTokenAccount,
    )]
    pub market_token_account: UncheckedAccount<'info>,

    /// CHECK: Mint is verified based on selected option
    #[account(mut)]
    pub user_option_token_account: UncheckedAccount<'info>,

    /// CHECK: This is verified in the instruction
    #[account(
        mut,
        constraint = (option == market.option_a && token_a_mint.key() == market.token_a_mint) @ SolcastError::InvalidOptionMint,
    )]
    pub token_a_mint: UncheckedAccount<'info>,

    /// CHECK: This is verified in the instruction
    #[account(
        mut,
        constraint = (option == market.option_b && token_b_mint.key() == market.token_b_mint) @ SolcastError::InvalidOptionMint,
    )]
    pub token_b_mint: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub state: Account<'info, State>,

    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(constraint = admin.key() == state.admin @ SolcastError::Unauthorized)]
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(market_id: String)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub market: Account<'info, Market>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// CHECK: This authority is verified in the market account
    pub market_authority: UncheckedAccount<'info>,

    /// CHECK: Account ownership is verified in constraints
    #[account(
        mut,
        owner = user.key() @ SolcastError::InvalidTokenAccount,
    )]
    pub user_token_account: UncheckedAccount<'info>,

    /// CHECK: Account ownership is verified in constraints
    #[account(
        mut,
        owner = market_authority.key() @ SolcastError::InvalidTokenAccount,
    )]
    pub market_token_account: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
}

#[account]
pub struct State {
    pub admin: Pubkey,
    pub market_ids: Vec<String>,
    pub market_id_counter: u64,
    pub last_market_id: u64,
    pub market_addresses: Vec<Pubkey>,
}

impl State {
    // Size calculation for account allocation
    pub const SPACE: usize = 32 + // admin pubkey
                             4 + (32 * 50) + // market_ids vector (assuming max 50 markets with 32 bytes each)
                             8 + // market_id_counter
                             8 + // last_market_id
                             4 + (32 * 50); // market_addresses vector (assuming max 50 markets)
}

#[account]
pub struct Market {
    pub id: String,
    pub option_a: String,
    pub option_b: String,
    pub resolved: bool,
    pub outcome: OutcomeState,
    pub end_time: i64,
    pub total_value: u64,
    pub num_bettors: u64,
    pub buy_token: Pubkey,
    pub token_a_mint: Pubkey,
    pub token_b_mint: Pubkey,
    pub banner_url: String,
    pub description: String,
    pub title: String,
    pub end_time_string: String,
    pub start_time_string: String,
    pub resolution_source: String,
    pub total_option_a: u64,
    pub total_option_b: u64,
    pub authority: Pubkey,
    pub authority_bump: u8,
    pub shares: Vec<Share>,
}

impl Market {
    // Size calculation for account allocation
    pub const SPACE: usize = 36 + // id String (assuming max 32 chars + 4 bytes for length)
                             36 + // option_a (assuming max 32 chars)
                             36 + // option_b (assuming max 32 chars)
                             1 +  // resolved bool
                             1 +  // outcome enum
                             8 +  // end_time
                             8 +  // total_value
                             8 +  // num_bettors
                             32 + // buy_token pubkey
                             32 + // token_a_mint pubkey
                             32 + // token_b_mint pubkey
                             100 + // banner_url (assuming max length)
                             200 + // description (assuming max length)
                             100 + // title (assuming max length)
                             20 +  // end_time_string
                             20 +  // start_time_string
                             100 + // resolution_source
                             8 +   // total_option_a
                             8 +   // total_option_b
                             32 +  // authority
                             1 +   // authority_bump
                             4 + (100 * Share::SPACE); // shares vector (max 100 shares)
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Share {
    pub user: Pubkey,
    pub option: String,
    pub amount: u64,
    pub has_withdrawn: bool,
}

impl Share {
    pub const SPACE: usize = 32 + // user pubkey
                             36 + // option string
                             8 +  // amount
                             1; // has_withdrawn
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum OutcomeState {
    Unresolved,
    OptionA,
    OptionB,
}

#[error_code]
pub enum SolcastError {
    #[msg("Unauthorized operation")]
    Unauthorized,

    #[msg("Market ID already exists")]
    MarketIdAlreadyExists,

    #[msg("Invalid option")]
    InvalidOption,

    #[msg("Market already resolved")]
    MarketAlreadyResolved,

    #[msg("Market not found")]
    MarketNotFound,

    #[msg("Market not resolved")]
    MarketNotResolved,

    #[msg("No winning shares")]
    NoWinningShares,

    #[msg("You've already withdrawn your winnings")]
    AlreadyWithdrawn,

    #[msg("Markets must have exactly two options")]
    InvalidOptionsCount,

    #[msg("Invalid token account")]
    InvalidTokenAccount,

    #[msg("Invalid option token account")]
    InvalidOptionTokenAccount,

    #[msg("Invalid option mint")]
    InvalidOptionMint,

    #[msg("Invalid market authority")]
    InvalidMarketAuthority,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct MarketInfo {
    pub id: String,
    pub address: Pubkey,
}

#[derive(Accounts)]
pub struct GetAllMarkets<'info> {
    pub state: Account<'info, State>,
}
