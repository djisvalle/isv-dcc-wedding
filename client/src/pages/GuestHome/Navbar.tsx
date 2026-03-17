const navItems = [
  { label: "Home", target: "home" },
  { label: "Story", target: "story" },
  { label: "Details", target: "details" },
  { label: "Gallery", target: "gallery" },
  { label: "RSVP", target: "rsvp" },
];

export default function Navbar() {
  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="fixed top-0 left-0 w-full bg-white/80 backdrop-blur h-20">
      <div className="mx-auto max-w-4xl flex justify-center gap-15 py-3 h-full">
        {navItems.map((item) => (
          <button
            key={item.target}
            onClick={() => scrollTo(item.target)}
            className="text-gray-700 hover:text-gray-900 font-medium"
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  );
}
