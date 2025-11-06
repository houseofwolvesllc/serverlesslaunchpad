import { Skeleton } from '@/components/ui/skeleton';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

export function SessionsTableSkeleton() {
    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Skeleton className="h-5 w-5" />
                        </TableHead>
                        <TableHead>Device</TableHead>
                        <TableHead>IP Address</TableHead>
                        <TableHead>Last Access</TableHead>
                        <TableHead>Created</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {[1, 2, 3, 4, 5].map((i) => (
                        <TableRow key={i}>
                            <TableCell>
                                <Skeleton className="h-5 w-5" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-[80%]" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-[60%]" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-[70%]" />
                            </TableCell>
                            <TableCell>
                                <Skeleton className="h-5 w-[65%]" />
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
