import { Skeleton, Table } from '@mantine/core';

export function ApiKeysTableSkeleton() {
    return (
        <Table>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th style={{ width: 40 }}>
                        <Skeleton height={20} width={20} />
                    </Table.Th>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Key Prefix</Table.Th>
                    <Table.Th>Last Used</Table.Th>
                    <Table.Th>Expires</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {[1, 2, 3, 4, 5].map((i) => (
                    <Table.Tr key={i}>
                        <Table.Td>
                            <Skeleton height={20} width={20} />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="70%" />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="60%" />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="65%" />
                        </Table.Td>
                        <Table.Td>
                            <Skeleton height={20} width="55%" />
                        </Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}
