// scripts/create-market.ts
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
  clusterApiUrl,
  SendTransactionError,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import bs58 from 'bs58';
import { BN } from "@project-serum/anchor";
import { AnchorProvider, Program, Idl } from "@project-serum/anchor";
import { Buffer } from "buffer";
import { Solcast } from "./target/types/solcast";

// Initialize connection
const connection = new Connection(
  process.env.SOLANA_RPC_URL || clusterApiUrl("devnet"),
  "confirmed"
);

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  
  if (args.length < 6) {
    console.log("Usage: ts-node create-market.ts <marketId> <optionA> <optionB> <endTime> <title> <description>");
    console.log("Example: ts-node create-market.ts btc-100k-2025 'Yes' 'No' '2025-12-31' 'Will BTC Exceed $100K in 2025?' 'Market resolves to YES if...'");
    process.exit(1);
  }
  
  const [marketId, optionA, optionB, endTime, title, description] = args;
  
  try {
    // Use the provided private key directly
    const privateKeyBase58 = "2q2c1gTEXwc3x1q7iH4AiFpwhRPM1jD7iKybug4gC8NXXFAPZMb7YgVDe1sC9G4y8EVkG2bhVEUCfXr9Dyw6Fmd2";
    const privateKeyBytes = bs58.decode(privateKeyBase58);
    const adminKeypair = Keypair.fromSecretKey(privateKeyBytes);
    
    console.log('Admin public key:', adminKeypair.publicKey.toString());
    
    // Get program ID
    const programId = new PublicKey(process.env.PROGRAM_ID || "7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS");
    console.log('Using program ID:', programId.toString());

    // Get buy token
    const buyToken = new PublicKey(process.env.USDC || "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
    console.log('Using buy token:', buyToken.toString());
    
    // Convert endTime to Unix timestamp
    let endTimeTimestamp = parseInt(endTime);
    if (isNaN(endTimeTimestamp)) {
      // If endTime is a date string, parse it
      const [year, month, day] = endTime.split('-').map(Number);
      if (isNaN(year) || isNaN(month) || isNaN(day)) {
        throw new Error("Invalid end time format. Please use either a Unix timestamp or a valid date string (e.g., '2025-12-31')");
      }
      // Create date at end of day (23:59:59)
      const endDate = new Date(year, month - 1, day, 23, 59, 59);
      endTimeTimestamp = Math.floor(endDate.getTime() / 1000);
    }
    
    // Format time strings
    const endTimeDate = new Date(endTimeTimestamp * 1000);
    const endTimeString = endTimeDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    const startTimeString = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    
    console.log("Creating market with the following details:");
    console.log(`  ID: ${marketId}`);
    console.log(`  Options: ${optionA} vs ${optionB}`);
    console.log(`  End Time: ${endTimeString} (${endTimeTimestamp})`);
    console.log(`  Title: ${title}`);
    console.log(`  Description: ${description}`);
    
    // Generate PDAs
    const [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      programId
    );
    
    const [marketPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market"), Buffer.from(marketId)],
      programId
    );
    
    const [marketAuthorityPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_authority"), Buffer.from(marketId)],
      programId
    );
    
    // Generate token mints
    const tokenAMint = Keypair.generate();
    const tokenBMint = Keypair.generate();
    
    // Get latest blockhash
    const { blockhash: recentBlockhash } = await connection.getLatestBlockhash();
    
    // Create Anchor provider
    const provider = new AnchorProvider(
      connection,
      {
        publicKey: adminKeypair.publicKey,
        signTransaction: async (tx) => {
          tx.partialSign(adminKeypair);
          return tx;
        },
        signAllTransactions: async (txs) => {
          txs.forEach(tx => tx.partialSign(adminKeypair));
          return txs;
        }
      },
      { commitment: "confirmed" }
    );
    
    // Load IDL and create program
    const idl = await Program.fetchIdl(programId, provider);
    if (!idl) throw new Error("Failed to fetch IDL");
    
    const program = new Program<>(idl, programId, provider);
    
    // Create market using Anchor program interface
    const tx = await program.methods
      .createMarket(
        marketId,
        [optionA, optionB],
        new BN(endTimeTimestamp),
        buyToken,
        "https://solcast.io/banner.jpg",
        description,
        title,
        endTimeString,
        startTimeString,
        "https://solcast.io/resolutions"
      )
      .accounts({
        state: statePda,
        market: marketPda,
        admin: adminKeypair.publicKey,
        marketAuthority: marketAuthorityPda,
        tokenAMint: tokenAMint.publicKey,
        tokenBMint: tokenBMint.publicKey,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: new PublicKey("SysvarRent111111111111111111111111111111111")
      })
      .signers([adminKeypair, tokenAMint, tokenBMint])
      .rpc();
    
    console.log("Transaction sent:", tx);
    
    // Save market info
    const marketInfo = {
      id: marketId,
      address: marketPda.toString(),
      title,
      description,
      optionA,
      optionB,
      endTime: endTimeTimestamp,
      endTimeString,
      txId: tx
    };
    
    const marketsDir = path.join(process.cwd(), 'markets');
    if (!fs.existsSync(marketsDir)) {
      fs.mkdirSync(marketsDir, { recursive: true });
    }
    
    fs.writeFileSync(
      path.join(marketsDir, `${marketId}.json`),
      JSON.stringify(marketInfo, null, 2)
    );
    
    console.log(`Market information saved to markets/${marketId}.json`);
    
  } catch (error) {
    if (error instanceof SendTransactionError) {
      console.error("Transaction Error:", error.message);
      console.error("\nFull transaction logs:");
      console.error(await error.getLogs(connection));
    } else {
      console.error("Error:", error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

main();

