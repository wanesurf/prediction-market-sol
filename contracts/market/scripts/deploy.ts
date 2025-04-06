import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Solcast } from "../target/types/solcast";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";

async function main() {
  // Configure the client to use devnet
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.solcast as Program<Solcast>;
  
  console.log("Deploying to devnet...");
  
  // Generate a new keypair for the state account
  const stateAccount = anchor.web3.Keypair.generate();
  console.log("State account:", stateAccount.publicKey.toString());
  
  // Initialize the contract
  console.log("Initializing the Solcast contract...");
  await program.methods
    .initialize()
    .accounts({
      state: stateAccount.publicKey,
      admin: provider.wallet.publicKey,
      //@ts-ignore
      systemProgram: SystemProgram.programId,
    })
    .signers([stateAccount])
    .rpc();
  
  console.log("Solcast contract initialized successfully!");
  
  // Save the state account to a file for future use
  const stateAccountPath = path.join(__dirname, "state-account.json");
  fs.writeFileSync(stateAccountPath, JSON.stringify(Array.from(stateAccount.secretKey)));
  console.log("State account saved to:", stateAccountPath);
  
  // Generate a new keypair for the market account
  const marketAccount = anchor.web3.Keypair.generate();
  console.log("Market account:", marketAccount.publicKey.toString());
  
  // Market parameters
  const marketId = "solcast-market-10";
  const options = ["Yes", "No"];
  const endTime = Math.floor(Date.now() / 1000) + 86400 * 7; // 7 days from now
  const bannerUrl = "https://example.com/market-banner.jpg";
  const description = "First Solcast prediction market on the new program";
  const title = "(10) Will Solana reach $200 by the end of 2025?";
  const endTimeString = new Date(endTime * 1000).toISOString();
  const startTimeString = new Date().toISOString();
  const resolutionSource = "https://coingecko.com/en/coins/solana";
  
  // Derive the market authority PDA
  const [marketAuthority, marketAuthorityBump] = await PublicKey.findProgramAddress(
    [Buffer.from("market_authority"), Buffer.from(marketId)],
    program.programId
  );
  console.log("Market authority:", marketAuthority.toString());
  
  // Create the market
  console.log("Creating the market...");
  await program.methods
    .createMarket(
      marketId,
      options,
      new anchor.BN(endTime),
      bannerUrl,
      description,
      title,
      endTimeString,
      startTimeString,
      resolutionSource
    )
    .accounts({
      state: stateAccount.publicKey,
      market: marketAccount.publicKey,
      admin: provider.wallet.publicKey,
      //@ts-ignore
      marketAuthority: marketAuthority,
      systemProgram: SystemProgram.programId,
    })
    .signers([marketAccount])
    .rpc();
  
  console.log("Market created successfully!");
  
  // Save the market account to a file for future use
  const marketAccountPath = path.join(__dirname, "market-account.json");
  
  fs.writeFileSync(marketAccountPath, JSON.stringify(Array.from(marketAccount.secretKey)));
  
  console.log("Market account saved to:", marketAccountPath);

  // Fetch and display the market details
  const market = await program.account.market.fetch(marketAccount.publicKey);
  console.log("Market details:", market);
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error(err);
    process.exit(1);
  }
);
