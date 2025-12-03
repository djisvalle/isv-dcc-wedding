import { useLocation, Link } from "react-router-dom";

export default function Navbar() {
    const location = useLocation();

    const links = [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/guests", label: "Guests" },
        { href: "/invites", label: "Invites" }
    ]

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md">
            <div className="px-6 py-4 flex gap-8 justify-center">
                {links.map((link) => {
                    const isActive = location.pathname === link.href
                    return (
                        <Link
                            key={link.href}
                            to={link.href}
                            className={isActive ? "text-primary" : "text-foreground"}
                        >
                            {link.label}
                        </Link>
                    )
                })}
            </div>
        </nav>
    )
}