import React from 'react';
import { Users } from 'lucide-react';

interface SeatTrackerProps {
    seatsTotal?: number;
    seatsAssigned?: number;
    costPerSeat: number;
    currency: string;
    onUpdate: (total: number, assigned: number) => void;
}

const SeatTracker: React.FC<SeatTrackerProps> = ({ seatsTotal = 0, seatsAssigned = 0, costPerSeat, currency, onUpdate }) => {
    const wastedSeats = Math.max(0, seatsTotal - seatsAssigned);
    const wastedCost = wastedSeats * costPerSeat;

    return (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center gap-2 mb-3">
                <Users size={18} className="text-blue-600" />
                <h4 className="font-semibold text-sm text-gray-900">Seat Utilization</h4>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Total Seats (Paid)</label>
                    <input
                        type="number"
                        min="0"
                        value={seatsTotal}
                        onChange={(e) => onUpdate(parseInt(e.target.value) || 0, seatsAssigned)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Assigned (Active)</label>
                    <input
                        type="number"
                        min="0"
                        max={seatsTotal}
                        value={seatsAssigned}
                        onChange={(e) => onUpdate(seatsTotal, parseInt(e.target.value) || 0)}
                        onWheel={(e) => (e.target as HTMLInputElement).blur()}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {wastedSeats > 0 && (
                <div className="mt-3 flex items-center justify-between text-xs bg-red-50 text-red-700 px-3 py-2 rounded border border-red-100">
                    <span>⚠️ {wastedSeats} unused seats</span>
                    <span className="font-bold"> wasting {currency} {wastedCost.toFixed(2)}/mo</span>
                </div>
            )}
        </div>
    );
};

export default SeatTracker;
