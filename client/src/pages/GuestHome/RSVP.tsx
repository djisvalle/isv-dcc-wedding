"use client"

import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { motion } from "motion/react";
import { toast } from "sonner"

import { useConfirmGuestRsvp } from "@/hooks/useGuest";

import type { GuestRsvp } from "@/types/Guest";

export default function RSVP({ guests }: { guests: GuestRsvp[]}) {
  const [loading, setLoading] = useState(false);
  const [confirmedGuests, setConfirmedGuests] = useState<GuestRsvp[]>(guests);

  const confirmGuestRsvp = useConfirmGuestRsvp();

  const submitRSVP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    await confirmGuestRsvp.mutateAsync(confirmedGuests);

    setLoading(false);
    toast("RSVP submitted successfully");
  };

  const updateGuestAttendance = (guestId: string, attending: boolean) => {
    setConfirmedGuests(prev =>
      prev.map(guest =>
        guest.guestId === guestId 
        ? { ...guest, isAttending: attending } 
        : guest
      ))
  }

  return (
    <section id="rsvp" className="py-20 px-4 max-w-2xl mx-auto">
      <Card>
        <CardHeader className="justify-center">
          <CardTitle className="text-center text-3xl font-sans">Hello, {guests[0].inviteName}! <br /> We have reserved <b><u>{guests.length}</u></b> seats for you!</CardTitle>
          <CardDescription className="text-center font-sans">Kindly confirm who will be attending</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitRSVP} id="rsvp-form">
            <Table className="w-3/4 mx-auto">
              <TableHeader>
                <TableRow>
                  <TableHead className="font-serif text-gray-600">Name of Attendee</TableHead>
                  <TableHead className="w-[100px] font-serif text-gray-600 text-center">Attending</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {confirmedGuests.map((guest: any) => (
                  <TableRow key={guest.guestId}>
                    <TableCell className="font-serif font-medium text-lg">{guest.fullName}</TableCell>
                    <TableCell className="w-[100px] text-center">
                      <Switch className="scale-150" checked={guest.isAttending} onCheckedChange={(value) => updateGuestAttendance(guest.guestId, value)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </form>
        </CardContent>
        <CardFooter className="flex-col gap-2">
          <p className="text-xs text-gray-600 text-center font-serif">For any questions or issues, please contact either <b>Israel</b> at <b>09190679165</b> or <b>Debs</b> at <b>09695192733</b>.</p>
          <Separator className="my-4" />
          <motion.div
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="w-full"
          >
            <Button className="font-serif text-lg w-full" type="submit" form="rsvp-form">Submit RSVP</Button>
          </motion.div>
        </CardFooter>
      </Card>
    </section>
  );
}

