export default function RsvpSkeleton() {
  return (
    <div className="py-12 md:py-20 px-6 md:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="rounded-[2.5rem] bg-white/60 shadow-xl overflow-hidden animate-pulse">
          <div className="py-10 md:py-16 px-8 md:px-12 bg-wedding-gold/5 text-center space-y-4">
            <div className="h-3 w-40 bg-wedding-gold/10 rounded-full mx-auto" />
            <div className="h-10 w-64 bg-wedding-gold/10 rounded-full mx-auto" />
            <div className="h-4 w-72 bg-wedding-gold/10 rounded-full mx-auto" />
          </div>
          <div className="p-8 md:p-14 space-y-6">
            {[0, 1].map(i => (
              <div
                key={i}
                className="p-6 md:p-8 border border-wedding-gold/5 rounded-3xl bg-white/40 flex flex-col md:flex-row items-center justify-between gap-4"
              >
                <div className="h-6 w-32 bg-wedding-gold/10 rounded-full" />
                <div className="flex gap-2 w-full md:w-auto">
                  <div className="h-11 flex-1 md:w-24 bg-wedding-gold/10 rounded-full" />
                  <div className="h-11 flex-1 md:w-24 bg-wedding-gold/10 rounded-full" />
                </div>
              </div>
            ))}
            <div className="h-16 w-full bg-wedding-dark/10 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
