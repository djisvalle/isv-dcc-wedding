import { useGetGuestsByInviteForRsvp } from "@/hooks/useGuest";
import Countdown from "./Countdown";
import Hero from "./Hero";
// import Navbar from "./Navbar";
import RSVP from "./RSVP";

import { useLocation } from "react-router-dom";

export default function GuestHome() {

    const location = useLocation();
    const inviteQuery = new URLSearchParams(location.search).get('invite');
    
    const { data, error } = useGetGuestsByInviteForRsvp(inviteQuery);

    return (
        <div className="scroll-smooth">
            {/* <Navbar></Navbar> */}
            <Countdown></Countdown>
            <Hero></Hero>
            {/* <Story></Story>
            <Details></Details>
            <Gallery></Gallery> */}

            {inviteQuery === null || error || data === null || data?.length === 0 || data?.length === undefined
                ? <></> : <RSVP guests={data}></RSVP>
            }
        </div>
    );
}