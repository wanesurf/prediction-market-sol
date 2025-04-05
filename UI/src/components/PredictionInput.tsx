//@ts-nocheck
// "use client";
import React from "react";

import up_higher from "../assets/up_higher.gif";
import decide_no from "../assets/decide_no.gif";
import make_decision from "../assets/make_decision.gif";
import usdc from "../assets/usdc.svg";

import { useEffect, useState, useCallback } from "react";
import { Card, Skeleton } from "@radix-ui/themes";
import { VoteBar } from "./VoteBar";
import { Input } from "./Input";
import { Button } from "./Button";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import { AnchorProvider, Program, BN, web3 } from "@coral-xyz/anchor";
import { notify } from "../lib/notifications";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { MarketData, idl } from "../lib/types";

// Constants
const SOLCAST_PROGRAM_ID = new PublicKey(
  "7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS"
);

// Devnet USDC address
const DEVNET_USDC = new PublicKey(
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"
);

export default function PredictionInput({
  marketAccount,
  marketData,
  loading,
  error,
}: {
  marketAccount?: PublicKey;
  marketData?: MarketData | null;
  loading?: boolean;
  error?: string | null;
}) {
  const [tokenPrice, setTokenPrice] = useState(0);
  const [currentGif, setCurrentGif] = useState(make_decision);
  const [amount, setAmount] = useState("");
  const [showEstimatedWinnings, setShowEstimatedWinnings] = useState(false);
  const [option, setOption] = useState<"YES" | "NO">("YES");
  const [isLoading, setIsLoading] = useState(false);
  const [odds, setOdds] = useState<{ oddsA: number; oddsB: number }>({
    oddsA: 0,
    oddsB: 0,
  });
  const [potentialWinnings, setPotentialWinnings] = useState<{
    yes: number;
    no: number;
  }>({ yes: 0, no: 0 });

  const { publicKey, connected, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // Calculate odds when market data changes
  useEffect(() => {
    if (marketData) {
      const totalA = marketData.totalOptionA || 0;
      const totalB = marketData.totalOptionB || 0;

      console.log("Calculating odds with totalA:", totalA, "totalB:", totalB);

      const calculatedOdds = {
        oddsA: totalB > 0 && totalA > 0 ? totalB / totalA : 0,
        oddsB: totalA > 0 && totalB > 0 ? totalA / totalB : 0,
      };

      console.log("Calculated odds:", calculatedOdds);
      setOdds(calculatedOdds);

      // Update potential winnings if amount is set
      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
        calculatePotentialWinnings(calculatedOdds, Number(amount));
      }
    }
  }, [marketData, amount]);

  // Initialize Solcast program
  const getProgram = useCallback(async () => {
    if (!connection || !publicKey) return null;

    try {
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: publicKey,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: "confirmed" }
      );

      // Create program instance using the imported IDL
      return new Program(idl, SOLCAST_PROGRAM_ID, provider);
    } catch (error) {
      console.error("Failed to initialize Solcast program:", error);
      notify({
        type: "error",
        message: "Failed to connect to Solcast program",
      });
      return null;
    }
  }, [connection, publicKey]);

  // Fetch market data
  const fetchMarketData = useCallback(async () => {
    if (!connection || !marketAccount) return;

    try {
      setIsLoading(true);
      const program = await getProgram();
      if (!program) return;

      console.log("Fetching market data for:", marketAccount.toString());

      // Fetch market data
      const market = await program.account.market.fetch(marketAccount);
      console.log("Fetched market data:", market);

      // Extract relevant data for odds calculation
      const totalA = market.totalOptionA
        ? (market.totalOptionA as any).toNumber()
        : 0;
      const totalB = market.totalOptionB
        ? (market.totalOptionB as any).toNumber()
        : 0;

      console.log("Total for option A:", totalA);
      console.log("Total for option B:", totalB);

      const calculatedOdds = {
        oddsA: totalB > 0 && totalA > 0 ? totalB / totalA : 0,
        oddsB: totalA > 0 && totalB > 0 ? totalA / totalB : 0,
      };

      console.log("Calculated odds:", calculatedOdds);
      setOdds(calculatedOdds);

      // Update potential winnings if amount is set
      if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
        calculatePotentialWinnings(calculatedOdds, Number(amount));
      }
    } catch (error) {
      console.error("Failed to fetch market data:", error);
      notify({ type: "error", message: "Failed to fetch market data" });
    } finally {
      setIsLoading(false);
    }
  }, [connection, marketAccount, amount, getProgram]);

  // Calculate potential winnings
  const calculatePotentialWinnings = (
    currentOdds: { oddsA: number; oddsB: number },
    amountValue: number
  ) => {
    if (isNaN(amountValue) || amountValue <= 0) {
      setPotentialWinnings({ yes: 0, no: 0 });
      return;
    }

    // Apply 5% commission rate
    const COMMISSION_RATE = 0.05;

    // Calculate potential winnings for YES
    const yesWinnings =
      amountValue + amountValue * currentOdds.oddsA * (1 - COMMISSION_RATE);

    // Calculate potential winnings for NO
    const noWinnings =
      amountValue + amountValue * currentOdds.oddsB * (1 - COMMISSION_RATE);

    console.log("Potential winnings calculated:", {
      yes: yesWinnings,
      no: noWinnings,
    });
    setPotentialWinnings({
      yes: yesWinnings,
      no: noWinnings,
    });
  };

  // Updated buyShares function that explicitly names accounts according to the IDL

  // Final fixed version of buyShares function using the correct account structure

  // Try this modified version of the buyShares function
  const buyShares = async () => {
    if (!publicKey || !connected || !marketData) {
      notify({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (!marketAccount) {
      notify({ type: "error", message: "No market selected" });
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      notify({ type: "error", message: "Please enter a valid amount" });
      return;
    }

    try {
      setIsLoading(true);
      const program = await getProgram();
      if (!program) return;

      console.log("Buying shares in market:", marketAccount.toString());
      console.log("Option:", option);
      console.log("Amount:", amount);

      // Convert amount to USDC units (6 decimals)
      const amountInUsdc = Math.floor(parseFloat(amount) * 1_000_000);

      // Import required libraries
      const {
        createAssociatedTokenAccountInstruction,
        getAssociatedTokenAddress,
        TOKEN_PROGRAM_ID,
      } = await import("@solana/spl-token");

      const { TransactionInstruction, SystemProgram } = await import(
        "@solana/web3.js"
      );

      // Fetch the full market account data
      const marketAccountData = await program.account.market.fetch(
        marketAccount
      );
      console.log("Fetched market data:", marketAccountData);

      // Determine which option the user is selecting
      const selectedOption =
        option === "YES" ? marketData.optionA : marketData.optionB;
      console.log("Selected option:", selectedOption);

      // Get market data
      const marketId = marketAccountData.id;
      // Use type assertions to handle the unknown types
      const tokenAMint = new PublicKey(
        (marketAccountData.tokenAMint as any).toString()
      );
      const tokenBMint = new PublicKey(
        (marketAccountData.tokenBMint as any).toString()
      );
      const marketAuthority = new PublicKey(
        (marketAccountData.authority as any).toString()
      );

      console.log("Market ID:", marketId);
      console.log("Market authority:", marketAuthority.toString());
      console.log("Token A mint:", tokenAMint.toString());
      console.log("Token B mint:", tokenBMint.toString());

      // Use USDC as payment token
      const buyToken = DEVNET_USDC;
      console.log("Buy token (USDC):", buyToken.toString());

      // Get associated token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        buyToken,
        publicKey
      );
      console.log("User token account:", userTokenAccount.toString());

      // Check if user has enough USDC
      try {
        const userTokenInfo = await connection.getTokenAccountBalance(
          userTokenAccount
        );
        console.log("User USDC balance:", userTokenInfo.value.uiAmount);

        if ((userTokenInfo.value.uiAmount || 0) < parseFloat(amount)) {
          notify({
            type: "error",
            message: `Not enough USDC. You have ${userTokenInfo.value.uiAmount} USDC but need ${amount} USDC.`,
          });
          setIsLoading(false);
          return;
        }
      } catch (err) {
        console.error("Error checking USDC balance:", err);
        notify({
          type: "error",
          message:
            "You don't have a USDC token account. Please get some Devnet USDC first.",
        });
        setIsLoading(false);
        return;
      }

      const marketTokenAccount = await getAssociatedTokenAddress(
        buyToken,
        marketAuthority,
        true // Allow off-curve
      );
      console.log("Market token account:", marketTokenAccount.toString());

      // Check if market token account exists
      const marketTokenInfo = await connection.getAccountInfo(
        marketTokenAccount
      );
      if (!marketTokenInfo) {
        console.log("Market token account doesn't exist. Creating it...");
        notify({
          type: "info",
          message:
            "Setting up market token account. This is a one-time operation.",
        });

        // Create the market token account
        try {
          // Create instruction to make the associated token account
          const createAccountIx = createAssociatedTokenAccountInstruction(
            publicKey, // payer
            marketTokenAccount, // associated token account address
            marketAuthority, // owner
            buyToken // mint
          );

          // Create a new transaction
          const transaction = new Transaction();
          transaction.add(createAccountIx);

          // Get a fresh blockhash
          const latestBlockhash = await connection.getLatestBlockhash();
          transaction.recentBlockhash = latestBlockhash.blockhash;
          transaction.lastValidBlockHeight =
            latestBlockhash.lastValidBlockHeight;
          transaction.feePayer = publicKey;

          // Send the transaction to the wallet for signing
          console.log("Sending transaction to create market token account...");
          const signature = await sendTransaction(transaction, connection);
          console.log("Transaction sent with signature:", signature);

          // Wait for confirmation
          await connection.confirmTransaction(
            {
              signature,
              blockhash: latestBlockhash.blockhash,
              lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
            },
            "confirmed"
          );

          console.log("Market token account created successfully!");
          notify({
            type: "success",
            message: "Market token account created successfully!",
            txid: signature,
          });
        } catch (err) {
          console.error("Error creating market token account:", err);
          notify({
            type: "error",
            message: `Failed to create market token account: ${
              err instanceof Error ? err.message : String(err)
            }`,
          });
          setIsLoading(false);
          return;
        }
      }

      // Get the option mint based on user selection
      const optionMint = option === "YES" ? tokenAMint : tokenBMint;

      // Get the user's option token account
      const userOptionTokenAccount = await getAssociatedTokenAddress(
        optionMint,
        publicKey
      );
      console.log(
        "User option token account:",
        userOptionTokenAccount.toString()
      );

      // Create a new transaction
      const transaction = new Transaction();

      // Check if the user's option token account exists and create if needed
      const optionAccountInfo = await connection.getAccountInfo(
        userOptionTokenAccount
      );
      if (!optionAccountInfo) {
        console.log("Creating option token account for user");

        // Create instruction to make the associated token account
        const createAccountIx = createAssociatedTokenAccountInstruction(
          publicKey, // payer
          userOptionTokenAccount, // associated token account address
          publicKey, // owner
          optionMint // mint
        );

        // Add instruction to transaction
        transaction.add(createAccountIx);
      } else {
        console.log("Option token account already exists");
      }

      // Create the instruction data
      console.log("Encoding instruction data...");
      try {
        // Log the program's IDL for debugging
        console.log(
          "Program IDL:",
          program.idl.instructions.find((i) => i.name === "buyShare")
        );

        // Encode the data
        const data = program.coder.instruction.encode("buy_share", {
          marketId,
          option: selectedOption,
          amount: new BN(amountInUsdc),
        });
        console.log("Instruction data encoded successfully");

        // Create the transaction instruction keys in the exact order expected by the program
        const keys = [
          { pubkey: marketAccount, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: true },
          { pubkey: marketAuthority, isSigner: false, isWritable: false },
          { pubkey: userTokenAccount, isSigner: false, isWritable: true },
          { pubkey: marketTokenAccount, isSigner: false, isWritable: true },
          { pubkey: userOptionTokenAccount, isSigner: false, isWritable: true },
          { pubkey: tokenAMint, isSigner: false, isWritable: true },
          { pubkey: tokenBMint, isSigner: false, isWritable: true },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ];

        // Create the instruction manually
        const buyShareIx = new TransactionInstruction({
          programId: SOLCAST_PROGRAM_ID,
          keys: keys as any,
          data,
        });

        // Add the buy share instruction to the transaction
        transaction.add(buyShareIx);
      } catch (err) {
        console.error("Error creating instruction:", err);
        notify({
          type: "error",
          message: `Error creating transaction: ${
            err instanceof Error ? err.message : String(err)
          }`,
        });
        setIsLoading(false);
        return;
      }

      // Get a fresh blockhash
      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      transaction.feePayer = publicKey;

      // Log the created transaction for debugging
      console.log(
        "Transaction created with instructions:",
        transaction.instructions.length
      );
      console.log("Transaction blockhash:", latestBlockhash.blockhash);

      // Simulate the transaction before sending
      console.log("Simulating transaction...");
      try {
        const simulation = await connection.simulateTransaction(transaction);
        console.log("Transaction simulation result:", simulation);

        if (simulation.value.err) {
          throw new Error(
            `Transaction simulation failed: ${JSON.stringify(
              simulation.value.err
            )}`
          );
        }
      } catch (err) {
        console.error("Transaction simulation error:", err);
        // Continue anyway, as some errors only appear during actual execution
      }

      // Send the transaction to the wallet for signing
      console.log("Sending transaction to wallet for signing...");
      try {
        const signature = await sendTransaction(transaction, connection, {
          skipPreflight: false,
          preflightCommitment: "confirmed",
          maxRetries: 5,
        });
        console.log("Transaction signed and sent with signature:", signature);

        // Notify user that transaction is processing
        notify({
          type: "info",
          message: "Transaction sent! Waiting for confirmation...",
          txid: signature,
        });

        // Wait for confirmation
        const confirmationStatus = await connection.confirmTransaction(
          {
            signature,
            blockhash: latestBlockhash.blockhash,
            lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
          },
          "confirmed"
        );

        console.log("Confirmation status:", confirmationStatus);

        if (confirmationStatus.value.err) {
          throw new Error(
            `Transaction confirmed with error: ${JSON.stringify(
              confirmationStatus.value.err
            )}`
          );
        }

        console.log("Transaction confirmed successfully!");

        notify({
          type: "success",
          message: `Successfully placed ${option} prediction of ${amount} USDC!`,
          txid: signature,
        });

        // Refresh market data
        fetchMarketData();

        // Reset amount
        setAmount("");
      } catch (err) {
        console.error("Error during transaction sending or confirmation:", err);
        let errorMessage = "Transaction failed";

        if (err instanceof Error) {
          errorMessage += `: ${err.message}`;

          // Check for common error patterns
          if (err.message.includes("not enough SOL")) {
            errorMessage = "Not enough SOL to pay for transaction fees";
          } else if (err.message.includes("insufficient funds")) {
            errorMessage = "Insufficient funds for this transaction";
          } else if (err.message.includes("user rejected")) {
            errorMessage = "Transaction was rejected by the wallet";
          }
        }

        notify({
          type: "error",
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("Failed to place prediction:", error);

      // More detailed error logging
      let errorMessage = "Failed to place prediction";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
        console.log("Full error object:", error);

        // Additional error information for debugging
        if ((error as any).logs) {
          console.log("Transaction logs:", (error as any).logs);
        }
      }

      notify({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  // Withdraw winnings
  const withdrawWinnings = async () => {
    if (!publicKey || !connected || !marketData) {
      notify({ type: "error", message: "Please connect your wallet first" });
      return;
    }

    if (!marketAccount) {
      notify({ type: "error", message: "No market selected" });
      return;
    }

    // Check if market is resolved
    if (!marketData.resolved) {
      notify({ type: "error", message: "Market is not resolved yet" });
      return;
    }

    try {
      setIsLoading(true);
      const program = await getProgram();
      if (!program) return;

      console.log(
        "Withdrawing winnings from market:",
        marketAccount.toString()
      );

      // Fetch the full market account data
      const marketAccountData = await program.account.market.fetch(
        marketAccount
      );

      // Get the market ID and authority directly from the account data
      const marketId = marketAccountData.id;
      const marketAuthority = new PublicKey(
        (marketAccountData.authority as any).toString()
      );
      console.log("Market ID:", marketId);
      console.log("Market authority:", marketAuthority.toString());

      // Use USDC as the payment token
      const buyToken = DEVNET_USDC;

      // Get associated token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        buyToken,
        publicKey
      );
      console.log("User token account:", userTokenAccount.toString());

      const marketTokenAccount = await getAssociatedTokenAddress(
        buyToken,
        marketAuthority,
        true // Allow off-curve
      );
      console.log("Market token account:", marketTokenAccount.toString());

      // Create the transaction
      console.log("Creating withdraw instruction...");
      const ix = await program.methods
        .withdraw(marketId)
        .accounts({
          market: marketAccount,
          user: publicKey,
          marketAuthority: marketAuthority,
          userTokenAccount: userTokenAccount,
          marketTokenAccount: marketTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      // Create and send transaction
      const transaction = new Transaction().add(ix);
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      console.log("Sending transaction...");
      const signature = await sendTransaction(transaction, connection);
      console.log("Transaction sent with signature:", signature);

      await connection.confirmTransaction(signature, "confirmed");
      console.log("Transaction confirmed!");

      notify({
        type: "success",
        message: "Successfully withdrew USDC winnings!",
        txid: signature,
      });

      // Refresh market data
      fetchMarketData();
    } catch (error) {
      console.error("Failed to withdraw:", error);
      let errorMessage = "Failed to withdraw winnings";
      if (error instanceof Error) {
        errorMessage += `: ${error.message}`;
      }
      notify({
        type: "error",
        message: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch USDC price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=usd-coin&vs_currencies=usd"
        );
        const data = await response.json();
        setTokenPrice(data["usd-coin"].usd || 1); // Default to 1 if API fails
      } catch (error) {
        console.error("Failed to fetch price:", error);
        setTokenPrice(1); // Default to 1 USD for USDC
      }
    };

    fetchPrice();
    // USDC is pegged to USD, so we don't need frequent updates
    const interval = setInterval(fetchPrice, 300000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Fetch market data on mount and periodically
  useEffect(() => {
    if (marketAccount) {
      fetchMarketData();

      // Set up interval to refresh market data
      const interval = setInterval(fetchMarketData, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [fetchMarketData, marketAccount]);

  // Update potential winnings when amount or odds change
  useEffect(() => {
    if (amount && !isNaN(Number(amount)) && Number(amount) > 0) {
      calculatePotentialWinnings(odds, Number(amount));
    }
  }, [amount, odds]);

  const handleAmountChange = (value: string) => {
    // Only allow numbers and at most one decimal point
    const sanitizedValue = value.replace(/[^\d.]/g, "");
    // Prevent multiple decimal points
    const parts = sanitizedValue.split(".");
    const cleanValue = parts[0] + (parts.length > 1 ? "." + parts[1] : "");
    // Remove leading zeros
    const finalValue = cleanValue.replace(/^0+(?=\d)/, "") || "0"; // Ensure "0" remains if the input is cleared
    setAmount(finalValue);
  };

  // Calculate yes/no percentages for display
  const yesPercentage =
    marketData &&
    typeof marketData.totalOptionA === "number" &&
    typeof marketData.totalOptionB === "number" &&
    marketData.totalOptionA + marketData.totalOptionB > 0
      ? (marketData.totalOptionA /
          (marketData.totalOptionA + marketData.totalOptionB)) *
        100
      : 50;

  const noPercentage = 100 - yesPercentage;

  // If no market is selected, show a message
  if (!marketAccount && !loading) {
    return (
      <Card className="shadow-2xl w-full h-full flex flex-col items-center justify-center p-8">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold text-white">Select a Market</h2>
          <p className="text-white/70 mt-2">
            Choose a market from the dropdown above to start placing predictions
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="shadow-2xl w-full h-full flex flex-col items-center justify-start">
      {marketData && (
        <div className="w-full text-center mb-4">
          <h2 className="text-xl font-bold text-white">{marketData.title}</h2>
        </div>
      )}

      <div className="flex justify-center w-full">
        <img
          src={currentGif.src}
          alt="Prediction Market"
          className="rounded-lg w-24 h-24 sm:w-32 sm:h-32"
        />
      </div>

      {(isLoading || loading) && !marketData ? (
        <div className="w-full my-20">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-8 mt-2" />
        </div>
      ) : (
        <div className="space-y-4 my-10 w-full">
          <VoteBar yesPercentage={yesPercentage} noPercentage={noPercentage} />

          {marketData && (
            <div className="flex justify-between text-white/70 text-sm px-1">
              <div>YES: {marketData.totalOptionA?.toFixed(2) || 0} USDC</div>
              <div>NO: {marketData.totalOptionB?.toFixed(2) || 0} USDC</div>
            </div>
          )}
        </div>
      )}

      {/* Only show option selection if market is not resolved */}
      {marketData && !marketData.resolved && (
        <div className="grid grid-cols-2 gap-4 w-full">
          <Button
            className={`h-12 text-sm font-semibold ${
              option === "YES"
                ? "bg-green-500 hover:bg-green-600 text-white"
                : "bg-green-500/20 hover:bg-green-600/30 text-white"
            }`}
            onClick={() => {
              setOption("YES");
              setCurrentGif(up_higher);
            }}
          >
            {marketData.optionA || "Yes"}
          </Button>
          <Button
            className={`h-12 text-sm font-semibold ${
              option === "NO"
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "bg-red-500/20 hover:bg-red-600/30 text-white"
            }`}
            onClick={() => {
              setOption("NO");
              setCurrentGif(decide_no);
            }}
          >
            {marketData.optionB || "No"}
          </Button>
        </div>
      )}

      {/* Show resolved status if market is resolved */}
      {marketData && marketData.resolved && (
        <div className="w-full text-center mb-6">
          <div className="bg-indigo-600/30 rounded-lg p-3">
            <p className="text-white font-medium">
              Market Resolved: {marketData.outcome}
            </p>
          </div>

          {/* Simplify check for withdrawal eligibility */}
          {connected && marketData.resolved && (
            <Button
              className="w-full h-12 mt-4 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-all duration-300"
              onClick={withdrawWinnings}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Withdraw USDC Winnings"}
            </Button>
          )}
        </div>
      )}

      {/* Show Connect Wallet button if wallet is not connected */}
      {!connected && (
        <div className="w-full mt-6">
          <WalletMultiButton className="w-full h-12 text-sm font-semibold bg-violet-600 hover:bg-violet-800 text-white transition-all duration-300 flex items-center justify-center" />
        </div>
      )}

      {/* Show amount input and place prediction button only if wallet is connected and market not resolved */}
      {connected && marketData && !marketData.resolved && (
        <div className="space-y-4 w-full mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">
              Amount (USDC)
            </label>
            <div className="relative">
              <img
                src={usdc.src}
                alt="USDC"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50"
              />
              <Input
                type="tel"
                inputMode="decimal"
                placeholder="Enter USDC amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {/* USDC is already in USD, so we don't need to convert */}
            <div className="text-sm text-white/60">
              Make sure you have USDC in your wallet
            </div>
          </div>

          {/* Add calculated potential winnings display */}
          {amount && Number(amount) > 0 && (
            <div className="mt-2 p-3 bg-white/5 rounded-lg">
              <button
                onClick={() => setShowEstimatedWinnings(!showEstimatedWinnings)}
                className="flex items-center justify-between w-full text-sm text-white/80 mb-2"
              >
                <span>Estimated Winnings</span>
                <span className="text-xs">
                  {showEstimatedWinnings ? "▼" : "▶"}
                </span>
              </button>

              {showEstimatedWinnings && (
                <div className="flex justify-between">
                  <div>
                    <div
                      className={`${
                        option === "YES" ? "text-green-500" : "text-red-500"
                      } font-semibold`}
                    >
                      {option}:{" "}
                      {option === "YES"
                        ? `${potentialWinnings.yes.toFixed(2)} USDC`
                        : `${potentialWinnings.no.toFixed(2)} USDC`}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Place prediction button */}
          <Button
            className="w-full h-12 text-sm font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-all duration-300"
            onClick={buyShares}
            disabled={isLoading || !amount || Number(amount) <= 0}
          >
            {isLoading ? "Processing..." : `Place ${option} Prediction`}
          </Button>
        </div>
      )}

      {/* Market info */}
      {marketData && (
        <div className="mt-6 w-full p-4 bg-white/5 rounded-lg">
          <p className="text-sm text-white/70 mb-4">{marketData.description}</p>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-white/60">End Time:</span>
              <p className="text-white">
                {new Date(marketData.endTime * 1000).toLocaleString()}
              </p>
            </div>
            <div>
              <span className="text-white/60">Resolution Source:</span>
              <p className="text-white">{marketData.resolutionSource}</p>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
