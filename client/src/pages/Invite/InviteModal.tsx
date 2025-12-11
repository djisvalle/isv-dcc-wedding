import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { AutocompleteField } from "@/components/ui/autocomplete-field";

import { useCallback, useEffect, useState } from "react";
import { useGetGuestDropdown } from "../../hooks/useGuest";

import type { Invite } from "../../types/Invite";
import type { KeyValuePair } from "@/types/KeyValuePair"

interface InviteModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void
    onSubmit: (invite: Omit<Invite, "inviteId" | "guests">, guests: KeyValuePair[]) => void
    editingInvite?: Invite | null
}


export default function InviteModal({ open, onOpenChange, onSubmit, editingInvite }: InviteModalProps) {
    const { data } = useGetGuestDropdown();

    // guestData = full suggestion pool (from server)
    const [guestData, setGuestData] = useState<KeyValuePair[]>([]);

    // selectedGuests = guests picked for this invite (separate state)
    const [selectedGuests, setSelectedGuests] = useState<KeyValuePair[]>([]);

    const [inviteName, setInviteName] = useState('');

    useEffect(() => {
        if (data) {
            setGuestData(data);
        }
    }, [data]);

    // If editing an existing invite, prefill selectedGuests (example)
    useEffect(() => {
        if (editingInvite) {
            setInviteName(editingInvite.inviteName);

            if (editingInvite.guests) {
                const existingGuests = editingInvite.guests.map(guest => ({ key: guest.guestId, value: guest.fullName }));
                setSelectedGuests(existingGuests);
            }
        } else {
            setInviteName('');
            setSelectedGuests([]);
        }
    }, [editingInvite]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (inviteName.trim()) {
            onSubmit({ inviteName }, selectedGuests);
            setInviteName('');
            setSelectedGuests([]);
            onOpenChange(false);
        }
    }

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            setInviteName('')
            setSelectedGuests([])
        }
        onOpenChange(open);
    }

    const handleSelectedGuestsChange = useCallback((updated: KeyValuePair[]) => {
        setSelectedGuests(updated);
    }, [])

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite</DialogTitle>
                    <DialogDescription>Invite a friend to your party</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium" htmlFor="inviteName">Invite Name</Label>
                        <Input
                            id="inviteName"
                            name="inviteName"
                            placeholder="Doe Family"
                            className="mt-2"
                            value={inviteName}
                            onChange={(e) => setInviteName(e.target.value)}
                        />
                    </div>

                    <Separator className="my-4" />

                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <Label className="text-sm font-medium" htmlFor="inviteUrl">Add Guests</Label>
                        </div>

                        <div className="flex justify-between items-center mb-1 mt-3">
                            <AutocompleteField
                                data={guestData}
                                selected={selectedGuests}
                                onDataChange={handleSelectedGuestsChange}
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end mt-10">
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button type="submit">Submit</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
