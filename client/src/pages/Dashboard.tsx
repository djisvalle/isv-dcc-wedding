import { useState } from "react";

import { Button } from "@/components/ui/button";

interface Guest {
    name: string;
    guestCount: number;
    isAttending: boolean;
}

export default function Dashboard() {
    const [guests, setGuests] = useState<Guest[]>([]);
    const [name, setName] = useState('');
    const [guestCount, setGuestCount] = useState(0);
    const [isAttending, setIsAttending] = useState(false);
    const [editingId, setEditingId] = useState('');

    const handleAddGuest = () => {
        const newGuest = { 
            name, 
            guestCount, 
            isAttending 
        };
        setGuests([...guests, newGuest]);
        setName('');
        setGuestCount(0);
        setIsAttending(false);
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-8 h-screen">
            <h1 className="text-3xl font-serif text-center mb-8">Guest Management</h1>

            <div className="p-4 rounded-xl border shadow bg-white space-y-4">
                <h2 className="text-2xl font-serif">Add Guest</h2>

                <input 
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full p-2 border rounded"
                />

                <input
                    type="number"
                    placeholder="Guest Count"
                    value={guestCount}
                    onChange={(e) => setGuestCount(parseInt(e.target.value))}
                    className="w-full p-2 border rounded"
                />

                <input
                    type="checkbox"
                    checked={isAttending}
                    onChange={(e) => setIsAttending(e.target.checked)}
                    className="mr-2"
                />
                <label>Attending</label>

                <Button
                    onClick={handleAddGuest}
                    className="bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded"
                >
                    Add Guest
                </Button>
            </div>

            <div className="p-4 rounded-xl border shadow bg-white">
                <h2 className="text-2xl font-serif">Guest List</h2>

                {guests.length === 0 && (
                    <p className="text-gray-500">No guests added yet.</p>
                )}

                <table className="w-full border rounded overflow-hidden">
                    <thead className="bg-gray-100 border-b">
                        <tr>
                           <th>Name</th> 
                           <th>Guest Count</th>
                           <th>Attending</th>
                        </tr>
                    </thead>
                    <tbody>
                        {guests.map((guest) => (
                            <tr key={guest.name}>
                                <td>{guest.name}</td>
                                <td>{guest.guestCount}</td>
                                <td>{guest.isAttending ? 'Yes' : 'No'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}