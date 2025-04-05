"use client";
import React from "react";

import up_higher from "../assets/up_higher.gif";
import decide_no from "../assets/decide_no.gif";
import make_decision from "../assets/make_decision.gif";

import { useEffect, useState, useCallback } from "react";
import { Card, Skeleton } from "@radix-ui/themes";
import { VoteBar } from "./VoteBar";
import solana from "../assets/solana-sol-logo.svg";
import { Input } from "./Input";
import { Button } from "./Button";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey, Transaction } from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { notify } from "../lib/notifications";
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { BN } from "@project-serum/anchor";
import { MarketData } from "../lib/types";

// Constants
const SOLCAST_PROGRAM_ID = new PublicKey(
  "7xMuyXtTipSYeTWb4esdnXyVrs63FeDp7RaEjRzvYUQS"
);

export default function PredictionInput({
  marketAccount,
  marketData,
  loading,
  error,
}: {
  marketAccount: PublicKey;
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

      const calculatedOdds = {
        oddsA: totalA > 0 ? totalB / totalA : 0,
        oddsB: totalB > 0 ? totalA / totalB : 0,
      };

      setOdds(calculatedOdds);

      // Update potential winnings if amount is set
      if (amount) {
        calculatePotentialWinnings(calculatedOdds, Number(amount));
      }
    }
  }, [marketData, amount]);

  // Initialize Solcast program
  const getProgram = useCallback(async () => {
    if (!connection || !publicKey) return null;

    try {
      const provider = new anchor.AnchorProvider(
        connection,
        {
          publicKey: publicKey,
          signTransaction: async (tx) => tx,
          signAllTransactions: async (txs) => txs,
        },
        { commitment: "confirmed" }
      );

      anchor.setProvider(provider);
      const idl = await anchor.Program.fetchIdl(SOLCAST_PROGRAM_ID, provider);
      if (!idl) throw new Error("IDL not found for Solcast program");

      return new anchor.Program(idl, SOLCAST_PROGRAM_ID, provider);
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

      // Fetch market data
      const market = await program.account.market.fetch(marketAccount);
      setMarketData(market);

      // Calculate odds
      const totalA = market.totalOptionA.toNumber();
      const totalB = market.totalOptionB.toNumber();

      const calculatedOdds = {
        oddsA: totalA > 0 ? totalB / totalA : 0,
        oddsB: totalB > 0 ? totalA / totalB : 0,
      };

      setOdds(calculatedOdds);

      // Update potential winnings if amount is set
      if (amount) {
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

    setPotentialWinnings({
      yes: yesWinnings,
      no: noWinnings,
    });
  };

  // Buy shares in the market
  const buyShares = async () => {
    if (!publicKey || !connected || !marketData) {
      notify({ type: "error", message: "Please connect your wallet first" });
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

      // Convert amount to lamports (SOL * 10^9)
      const amountLamports = Math.floor(parseFloat(amount) * 1_000_000_000);

      // Determine which option the user is selecting
      const selectedOption =
        option === "YES" ? marketData.optionA : marketData.optionB;

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        marketData.buyToken,
        publicKey
      );

      const marketTokenAccount = await getAssociatedTokenAddress(
        marketData.buyToken,
        marketData.authority
      );

      // Get the appropriate option mint based on user selection
      const optionMint =
        option === "YES" ? marketData.tokenAMint : marketData.tokenBMint;

      // Get the user's option token account
      const userOptionTokenAccount = await getAssociatedTokenAddress(
        optionMint,
        publicKey
      );

      // Create the transaction
      const ix = await program.methods
        .buyShare(marketData.id, selectedOption, new BN(amountLamports))
        .accounts({
          market: marketAccount,
          user: publicKey,
          marketAuthority: marketData.authority,
          userTokenAccount,
          marketTokenAccount,
          userOptionTokenAccount,
          tokenAMint: marketData.tokenAMint,
          tokenBMint: marketData.tokenBMint,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      // Create and send transaction
      const transaction = new Transaction().add(ix);
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, "confirmed");

      notify({
        type: "success",
        message: `Successfully placed ${option} prediction of ${amount} SOL!`,
        txid: signature,
      });

      // Refresh market data
      fetchMarketData();

      // Reset amount
      setAmount("");
    } catch (error) {
      console.error("Failed to place prediction:", error);
      notify({ type: "error", message: "Failed to place prediction" });
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

    // Check if market is resolved
    if (!marketData.resolved) {
      notify({ type: "error", message: "Market is not resolved yet" });
      return;
    }

    try {
      setIsLoading(true);
      const program = await getProgram();
      if (!program) return;

      // Get token accounts
      const userTokenAccount = await getAssociatedTokenAddress(
        marketData.buyToken,
        publicKey
      );

      const marketTokenAccount = await getAssociatedTokenAddress(
        marketData.buyToken,
        marketData.authority
      );

      // Create the transaction
      const ix = await program.methods
        .withdraw(marketData.id)
        .accounts({
          market: marketAccount,
          user: publicKey,
          marketAuthority: marketData.authority,
          userTokenAccount,
          marketTokenAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .instruction();

      // Create and send transaction
      const transaction = new Transaction().add(ix);
      const { blockhash } = await connection.getRecentBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = publicKey;

      const signature = await sendTransaction(transaction, connection);

      await connection.confirmTransaction(signature, "confirmed");

      notify({
        type: "success",
        message: "Successfully withdrew winnings!",
        txid: signature,
      });

      // Refresh market data
      fetchMarketData();
    } catch (error) {
      console.error("Failed to withdraw:", error);
      notify({ type: "error", message: "Failed to withdraw winnings" });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch SOL price
  useEffect(() => {
    const fetchPrice = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd"
        );
        const data = await response.json();
        setTokenPrice(data.solana.usd);
      } catch (error) {
        console.error("Failed to fetch price:", error);
      }
    };

    fetchPrice();

    // Set up interval to refresh price
    const interval = setInterval(fetchPrice, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch market data on mount and periodically
  useEffect(() => {
    fetchMarketData();

    // Set up interval to refresh market data
    const interval = setInterval(fetchMarketData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [fetchMarketData]);

  // Update potential winnings when amount or odds change
  useEffect(() => {
    if (amount) {
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
    marketData.totalOptionA &&
    marketData.totalOptionB &&
    marketData.totalOptionA + marketData.totalOptionB > 0
      ? (marketData.totalOptionA /
          (marketData.totalOptionA + marketData.totalOptionB)) *
        100
      : 50;

  const noPercentage = 100 - yesPercentage;

  // Check if user has shares in the winning option and hasn't withdrawn yet
  const canWithdraw =
    marketData?.resolved &&
    marketData?.shares?.some(
      (share: any) =>
        share.user.equals(publicKey || PublicKey.default) &&
        ((marketData.outcome.optionA && share.option === marketData.optionA) ||
          (marketData.outcome.optionB &&
            share.option === marketData.optionB)) &&
        !share.hasWithdrawn
    );

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

      {isLoading && !marketData ? (
        <div className="w-full my-20">
          <Skeleton className="w-full h-12" />
          <Skeleton className="w-full h-8 mt-2" />
        </div>
      ) : (
        <div className="space-y-4 my-10 w-full">
          <VoteBar yesPercentage={yesPercentage} noPercentage={noPercentage} />

          {marketData && (
            <div className="flex justify-between text-white/70 text-sm px-1">
              <div>YES: {marketData.totalOptionA.toString()} shares</div>
              <div>NO: {marketData.totalOptionB.toString()} shares</div>
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
            Yes
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
            No
          </Button>
        </div>
      )}

      {/* Show resolved status if market is resolved */}
      {marketData && marketData.resolved && (
        <div className="w-full text-center mb-6">
          <div className="bg-indigo-600/30 rounded-lg p-3">
            <p className="text-white font-medium">
              Market Resolved:{" "}
              {marketData.outcome.optionA
                ? marketData.optionA
                : marketData.optionB}
            </p>
          </div>

          {canWithdraw && (
            <Button
              className="w-full h-12 mt-4 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-all duration-300"
              onClick={withdrawWinnings}
              disabled={isLoading}
            >
              {isLoading ? "Processing..." : "Withdraw Winnings"}
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
      {connected && !marketData?.resolved && (
        <div className="space-y-4 w-full mt-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/80">Amount</label>
            <div className="relative">
              <img
                src={solana.src}
                alt="SOL"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50"
              />
              <Input
                type="tel"
                inputMode="decimal"
                placeholder="Enter amount"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
                className="pl-10 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/50 focus:ring-2 focus:ring-purple-500"
              />
            </div>
            {/* Add USD equivalent display */}
            <div className="text-sm text-white/60">
              ≈ ${(Number(amount) * tokenPrice).toFixed(2)} USD
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
                        ? `${potentialWinnings.yes.toFixed(4)} SOL`
                        : `${potentialWinnings.no.toFixed(4)} SOL`}
                    </div>
                    <div className="text-sm text-white/60">
                      ≈ $
                      {option === "YES"
                        ? (potentialWinnings.yes * tokenPrice).toFixed(2)
                        : (potentialWinnings.no * tokenPrice).toFixed(2)}{" "}
                      USD
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
              <span className="text-white/60">End Date:</span>
              <p className="text-white">{marketData.endTimeString}</p>
            </div>
            <div>
              <span className="text-white/60">Resolution Source:</span>
              <p className="text-white">{marketData.resolutionSource}</p>
            </div>
          </div>

          {/* Display user's current position if they have shares */}
          {connected &&
            marketData &&
            marketData.shares &&
            Array.isArray(marketData.shares) &&
            marketData.shares.some(
              (share: any) =>
                share &&
                share.user &&
                typeof share.user === "object" &&
                share.user.toString() ===
                  (publicKey || PublicKey.default).toString()
            ) && (
              <div className="mt-4 p-3 bg-indigo-900/30 rounded-lg">
                <h4 className="text-sm font-medium text-white mb-2">
                  Your Position
                </h4>
                <div className="space-y-2">
                  {marketData.shares
                    .filter(
                      (share: any) =>
                        share &&
                        share.user &&
                        typeof share.user === "object" &&
                        share.user.toString() ===
                          (publicKey || PublicKey.default).toString()
                    )
                    .map((share: any, index: number) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span
                          className={
                            share.option === marketData.optionA
                              ? "text-green-500"
                              : "text-red-500"
                          }
                        >
                          {share.option === marketData.optionA ? "YES" : "NO"}:
                        </span>
                        <span className="text-white">
                          {(share.amount.toNumber() / 1_000_000_000).toFixed(4)}{" "}
                          SOL
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
        </div>
      )}
    </Card>
  );
}
