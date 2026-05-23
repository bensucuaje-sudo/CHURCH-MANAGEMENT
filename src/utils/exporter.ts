/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, Contribution, ChurchPreferences } from '../types';

/**
 * Downloads a string content as a CSV file with BOM so Excel recognizes it correctly.
 */
export function downloadCSV(filename: string, csvContent: string) {
  // UTF-8 BOM helps MS Excel read special characters and layout columns correctly
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Converts Member list to CSV report for Excel.
 */
export function exportMembersToCSV(members: Member[]) {
  const headers = ["Member ID", "Full Name", "Email Address", "Phone Number", "Street Address", "Year Baptized", "Status", "Church Role", "Notes"];
  
  const rows = members.map(m => [
    m.id,
    m.name,
    m.email,
    m.phone,
    m.address,
    m.membershipDate && m.membershipDate.includes('-') ? m.membershipDate.split('-')[0] : m.membershipDate,
    m.status,
    m.role,
    m.notes ? m.notes.replace(/"/g, '""') : ""
  ]);
  
  const csvContent = [
    headers.map(h => `"${h}"`).join(","),
    ...rows.map(r => r.map(cell => `"${cell || ''}"`).join(","))
  ].join("\n");
  
  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`Church_Members_Report_${dateStr}.csv`, csvContent);
}

/**
 * Converts Contribution list (ledger) with Combined Offering breakdowns to CSV report.
 */
export function exportContributionsToCSV(
  contributions: Contribution[], 
  preferences: ChurchPreferences
) {
  // We'll list main totals, and also detail how Combined Offerings break down
  const headers = [
    "Receipt No",
    "Member ID",
    "Member Name",
    "Date",
    "Payment Method",
    `Tithe (${preferences.currency})`,
    `Combined Offering (${preferences.currency})`,
    `Building Fund (${preferences.currency})`,
    `Missions (${preferences.currency})`,
    `Youth Ministries (${preferences.currency})`,
    `Others (${preferences.currency})`,
    `Total Paid (${preferences.currency})`,
    "Contribution Notes"
  ];

  // Also append dynamic columns representing the offering plan breakdowns for informational completeness in Excel!
  const planHeaders = preferences.combinedOfferingAllocations.map(plan => `Offering Plan: ${plan.name} (${plan.percentage}%)`);
  const finalHeaders = [...headers, ...planHeaders];

  const rows = contributions.map(c => {
    // Standard funds
    const baseFields = [
      c.receiptNo,
      c.memberId,
      c.memberName,
      c.date,
      c.paymentMethod,
      c.tithe.toFixed(2),
      c.combinedOffering.toFixed(2),
      c.buildingFund.toFixed(2),
      c.missions.toFixed(2),
      c.youth.toFixed(2),
      c.others.toFixed(2),
      c.total.toFixed(2),
      c.notes ? c.notes.replace(/"/g, '""') : ""
    ];

    // Dynamic offer breakdowns
    const planBreakdowns = preferences.combinedOfferingAllocations.map(plan => {
      const share = (c.combinedOffering * (plan.percentage / 100));
      return share.toFixed(2);
    });

    return [...baseFields, ...planBreakdowns];
  });

  // Calculate Column Sums for the spreadsheet bottom to look highly professional
  const totalTithe = contributions.reduce((sum, c) => sum + c.tithe, 0);
  const totalCombined = contributions.reduce((sum, c) => sum + c.combinedOffering, 0);
  const totalBuilding = contributions.reduce((sum, c) => sum + c.buildingFund, 0);
  const totalMissions = contributions.reduce((sum, c) => sum + c.missions, 0);
  const totalYouth = contributions.reduce((sum, c) => sum + c.youth, 0);
  const totalOthers = contributions.reduce((sum, c) => sum + c.others, 0);
  const totalSum = contributions.reduce((sum, c) => sum + c.total, 0);

  const sumRow = [
    "TOTALS",
    "-",
    "-",
    "-",
    "-",
    totalTithe.toFixed(2),
    totalCombined.toFixed(2),
    totalBuilding.toFixed(2),
    totalMissions.toFixed(2),
    totalYouth.toFixed(2),
    totalOthers.toFixed(2),
    totalSum.toFixed(2),
    "Aggregated sums of columns"
  ];

  // Dynamic offering breakdowns sum
  preferences.combinedOfferingAllocations.forEach(plan => {
    const totalSharePlan = totalCombined * (plan.percentage / 100);
    sumRow.push(totalSharePlan.toFixed(2));
  });

  const csvContent = [
    finalHeaders.map(h => `"${h}"`).join(","),
    ...rows.map(r => r.map(cell => `"${cell || ''}"`).join(",")),
    sumRow.map(cell => `"${cell}"`).join(",")
  ].join("\n");

  const dateStr = new Date().toISOString().split('T')[0];
  downloadCSV(`Church_Giving_Ledger_Report_${dateStr}.csv`, csvContent);
}
