import { motion } from 'motion/react';

const officiatingMinister = "Rev. Marcelino V. Abisado";
const expositors = "Rev. Norman W. Holmes & Rev. Linda N. Holmes";

const parentsOfGroom = ["Rev. Gerardo S. Valle (+)", "Rev. Amelita S. Valle"];
const parentsOfBride = ["Rev. Dick R. Carumba", "Mrs. Sharon C. Carumba"];

const principalSponsors: [string, string][] = [
  ["Rev. Norman W. Holmes", "Rev. Linda N. Holmes"],
  ["Rev. Marcelino V. Abisado", "Rev. Linda Flora S. Abisado"],
  ["Rev. George N. Padilla", "Ptr. Blesilda C. Padilla"],
  ["Rev. Audie M. Valencia", "Ptr. Leonila T. Valencia"],
  ["Rev. Miguel S. Muyot", "Ptr. Carolina C. Muyot"],
  ["Ptr. Jaime M. Isidro", "Mrs. Mary Ann R. Isidro"],
  ["Ptr. Efren T. Alzate", "Mrs. Emilia J. Alzate"],
  ["Rev. Albert Garcia", "Mrs. Pauline M. Garcia"],
  ["Ptr. Arturo R. Pelias, Jr.", "Mrs. Mary Licette T. Pelias"],
  ["Ptr. Antonio C. Goudin", "Mrs. Onette Goudin"],
  ["Ptr. Celerino Bargoyo", "Ptr. Jocel Bargoyo"],
  ["Rev. Vergel Montesines", "Ptr. Merlita Montesines"],
  ["Ptr. Mark Anthony Marcon", "Mrs. Christine Marcon"],
  ["Rev. Marc Aaron S. Abisado", "Ptr. Rosanna R. Abisado"],
  ["Rev. John Fianza", "Ptr. Emma Fianza"],
  ["Rev. Beulah Badua", "Mrs. Barbara Delos Reyes"],
  ["Mrs. Zoraida H. Candazo", "Mrs. Gerda Cruz"],
  ["Rev. Ma. Cecilia Baluyot", "Ptr. Martita Pasion"],
];

const secondarySponsors = [
  { role: "To light our path", groom: "Ptr. Mark Anthony Marcon", bride: "Mrs. Christine Marcon" },
  { role: "To clothe us as one", groom: "Ptr. Arturo R. Pelias, Jr", bride: "Mrs. Mary Licette T. Pelias" },
  { role: "To bind us together", groom: "Ptr. Albert Garcia", bride: "Mrs. Pauline M. Garcia" },
  { role: "To carry our symbol of faith", groom: "Ptr. Windell John Moses S. Valle", bride: "Ptr. Arianne Rachelle P. Valle" },
  { role: "To carry our symbol of love", groom: "Engr. Joel John Joshua S. Valle", bride: "Mrs. Aletheia C. Valle" },
  { role: "To carry our symbol of offering", groom: "Mr. Jose Mauro Ignacio", bride: "Mrs. Dorothy C. Ignacio" },
];

const bestMan = "Mr. Joshua J. Alzate";
const maidOfHonor = "Ms. Ma. Bianca Padilla";

const groomsmenAndBridesmaids: [string, string][] = [
  ["Mark Jason S. Sanje", "Maricel Panlaqui"],
  ["Jeffrey Cruz", "Mayen E. Cruz"],
  ["Mandy Lumutan", "Aimee Joy Aliyah S. Valle"],
  ["Jaerome Rafael Perez", "Jeremee J. Alzate"],
  ["Emmanuel C. Carumba", "Elishama C. Carumba"],
  ["Romney Ezra Macabali", "Nneka Joy Marcon"],
  ["David Paul Tandayu", "Yana Del Rosario"],
  ["Brian Daniel C. Dionisio", "Angelica Joy S. Balazo"],
  ["Ricardo Fernando", "Jamie D. Fernando"],
  ["Jayson Orañola", "Alyanna Joy Asia"],
  ["Tyson Warrey", "Maryjane Castro"],
  ["John Hernandez", "Sofia Remigio"],
  ["Herson Hernandez", "Rhia Francisco"],
];

