import React, { useState } from "react";
import { collection, addDoc, setDoc, getDoc } from "firebase/firestore";

export default function RSVP() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [attending, setAttending] = useState(false);
  const [guests, setGuests] = useState(0);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const submitRSVP = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    console.log(name);
    console.log(email);
    console.log(attending);
    console.log(guests);

    setLoading(false);
    setMessage("RSVP submitted successfully!");    
  };

  return (
    <section id="rsvp" className="py-20 px-4 max-w-3xl mx-auto">
      <h2 className="text-3xl font-serif text-center mb-8">RSVP</h2>

      <form onSubmit={submitRSVP} className="bg-white rounded-xl shadow p-6 space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Name
          </label>
          <input
            required
            type="text"
            id="name"
            className="w-full p-2 border rounded"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium mb-1">
            Email
          </label>
          <input
            required
            type="email"
            id="email"
            className="w-full p-2 border rounded"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="attending" className="block text-sm font-medium mb-1">
            Will you be attending?
          </label>
          <select
            id="attending"
            className="w-full p-2 border rounded"
            value={attending ? "true" : "false"}
            onChange={(e) => setAttending(e.target.value === "true")}
          >
            <option value="true">Yes, I will be attending</option>
            <option value="false">Sorry, we won't be able to make it</option>
          </select>
        </div>  

        {attending === true && (
          <div>
            <label htmlFor="guests" className="block text-sm font-medium mb-1">
              Number of guests (including you)
            </label>
            <input
              required
              type="number"
              id="guests"
              min={1}
              max={10}
              className="w-full p-2 border rounded"
              value={guests}
              onChange={(e) => setGuests(parseInt(e.target.value))}
            />
          </div>
        )}


        <div className="flex justify-end">
          <button
            disabled={loading}
            className="bg-black text-white py-2 px-5 rounded hover:bg-gray-800"
          >
            {loading ? "Submitting..." : "Submit RSVP"}
          </button>
        </div>

        {message && (
          <p className="text-center mt-4 text-sm text-gray-700">{message}</p>
        )}
      </form>

      {/* <iframe
        src="https://forms.gle/aqRUxbLVUP2pjjhc8"
        className="w-full h-[600px] rounded-lg shadow"
      ></iframe> */}
    </section>
  );
}
