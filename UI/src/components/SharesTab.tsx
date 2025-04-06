import React from "react";
import { Box, Card, Flex, Text, Table } from "@radix-ui/themes";
import { MarketData, Share } from "../lib/types";
import { PublicKey } from "@solana/web3.js";

interface SharesTabProps {
  marketData: MarketData | null;
  loading: boolean;
  error: string | null;
}

export default function SharesTab({
  marketData,
  loading,
  error,
}: SharesTabProps) {
  if (loading) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>Loading shares information...</Text>
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

  if (!marketData || !marketData.shares || marketData.shares.length === 0) {
    return (
      <Card size="2">
        <Flex direction="column" gap="3" p="4">
          <Text>No shares found for this market</Text>
        </Flex>
      </Card>
    );
  }

  return (
    <Card size="2">
      <Flex direction="column" gap="3" p="4">
        <Text weight="bold" size="3">
          Shares
        </Text>
        <Table.Root>
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>User</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Option</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Amount (SOL)</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Status</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {marketData.shares.map((share: Share, index) => (
              <Table.Row key={index}>
                <Table.Cell>
                  <Text size="2">
                    {new PublicKey(share.user).toString().slice(0, 4)}...
                    {new PublicKey(share.user).toString().slice(-4)}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{share.option}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{(share.amount / 1e9).toFixed(2)}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2" color={share.has_withdrawn ? "gray" : "green"}>
                    {share.has_withdrawn ? "Withdrawn" : "Active"}
                  </Text>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Flex>
    </Card>
  );
}
