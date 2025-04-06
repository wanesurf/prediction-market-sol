// In src/app/page.tsx, update the Home component
//@ts-nocheck
"use client";
import React, { useState, useEffect } from "react";
import ConnectButton from "../components/ConnectButton";
import Image from "next/image";
import { Box, Card, Flex, Grid, Text, Tabs } from "@radix-ui/themes";
import SolcastLogo from "../assets/Solcast.svg";
import bg from "../assets/bg.webp";
import PredictionInput from "../components/PredictionInput";
import MarketInfo from "../components/MarketInfo";
import MarketSelector from "../components/MarketSelector";
import { PublicKey } from "@solana/web3.js";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AnchorProvider, Program, BN } from "@coral-xyz/anchor";
import { idl, MarketData } from "../lib/types";
import SharesTab from "../components/SharesTab";
import ActivitiesTab from "../components/ActivitiesTab";

export default function Home() {
  // We'll use the market address as the selectedMarketId now
  const [selectedMarketId, setSelectedMarketId] = useState<string>("");
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { connection } = useConnection();
  const wallet = useWallet();

  // Fetch market data when selectedMarketId changes
  useEffect(() => {
    const fetchMarketData = async () => {
      if (!connection || !selectedMarketId) return;

      try {
        setLoading(true);
        setError(null);

        console.log("Fetching market data from address:", selectedMarketId);

        // Configure the program ID
        const programId = new PublicKey(
          "7QDrqqkxpti8WN4amvMHmcmZtonYeAzYrmdXefvEx3xJ"
        );

        // Create a read-only provider that doesn't require signing
        const provider = new AnchorProvider(
          connection,
          {
            publicKey: wallet?.publicKey || PublicKey.default,
            signTransaction: () => Promise.reject(),
            signAllTransactions: () => Promise.reject(),
          },
          { commitment: "confirmed" }
        );

        // Create program instance with our manually defined IDL
        const program = new Program(idl, programId, provider);

        // Use the market address
        const marketAccountAddress = new PublicKey(selectedMarketId);

        console.log(
          "Fetching market account from address:",
          marketAccountAddress.toString()
        );

        // Fetch the market account data
        const marketAccount = await program.account.market.fetch(
          marketAccountAddress
        );
        console.log("Market account data fetched successfully");

        // Map outcome enum to a string
        let outcomeText = "Unresolved";
        if (marketAccount.resolved) {
          // Access the outcome as a property with index signature
          const outcome = marketAccount.outcome as {
            optionA?: boolean;
            optionB?: boolean;
          };
          if (outcome.optionA) {
            outcomeText = marketAccount.optionA as string;
          } else if (outcome.optionB) {
            outcomeText = marketAccount.optionB as string;
          }
        }

        // Convert the data to our frontend format
        const marketDataFormatted: MarketData = {
          id: marketAccount.id as string,
          title: marketAccount.title as string,
          description: marketAccount.description as string,
          optionA: marketAccount.optionA as string,
          optionB: marketAccount.optionB as string,
          endTime: (marketAccount.endTime as BN).toNumber(),
          totalValue: (marketAccount.totalValue as BN).toNumber() / 1e9, // Convert from lamports to SOL
          numBettors: (marketAccount.numBettors as BN).toNumber(),
          resolved: marketAccount.resolved as boolean,
          outcome: outcomeText,
          bannerUrl: marketAccount.bannerUrl as string,
          resolutionSource: marketAccount.resolutionSource as string,
          totalOptionA: marketAccount.totalOptionA
            ? (marketAccount.totalOptionA as BN).toNumber() / 1e9
            : 0, // Convert from lamports to SOL
          totalOptionB: marketAccount.totalOptionB
            ? (marketAccount.totalOptionB as BN).toNumber() / 1e9
            : 0, // Convert from lamports to SOL
          shares: marketAccount.shares || [], // Include the shares data
        };

        console.log("Market data formatted:", marketDataFormatted);
        setMarketData(marketDataFormatted);
      } catch (err: unknown) {
        console.error("Error fetching market data:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to load market data: ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();
  }, [connection, selectedMarketId, wallet]);

  return (
    <div className="relative grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family:var(--font-geist-sans)]">
      {/* Background Image */}
      <Image
        src={bg}
        alt="Background"
        fill
        className="object-cover z-[-1]"
        quality={100}
        priority
      />

      <Flex justify="between" width="100%" align="center">
        <Box>
          <Image
            src={SolcastLogo}
            alt="Solcast Logo"
            width={150}
            height={40}
            priority
          />
        </Box>
        <ConnectButton />
      </Flex>

      <Card size="3" style={{ width: "100%", maxWidth: "1200px" }}>
        {/* Market Selector */}
        <Box mb="4">
          <MarketSelector
            selectedMarketId={selectedMarketId}
            onMarketSelect={setSelectedMarketId}
          />
        </Box>

        <Grid columns="1" gap="4" width="100%">
          {/* Right Column */}
          <Card size="2">
            <Flex direction="column" gap="4">
              <PredictionInput
                marketAccount={
                  selectedMarketId ? new PublicKey(selectedMarketId) : undefined
                }
                marketData={marketData}
                loading={loading}
                error={error}
              />
            </Flex>
          </Card>
          <MarketInfo
            marketAddress={selectedMarketId}
            marketData={marketData}
            loading={loading}
            error={error}
          />
        </Grid>

        {/* Bottom Section */}
        <Box mt="4">
          <Tabs.Root defaultValue="shares">
            <Tabs.List>
              <Tabs.Trigger value="shares">Shares</Tabs.Trigger>
              <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
            </Tabs.List>
            <Box pt="3">
              <Tabs.Content value="shares">
                <SharesTab
                  marketData={marketData}
                  loading={loading}
                  error={error}
                />
              </Tabs.Content>
              <Tabs.Content value="activity">
                <ActivitiesTab
                  marketData={marketData}
                  loading={loading}
                  error={error}
                />
              </Tabs.Content>
            </Box>
          </Tabs.Root>
        </Box>
      </Card>
    </div>
  );
}
