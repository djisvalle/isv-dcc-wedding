import { Card, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "../../components/ui/table";
import { toast } from "sonner"

import { useState } from "react";
import { useGetAllInvites, useCreateInvite, useUpdateInvite } from "../../hooks/useInvite";

import InviteModal from "./InviteModal";

import type { Invite } from "../../types/Invite";
import type { KeyValuePair } from "../../types/KeyValuePair";

export default function Invite() {

    const { data } = useGetAllInvites();
    const [modalOpen, setModalOpen] = useState(false);
    const [editingInvite, setEditingInvite] = useState<Invite | null>(null);

    const createInvite = useCreateInvite();
    const updateInvite = useUpdateInvite();

    const handleUpsertInvite = async (inviteData: Omit<Invite, "inviteId" | "guests">, guests: KeyValuePair[]) => {
        if (editingInvite) {
            const newGuests = guests
                .filter(guest => guest.key.includes("new"))
                .map(guest => ({ fullName: guest.value }));

            const existingGuests = guests
                .filter(guest => !guest.key.includes("new"))
                .map(guest => guest.key);

            await updateInvite.mutateAsync({
                inviteId: editingInvite.inviteId,
                inviteName: inviteData.inviteName,
                guests: newGuests,
                guestIds: existingGuests
            })
            setEditingInvite(null);
        }
        else {
            const newGuests = guests
                .filter(guest => guest.key.includes("new"))
                .map(guest => ({ fullName: guest.value }));

            const existingGuests = guests
                .filter(guest => !guest.key.includes("new"))
                .map(guest => guest.key);

            createInvite.mutateAsync({
                inviteName: inviteData.inviteName,
                guests: newGuests,
                guestIds: existingGuests
            });
        }
    }

    const handleEdit = (invite: Invite) => {
        setEditingInvite(invite);
        setModalOpen(true);
    }

    const handleModalOpenChange = (open: boolean) => {
        setModalOpen(open);
        if (!open) {
            setEditingInvite(null);
        }
    }

    const handleCopyRsvpLink = (inviteId: string) => {
        navigator.clipboard.writeText(window.location.origin + "?invite=" + inviteId);
        toast("RSVP link copied to clipboard");
    }

    return (
        <>
            <div className="min-h-screen bg-background p-6 pt-24">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-8 flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold text-foreground">Invite</h1>
                            <p className="text-muted-foreground mt-2">Add, update, remove invite</p>
                        </div>
                        <Button onClick={() => setModalOpen(true)}>Create Invite</Button>
                    </div>

                    <Card>
                        <CardContent>
                            {data.length === 0 ? (
                                <div>
                                    <p>No invites added yet</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invite Name</TableHead>
                                            <TableHead>Invite URL</TableHead>
                                            <TableHead className="w-[100px] justify-center">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {data.map((invite: Invite) => (
                                            <TableRow key={invite.inviteId}>
                                                <TableCell className="font-medium">{invite.inviteName}</TableCell>
                                                <TableCell><Button variant="ghost" onClick={() => handleCopyRsvpLink(invite.inviteId)}>Copy RSVP Link</Button></TableCell>
                                                <TableCell className="w-[100px] justify-center"><Button onClick={() => handleEdit(invite)}>Edit</Button></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <InviteModal
                open={modalOpen}
                onOpenChange={handleModalOpenChange}
                onSubmit={handleUpsertInvite}
                editingInvite={editingInvite}
            />
        </>
    )
}