const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h4 className="font-sans font-bold text-wedding-dark uppercase tracking-[0.2em] text-xs mb-4 text-center">
    {children}
  </h4>
);

const NamePairGrid: React.FC<{ pairs: [string, string][] }> = ({ pairs }) => (
  <div className="bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] p-6 md:p-10">
    {pairs.map(([left, right], index) => (
      <div
        key={index}
        className="grid grid-cols-2 gap-4 py-3 border-b border-wedding-gold/10 last:border-0 text-center"
      >
        <p className="font-serif italic text-wedding-dark/60 text-base md:text-lg">{left}</p>
        <p className="font-serif italic text-wedding-dark/60 text-base md:text-lg">{right}</p>
      </div>
    ))}
  </div>
);

export default function EntourageSection() {
  return (
    <section className="py-16 md:py-24 px-6 md:px-8 bg-wedding-cream/30 relative overflow-hidden" id="entourage-section">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "0px 0px -50px 0px" }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="max-w-4xl mx-auto"
      >
        <div className="text-center mb-10 md:mb-16">
          <h2 className="text-xs md:text-sm uppercase tracking-[0.4em] font-sans text-wedding-gold mb-6 opacity-60">
            Mga Abay
          </h2>
          <h3 className="text-4xl md:text-6xl font-ballet text-wedding-dark">Entourage</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          <div>
            <SectionLabel>Officiating Minister</SectionLabel>
            <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl text-center">
              {officiatingMinister}
            </p>
          </div>
          <div>
            <SectionLabel>Expositor</SectionLabel>
            <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl text-center">
              {expositors}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          <div>
            <SectionLabel>Parents of the Groom</SectionLabel>
            <div className="space-y-1 text-center">
              {parentsOfGroom.map(name => (
                <p key={name} className="font-serif italic text-wedding-dark/60 text-lg">{name}</p>
              ))}
            </div>
          </div>
          <div>
            <SectionLabel>Parents of the Bride</SectionLabel>
            <div className="space-y-1 text-center">
              {parentsOfBride.map(name => (
                <p key={name} className="font-serif italic text-wedding-dark/60 text-lg">{name}</p>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-16">
          <h3 className="font-ballet text-3xl md:text-4xl text-wedding-dark text-center mb-8">
            Principal Sponsors
          </h3>
          <NamePairGrid pairs={principalSponsors} />
        </div>

        <div className="mb-16">
          <h3 className="font-ballet text-3xl md:text-4xl text-wedding-dark text-center mb-8">
            Secondary Sponsors
          </h3>
          <div className="bg-white/60 backdrop-blur-sm border border-wedding-gold/10 rounded-[2.5rem] p-8 md:p-12 space-y-8">
            {secondarySponsors.map(sponsor => (
              <div key={sponsor.role} className="text-center">
                <p className="font-sans text-wedding-gold text-xs uppercase tracking-[0.2em] mb-3">
                  {sponsor.role}
                </p>
                <div className="grid grid-cols-2 gap-4 max-w-xl mx-auto">
                  <p className="font-serif italic text-wedding-dark/60 text-base md:text-lg">{sponsor.groom}</p>
                  <p className="font-serif italic text-wedding-dark/60 text-base md:text-lg">{sponsor.bride}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
          <div>
            <SectionLabel>Best Man</SectionLabel>
            <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl text-center">
              {bestMan}
            </p>
          </div>
          <div>
            <SectionLabel>Maid of Honor</SectionLabel>
            <p className="font-serif italic text-wedding-dark/60 text-lg md:text-xl text-center">
              {maidOfHonor}
            </p>
          </div>
        </div>

        <div>
          <h3 className="font-ballet text-3xl md:text-4xl text-wedding-dark text-center mb-8">
            Groomsmen &amp; Bridesmaids
          </h3>
          <NamePairGrid pairs={groomsmenAndBridesmaids} />
        </div>
      </motion.div>
    </section>
  );
}
