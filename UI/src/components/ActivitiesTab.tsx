import React from "react";
import { Box, Card, Flex, Text, Table } from "@radix-ui/themes";
import { MarketData, Share } from "../lib/types";
import { PublicKey } from "@solana/web3.js";

interface ActivitiesTabProps {
  marketData: MarketData | null;
  loading: boolean;
  error: string | null;
}

export default function ActivitiesTab({
  marketData,
  loading,
  error,
}: ActivitiesTabProps) {
  if (loading) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>Loading activities...</Text>
        </Flex>
      </Card>
    );
  }

  if (error) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text color="red">{error}</Text>
        </Flex>
      </Card>
    );
  }

  if (!marketData) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>No market selected</Text>
        </Flex>
      </Card>
    );
  }

  // Create a timeline of activities based on market data
  const activities = [
    {
      type: "Market Created",
      timestamp: new Date(marketData.endTime * 1000).toLocaleDateString(),
      description: `Market "${marketData.title}" was created`,
    },
    {
      type: "Market Status",
      timestamp: new Date().toLocaleDateString(),
      description: marketData.resolved
        ? `Market resolved with outcome: ${marketData.outcome}`
        : "Market is active",
    },
    ...(marketData.shares || []).map((share: Share) => ({
      type: "Share Purchase",
      timestamp: new Date().toLocaleDateString(), // In a real app, this would come from transaction data
      description: `${new PublicKey(share.user)
        .toString()
        .slice(0, 4)}... purchased ${(share.amount / 1e9).toFixed(2)} SOL of ${
        share.option
      }`,
    })),
  ];

  return (
    <Card size="2">
      <Flex direction="column" gap="3" p="4">
        <Text weight="bold" size="3">
          Activities
        </Text>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Date</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Description</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {activities.map((activity, index) => (
              <Table.Row key={index}>
                <Table.Cell>
                  <Text size="2">{activity.type}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{activity.timestamp}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{activity.description}</Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Card>
  );
}
