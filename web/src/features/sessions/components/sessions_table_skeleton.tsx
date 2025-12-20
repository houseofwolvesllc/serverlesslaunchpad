import { Skeleton, Table } from '@mantine/core';

export function SessionsTableSkeleton() {
    return (
        <Table>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th style={{ width: 40 }}>
                        <Skeleton height={20} width={20} />
                    </Table.Th>
                    <Table.Th>Device</Table.Th>
                    <Table.Th>IP Address</Table.Th>
                    <Table.Th>Last Access</Table.Th>
                    <Table.Th>Created</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Table.Tr key={i}>
                        <Table.Td>
                            <Skeleton height={20} width={20} />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="80%" />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="60%" />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="70%" />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="65%" />
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}
