// In src/components/MarketSelector.tsx, update the component

import React, { useState, useEffect } from "react";
import { Box, Card, Flex, Text, Select } from "@radix-ui/themes";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { idl } from "../lib/types";
import { notify } from "../lib/notifications";

interface MarketInfo {
  id: string;
  address: PublicKey;
  title?: string;
}

interface MarketSelectorProps {
  onMarketSelect: (marketId: string) => void;
  selectedMarketId: string;
}

export default function MarketSelector({
  onMarketSelect,
  selectedMarketId,
}: MarketSelectorProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [markets, setMarkets] = useState<MarketInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      try {
        setLoading(true);
        setError(null);

        // Configure the program ID
        const programId = new PublicKey(
          "7QDrqqkxpti8WN4amvMHmcmZtonYeAzYrmdXefvEx3xJ"
        );

        // Create a provider
        const provider = new AnchorProvider(
          connection,
          {
            publicKey: wallet?.publicKey || PublicKey.default,
            signTransaction: () => Promise.reject(),
            signAllTransactions: () => Promise.reject(),
          },
          { commitment: "confirmed" }
        );

        // Create program instance
        const program = new Program(idl, programId, provider);

        console.log("Finding state PDA...");

        // Find the state account PDA
        const [statePda] = PublicKey.findProgramAddressSync(
          [Buffer.from("state")],
          programId
        );

        console.log("State PDA:", statePda.toString());

        try {
          // First attempt: Try using get_all_markets function
          console.log("Calling get_all_markets function...");

          // Create the accounts needed for the get_all_markets call
          const accounts = {
            state: statePda,
          };

          // Call the function
          const marketInfos = await program.methods
            .get_all_markets()
            .accounts(accounts)
            .view();

          console.log("Market infos returned:", marketInfos);

          if (marketInfos && marketInfos.length > 0) {
            // Fetch additional details for each market
            const marketsWithDetails = await Promise.all(
              marketInfos.map(async (info: any) => {
                try {
                  const marketAccount = await program.account.market.fetch(
                    info.address
                  );
                  return {
                    ...info,
                    title: marketAccount.title || info.id,
                  };
                } catch (err) {
                  console.error(
                    `Error fetching market details for ${info.id}:`,
                    err
                  );
                  return info;
                }
              })
            );

            setMarkets(marketsWithDetails);

            // If we have markets and don't have a selected market, select the first one
            if (marketsWithDetails.length > 0 && !selectedMarketId) {
              onMarketSelect(marketsWithDetails[0].address.toString());
            }

            setLoading(false);
            return;
          }
        } catch (functionErr) {
          console.error("Error calling getAllMarkets function:", functionErr);

          // Second attempt: Try direct approach with state account
          try {
            console.log("Trying alternative approach using state account...");

            // Fetch the state account directly
            const stateAccount = await program.account.state.fetch(statePda);

            if (stateAccount) {
              console.log("State account fetched successfully");

              // Extract market IDs and addresses
              const marketIds = stateAccount.marketIds as string[];
              const addresses = stateAccount.marketAddresses as PublicKey[];

              console.log("Market IDs:", marketIds);
              console.log("Market addresses:", addresses);

              if (
                marketIds &&
                marketIds.length > 0 &&
                addresses &&
                addresses.length > 0
              ) {
                // Create market info objects
                const marketInfos = marketIds
                  .map((id, index) => {
                    if (index < addresses.length) {
                      return {
                        id,
                        address: addresses[index],
                      };
                    }
                    return null;
                  })
                  .filter(Boolean) as MarketInfo[];

                // Fetch additional details for each market
                const marketsWithDetails = await Promise.all(
                  marketInfos.map(async (info) => {
                    try {
                      const marketAccount = await program.account.market.fetch(
                        info.address
                      );
                      return {
                        ...info,
                        title: marketAccount.title || info.id,
                      };
                    } catch (err) {
                      console.error(
                        `Error fetching market details for ${info.id}:`,
                        err
                      );
                      return info;
                    }
                  })
                );
                //@ts-ignore

                setMarkets(marketsWithDetails);

                // If we have markets and don't have a selected market, select the first one
                if (marketsWithDetails.length > 0 && !selectedMarketId) {
                  onMarketSelect(marketsWithDetails[0].address.toString());
                }

                setLoading(false);
                return;
              }
            }
          } catch (stateErr) {
            console.error(
              "Error fetching markets via state account:",
              stateErr
            );
          }
        }

        // Third attempt: Fall back to getProgramAccounts
        try {
          console.log("Falling back to getProgramAccounts...");

          // Use getProgramAccounts to fetch all accounts owned by our program
          const programAccounts = await connection.getProgramAccounts(
            programId,
            {
              commitment: "confirmed",
            }
          );

          console.log(`Found ${programAccounts.length} program accounts`);

          // For each account, try to decode it as a Market
          const marketAccounts = [];
          for (const account of programAccounts) {
            try {
              // Try to decode this account as a Market
              const marketAccount = await program.account.market.fetch(
                account.pubkey
              );

              // If it didn't throw an error, it's a market account
              console.log(
                `Found market: ${
                  marketAccount.id
                } at ${account.pubkey.toString()}`
              );

              marketAccounts.push({
                id: marketAccount.id as string,
                title: marketAccount.title as string,
                address: account.pubkey,
              });
            } catch (err) {
              // This account is not a Market, that's okay
            }
          }

          console.log(`Found ${marketAccounts.length} market accounts`);

          if (marketAccounts.length > 0) {
            setMarkets(marketAccounts);

            // If we have markets and don't have a selected market, select the first one
            if (!selectedMarketId) {
              onMarketSelect(marketAccounts[0].address.toString());
            }

            setLoading(false);
            return;
          }
        } catch (programAccountsErr) {
          console.error("Error using getProgramAccounts:", programAccountsErr);
        }

        // Fourth attempt: Use our known market address
        try {
          console.log("Falling back to known market address...");

          const knownMarketAddress = new PublicKey(
            "76czyTVwN2FaydgGbVWghKPGHgHvWxPyKiUW6ktC9XY8"
          );
          const marketAccount = await program.account.market.fetch(
            knownMarketAddress
          );

          const marketInfo = {
            id: marketAccount.id as string,
            title: marketAccount.title as string,
            address: knownMarketAddress,
          };

          setMarkets([marketInfo]);

          if (!selectedMarketId) {
            onMarketSelect(knownMarketAddress.toString());
          }

          setLoading(false);
          return;
        } catch (knownMarketErr) {
          console.error("Error fetching known market:", knownMarketErr);
          throw new Error(
            "Failed to fetch markets through all available methods"
          );
        }
      } catch (err: unknown) {
        console.error("Error fetching markets:", err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`Failed to fetch markets: ${errorMessage}`);
        notify({ type: "error", message: "Failed to fetch markets" });
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [connection, wallet, onMarketSelect, selectedMarketId]);

  if (loading) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
          <Text size={{ initial: "1", sm: "2" }}>Loading markets...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
          <Text size={{ initial: "1", sm: "2" }} color="red">
            {error}
          </Text>
        </Flex>
      </Card>
    );
  }

  if (markets.length === 0) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
          <Text size={{ initial: "1", sm: "2" }}>No markets available</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3" p={{ initial: "3", sm: "4" }}>
        <Text size={{ initial: "2", sm: "3" }} weight="bold">
          Select Market
        </Text>
        <Select.Root
          value={selectedMarketId}
          onValueChange={onMarketSelect}
          defaultValue={markets[0]?.address.toString()}
        >
          <Select.Trigger
            placeholder="Select a market to bet on"
            style={{ width: "100%" }}
          />
          <Select.Content>
            {markets.map((market) => (
              <Select.Item
                key={market.address.toString()}
                value={market.address.toString()}
              >
                {market.title || market.id}
              </Select.Item>
            ))}
          </Select.Content>
        </Select.Root>
      </Flex>
    </Card>
  );
}
