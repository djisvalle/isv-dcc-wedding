import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";

import { useState, useEffect } from "react";
import { useGetAllInvites } from "../../hooks/useInvite";

import type { Guest } from "../../types/Guest";

interface GuestModalProps {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    onSubmit: (guest: Omit<Guest, "guestId" | "isAttending">) => void,
    editingGuest?: Guest | null
}

export default function GuestModal({ open, onOpenChange, onSubmit, editingGuest }: GuestModalProps) {

    const { data } = useGetAllInvites();

    const [fullName, setFullName] = useState('');
    const [inviteId, setInviteId] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (fullName.trim()) {
            onSubmit({ fullName, inviteId });
            setFullName('');
            onOpenChange(false);
        }
    }

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen) {
            setFullName('');
        }
        onOpenChange(newOpen);
    }

    useEffect(() => {
        if (editingGuest) {
            setFullName(editingGuest.fullName);
            setInviteId(editingGuest.inviteId);
        } else {
            setFullName('');
            setInviteId('');
        }
    }, [editingGuest]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{editingGuest ? "Update Guest" : "Add Guest"}</DialogTitle>
                    <DialogDescription>{ editingGuest ? "Update guest details" : "Add a new guest" }</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <Label className="text-sm font-medium" htmlFor="name">Name</Label>
                        <Input 
                            id="fullName"
                            name="fullName" 
                            placeholder="John Doe" 
                            className="mt-2"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label className="text-sm font-medium" htmlFor="inviteId">Invite / Family Name</Label>
                        <Select value={inviteId} onValueChange={setInviteId}>
                            <SelectTrigger className="w-full mt-2">
                                <SelectValue placeholder="Select an invite" />
                            </SelectTrigger>
                            <SelectContent>
                                {data?.map((invite) => (
                                    <SelectItem key={invite.inviteId} value={invite.inviteId}>
                                        {invite.inviteName}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex gap-3 justify-end mt-10">
                        <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
                        <Button type="submit">{editingGuest ? "Update" : "Add"}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}