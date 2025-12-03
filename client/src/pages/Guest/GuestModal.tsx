import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";

export default function GuestModal({ open }: any) {
    return (
        <Dialog open={open}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>
                        Test{/* {mode === "add" ? "Add Guest" : "Edit Guest"} */}
                    </DialogTitle>
                    <DialogDescription>
                        Test{/* {mode === "add" ? "Add a new guest to the guest list." : "Edit the guest details."} */}
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-4">
                    <div>
                        <Label htmlFor="name">Name</Label>
                        <Input id="name" name="name" placeholder="John Doe" className="mt-2" />
                    </div>
                    <div className="flex gap-3 justify-end">
                        <Button type="button">Cancel</Button>
                        <Button type="submit">Add</Button>
                        {/* <Button type="submit">{mode === "add" ? "Add Guest" : "Update Guest"}</Button> */}
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}