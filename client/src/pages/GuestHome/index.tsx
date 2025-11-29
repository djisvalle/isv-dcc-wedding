import Hero from "./Hero";
import Navbar from "./Navbar";
import RSVP from "./RSVP";

export default function GuestHome() {
    return (
        <div className="scroll-smooth">
            <Navbar></Navbar>
            <Hero></Hero>
            {/* <Story></Story>
            <Details></Details>
            <Gallery></Gallery> */}
            <RSVP></RSVP>
        </div>
    );
}