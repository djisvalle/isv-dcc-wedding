import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogFooter, AlertDialogTitle, AlertDialogDescription, AlertDialogCancel } from "../../components/ui/alert-dialog";
import { Button } from "../../components/ui/button";

import { useEffect, useState } from "react";

import type { Guest } from "../../types/Guest";

interface GuestAlertProps {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    onSubmit: (guestId: string) => void,
    deletingGuest?: Guest | null
}

export default function GuestAlert({ open, onOpenChange, onSubmit, deletingGuest }: GuestAlertProps) {

    const [fullName, setFullName] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(deletingGuest?.guestId || '');
        onOpenChange(false);
    }

    const handleAlertOpenChange = (newOpen: boolean) => {
        onOpenChange(newOpen);
    }

    useEffect(() => {
        if (deletingGuest) {
            setFullName(deletingGuest.fullName);
        }
    })

    return (
        <AlertDialog open={open} onOpenChange={handleAlertOpenChange}>
            <AlertDialogContent>
                <form onSubmit={handleSubmit}>
                    <AlertDialogHeader>
                        <AlertDialogTitle>
                            Are you sure you want to remove {fullName} from the guest list?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>

                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <Button type="submit">Continue</Button>
                    </AlertDialogFooter>
                </form>
            </AlertDialogContent>
        </AlertDialog>
    )
}