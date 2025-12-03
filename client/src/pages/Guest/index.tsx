import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";

import { useGuest } from "../../hooks/useGuest";
import { useState } from "react";

import GuestModal from "./GuestModal";

import type { Guest, GuestDto } from "../../types/Guest";

export default function Guest() {

    const { data, isPending, isError, error } = useGuest();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

    // const handleAddGuest = (guestData: GuestDto, guestId) => {
    //     if (editingGuest) {
    //         setEditingGuest(null);
    //     }
    //     else {
    //         const newGuest: GuestDto = {
    //             ...guestData
    //         }
    //     }
    // }

    // const handleEdit = (guest: Guest) => {
    //     setEditingGuest(guest);
    //     setModalOpen(true);
    // };

    // const handleModalOpenChange = (open : boolean) => {
    //     setModalOpen(open);
    //     if (!open) {
    //         setEditingGuest(null);
    //     }
    // }

    if (isPending) {
        return <p>Loading...</p>
    }

    if (isError) {
        return <p>Error: {error.message}</p>
    }

    return (
        <>
            <div className="min-h-screen bg-background p-6 pt-24">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Guest</h1>
                            <p className="text-muted-foreground mt-2">Add, update, remove guests</p>
                        </div>
                        <Button onClick={() => setModalOpen(true)}>Create Guest</Button>

                    </div>

                    <Card>
                        <CardContent>
                            {data.length === 0 ? (
                                <div>
                                    <p>No guests added yet</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Guest Name</TableHead>
                                            <TableHead className="w-[100px] text-center">Actions</TableHead>
                                        </TableRow>

                                    </TableHeader>
                                    <TableBody>
                                        {data.map((guest: Guest) => (
                                            <TableRow key={guest.guestId}>
                                                <TableCell className="font-medium">{guest.fullName}</TableCell>
                                                {/* <TableCell className="w-[100px] flex justify-center"><Button onClick={() => handleEdit(guest)}>Edit</Button></TableCell> */}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <GuestModal 
                open={modalOpen} 
            />
        </>
    )
}