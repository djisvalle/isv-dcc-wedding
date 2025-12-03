import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../components/ui/table";

export default function Invite() {

    return (
        <div className="min-h-screen bg-background p-6 pt-24">
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-foreground">Invite</h1>
                        <p className="text-muted-foreground mt-2">Add, update, remove invite</p>
                    </div>
                    <Button>Create Invite</Button>
                </div>
                
                <Card>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableHead>Invite Name</TableHead>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell className="font-medium">Doe Family</TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}