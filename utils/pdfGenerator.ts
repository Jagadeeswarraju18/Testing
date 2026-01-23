import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Subscription, User } from '../types';

export const generatePDF = (user: User, subscriptions: Subscription[], currency: string) => {
  const doc = new jsPDF();

  // title
  doc.setFontSize(20);
  doc.text('Subscription Report', 14, 22);

  // user info
  doc.setFontSize(10);
  doc.text(`Generated for: ${user.name}`, 14, 30);
  doc.text(`Date: ${new Date().toLocaleDateString()}`, 14, 35);
  doc.text(`Currency Base: ${currency}`, 14, 40);

  const tableRows = subscriptions.map(sub => {
    return [
      sub.name,
      sub.category,
      `${sub.amount.toFixed(2)} ${sub.currency}`,
      sub.billingCycle,
      new Date(sub.renewalDate).toLocaleDateString()
    ];
  });

  autoTable(doc, {
    head: [['Name', 'Category', 'Cost', 'Billing', 'Next Renewal']],
    body: tableRows,
    startY: 45,
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] }, // Indigo-600
  });

  // Footer / Total could go here, but complex currency conversion logic might be needed.
  // For MVP, just the list is good.

  doc.save(`subtrack_report_${new Date().toISOString().split('T')[0]}.pdf`);
};
