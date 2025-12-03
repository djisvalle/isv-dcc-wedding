import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";

import { useGuestDashboard } from "@/hooks/useDashboard";
import type { GuestDashboard } from "@/types/Dashboard";

export function GuestDashboard() {

    const { data, status, error } = useGuestDashboard();

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
                            <TableHead>Guest Name</TableHead>
                            <TableHead>Invite Name</TableHead>
                            <TableHead>Invite URL</TableHead>
                            <TableHead>RSVP</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {data.map((item: GuestDashboard) => (
                            <TableRow key={item.guestId}>
                                <TableCell className="font-medium">{item.fullName}</TableCell>
                                <TableCell>{item.inviteName}</TableCell>
                                <TableCell>{item.inviteUrl}</TableCell>
                                <TableCell>{item.isAttending}</TableCell>
                            </TableRow>
                        ))}

                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}