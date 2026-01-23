import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileText, Check, AlertCircle, ArrowRight, Table } from 'lucide-react';
import { Subscription, BillingCycle } from '../types';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImport: (subscriptions: Partial<Subscription>[]) => void;
    currency: string;
}

const ImportModal: React.FC<ImportModalProps> = ({ isOpen, onClose, onImport, currency }) => {
    const [step, setStep] = useState<'upload' | 'preview'>('upload');
    const [rawText, setRawText] = useState('');
    const [parsedRows, setParsedRows] = useState<string[][]>([]);
    const [headers, setHeaders] = useState<string[]>([]);
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({}); // index -> field
    const fileInputRef = useRef<HTMLInputElement>(null);

    const REQUIRED_FIELDS = ['name', 'amount'];
    const FIELD_OPTIONS = [
        { value: 'name', label: 'Name / Service' },
        { value: 'amount', label: 'Cost / Amount' },
        { value: 'currency', label: 'Currency' },
        { value: 'billingCycle', label: 'Billing Cycle' },
        { value: 'renewalDate', label: 'Next Payment Date' },
        { value: 'category', label: 'Category' },
        { value: 'ignore', label: 'Ignore Column' }
    ];

    const parseCSV = (text: string) => {
        // Simple robust CSV parser handling quotes
        const rows: string[][] = [];
        let currentRow: string[] = [];
        let currentCell = '';
        let insideQuote = false;

        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            const nextChar = text[i + 1];

            if (char === '"') {
                if (insideQuote && nextChar === '"') {
                    currentCell += '"';
                    i++; // Skip escape
                } else {
                    insideQuote = !insideQuote;
                }
            } else if (char === ',' && !insideQuote) {
                currentRow.push(currentCell.trim());
                currentCell = '';
            } else if ((char === '\r' || char === '\n') && !insideQuote) {
                if (currentCell || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                    currentRow = [];
                    currentCell = '';
                }
                if (char === '\r' && nextChar === '\n') i++;
            } else {
                currentCell += char;
            }
        }
        if (currentCell || currentRow.length > 0) {
            currentRow.push(currentCell.trim());
            rows.push(currentRow);
        }
        return rows;
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            processData(text);
        };
        reader.readAsText(file);
    };

    const processData = (text: string) => {
        const rows = parseCSV(text);
        if (rows.length < 2) {
            alert("Invalid CSV: Needs at least a header and one row.");
            return;
        }
        setHeaders(rows[0]);
        setParsedRows(rows.slice(1));

        // Auto-guess mapping
        const mapping: Record<string, string> = {};
        rows[0].forEach((h, i) => {
            const lower = h.toLowerCase();
            if (lower.includes('name') || lower.includes('service') || lower.includes('title')) mapping[i] = 'name';
            else if (lower.includes('amount') || lower.includes('price') || lower.includes('cost') || lower.includes('value')) mapping[i] = 'amount';
            else if (lower.includes('date') || lower.includes('renewal') || lower.includes('billing') || lower.includes('due')) mapping[i] = 'renewalDate';
            else if (lower.includes('currency') || lower.includes('iso')) mapping[i] = 'currency';
            else if (lower.includes('cycle') || lower.includes('period') || lower.includes('freq')) mapping[i] = 'billingCycle';
            else mapping[i] = 'ignore';
        });
        setColumnMapping(mapping);
        setStep('preview');
    };

    const finalizeImport = () => {
        const subscriptions: Partial<Subscription>[] = parsedRows.map(row => {
            const sub: any = { currency: currency, billingCycle: BillingCycle.Monthly }; // Defaults

            Object.entries(columnMapping).forEach(([colIndex, field]) => {
                if (field === 'ignore') return;
                const value = row[parseInt(colIndex)];

                if (field === 'amount') {
                    sub.amount = parseFloat(value.replace(/[^0-9.]/g, '')) || 0;
                } else if (field === 'renewalDate') {
                    // Try to parse date
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                        sub.renewalDate = date.toISOString();
                    } else {
                        sub.renewalDate = new Date().toISOString(); // Fallback
                    }
                } else if (field === 'billingCycle') {
                    // Basic fuzzy match
                    const v = value.toLowerCase();
                    if (v.includes('year') || v.includes('annu')) sub.billingCycle = BillingCycle.Annual;
                    else if (v.includes('week')) sub.billingCycle = BillingCycle.Weekly;
                    else sub.billingCycle = BillingCycle.Monthly;
                } else {
                    (sub as any)[field] = value;
                }
            });

            return sub;
        }).filter(s => s.name && s.amount > 0);

        onImport(subscriptions);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
            >
                <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Import Subscriptions</h3>
                        <p className="text-sm text-gray-500">Add multiple subscriptions at once from CSV</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {step === 'upload' ? (
                        <div className="space-y-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                            >
                                <div className="bg-indigo-100 text-indigo-600 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                                    <Upload size={32} />
                                </div>
                                <h4 className="font-bold text-lg text-gray-700">Upload CSV File</h4>
                                <p className="text-gray-400 text-sm mt-1">Drag & drop or click to browse</p>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                />
                            </div>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">OR</span></div>
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">Paste CSV Data</label>
                                <textarea
                                    value={rawText}
                                    onChange={(e) => setRawText(e.target.value)}
                                    placeholder="Name,Amount,Date&#10;Netflix,15.99,2023-12-01&#10;Spotify,9.99,2023-12-05"
                                    className="w-full h-32 p-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                                ></textarea>
                                <button
                                    onClick={() => processData(rawText)}
                                    disabled={!rawText.trim()}
                                    className="mt-4 w-full bg-black text-white py-3 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Process Text
                                </button>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-xl flex items-start gap-3">
                                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                                <div className="text-sm text-blue-800">
                                    <strong>Tip:</strong> We support standard CSV files exported from bank statements or other trackers. You'll be able to map the columns in the next step.
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-gray-800 flex items-center gap-2">
                                    <Table size={18} className="text-indigo-500" />
                                    Map Columns
                                </h4>
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-md text-gray-500">
                                    Found {parsedRows.length} rows
                                </span>
                            </div>

                            <div className="overflow-x-auto border border-gray-200 rounded-xl">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            {headers.map((header, index) => (
                                                <th key={index} className="p-3 border-b border-gray-200 min-w-[150px]">
                                                    <div className="mb-2 text-xs font-bold text-gray-500 uppercase tracking-wider truncate" title={header}>{header}</div>
                                                    <select
                                                        value={columnMapping[index] || 'ignore'}
                                                        onChange={(e) => setColumnMapping(prev => ({ ...prev, [index]: e.target.value }))}
                                                        className={`w-full p-1.5 rounded-lg border text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none ${columnMapping[index] === 'ignore' ? 'bg-gray-100 text-gray-500 border-gray-200' :
                                                            columnMapping[index] === 'name' || columnMapping[index] === 'amount' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                                                                'bg-white border-gray-300 text-gray-900'
                                                            }`}
                                                    >
                                                        {FIELD_OPTIONS.map(opt => (
                                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                                        ))}
                                                    </select>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {parsedRows.slice(0, 5).map((row, rowIndex) => (
                                            <tr key={rowIndex} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                                                {headers.map((_, colIndex) => (
                                                    <td key={colIndex} className={`p-3 text-gray-600 ${columnMapping[colIndex] === 'ignore' ? 'opacity-40' : ''}`}>
                                                        {row[colIndex]}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {parsedRows.length > 5 && (
                                <p className="text-xs text-center text-gray-400 italic">...and {parsedRows.length - 5} more rows</p>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                    {step === 'preview' && (
                        <button
                            onClick={() => setStep('upload')}
                            className="px-6 py-2 bg-white border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-100"
                        >
                            Back
                        </button>
                    )}
                    {step === 'preview' && (
                        <button
                            onClick={finalizeImport}
                            className="px-6 py-2 bg-black text-white font-bold rounded-xl hover:bg-gray-800 flex items-center gap-2 shadow-lg shadow-gray-200"
                        >
                            <Check size={18} /> Import {parsedRows.length} Items
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ImportModal;
