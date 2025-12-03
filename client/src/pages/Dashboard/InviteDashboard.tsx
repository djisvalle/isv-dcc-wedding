import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { useInviteDashboard } from "@/hooks/useDashboard";
import type { InviteDashboard } from "@/types/Dashboard";

export function InviteDashboard() {

    const { data, status, error } = useInviteDashboard();

    if (status === 'pending') {
        return <p>Loading...</p>
    }

    if (status === 'error') {
        return <p>Error: {error.message}</p>
    }

    return (
        <Card className="mt-4">
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Invite Name</TableHead>
                            <TableHead>Invite URL</TableHead>
                            <TableHead className="w-[100px] text-center">Guests</TableHead>                        
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item: InviteDashboard) => (
                            <TableRow key={item.inviteId}>
                                <TableCell className="font-medium">{item.inviteName}</TableCell>                            
                                <TableCell>{item.inviteUrl}</TableCell>                                
                                <TableCell className="w-[100px]"><Button disabled={item.guestCount === 0 ? true : false}>View Guests</Button></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}