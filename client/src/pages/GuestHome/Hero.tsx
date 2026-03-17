import { motion } from "motion/react";


export default function Hero() {
  return (
    <section
      id="home"
      className="h-screen flex flex-col justify-center items-center text-center"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className=""
      >
        <h1 className="text-6xl font-sans drop-shadow text-white">Israel & Debs</h1>
      </motion.div>
      {/* <p className="text-xl mt-4 text-white">January 8, 2027</p>
      <p className="text-lg mt-2 text-white">We are excited to celebrate with you</p> */}
    </section>
  );
}
