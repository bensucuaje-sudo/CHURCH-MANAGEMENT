/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Member, Contribution, ChurchPreferences } from './types';

export const INITIAL_PREFERENCES: ChurchPreferences = {
  churchName: "Seventh-Day Adventist Church - Santo Tomas Central",
  churchAddress: "Fd. Rd. #4, Tibal-og, Santo Tomas, Davao del Norte",
  churchEmail: "sdasantotomascentral@gmail.com",
  currency: "PHP",
  combinedOfferingAllocations: [
    { id: '1', name: 'Local Church Operating Budget', percentage: 50 },
    { id: '2', name: 'Global Missions & World Evangelism', percentage: 20 },
    { id: '3', name: 'Sabbath School & Christian Education', percentage: 15 },
    { id: '4', name: 'Youth ministries & Children Initiatives', percentage: 10 },
    { id: '5', name: 'Community Outreach & Disaster Relief', percentage: 5 },
  ],
  titheAllocations: [
    { id: 't1', name: 'Conference/Mission Funds (Tithe Devotion)', percentage: 100 }
  ]
};

export const INITIAL_MEMBERS: Member[] = [
  {
    id: "M-1001",
    name: "Pastor John Thomas",
    email: "john.thomas@gracecovenant.org",
    phone: "(555) 019-2834",
    address: "42 Outer Ring Road, Grace City",
    membershipDate: "2020",
    status: "Active",
    role: "Pastor",
    notes: "Spiritual leader and head pastor of Grace Covenant."
  },
  {
    id: "M-1002",
    name: "Sarah Jenkins Miller",
    email: "sjenkins@example.com",
    phone: "(555) 014-9844",
    address: "712 Pine Street, Grace City",
    membershipDate: "2021",
    status: "Active",
    role: "Elder",
    notes: "Board Elder. Leads the combined offering distribution review."
  },
  {
    id: "M-1003",
    name: "Robert D. Chen",
    email: "robert.chen@example.com",
    phone: "(555) 018-4720",
    address: "154 Brookside Lane, Grace City",
    membershipDate: "2022",
    status: "Active",
    role: "Deacon",
    notes: "Leads the hospitality team and sanctuary maintenance."
  },
  {
    id: "M-1004",
    name: "Elisabeth Vance",
    email: "evance@example.com",
    phone: "(555) 012-3211",
    address: "88 Maple Court, Grace City",
    membershipDate: "2023",
    status: "Active",
    role: "Treasurer",
    notes: "Part-time assistant treasurer of the administrative board."
  },
  {
    id: "M-1005",
    name: "Marcus A. Aurelius",
    email: "marcus.a@example.com",
    phone: "(555) 011-8930",
    address: "33 Stoic Way, Grace City",
    membershipDate: "2024",
    status: "Active",
    role: "Member",
    notes: "Regular choir member."
  },
  {
    id: "M-1006",
    name: "David & Clara Harrison",
    email: "harrisons@example.com",
    phone: "(555) 017-6412",
    address: "244 Harvest Drive, Grace City",
    membershipDate: "2022",
    status: "Active",
    role: "Member",
    notes: "Joint family account. Contribute regularly to building fund."
  },
  {
    id: "M-1007",
    name: "Leticia Gomez",
    email: "leticia.g@example.com",
    phone: "(555) 015-3920",
    address: "909 Vista Boulevard, Grace City",
    membershipDate: "2025",
    status: "Active",
    role: "Volunteer",
    notes: "Directs the Sunday School / Children's Bible hours."
  },
  {
    id: "M-1008",
    name: "Benjamin Carter",
    email: "bencarter@example.com",
    phone: "(555) 013-8822",
    address: "12 Shady Oak Drive, Grace City",
    membershipDate: "2025",
    status: "Visitor",
    role: "Member",
    notes: "Evaluating full membership transfer. Regularly attends."
  }
];

export const INITIAL_CONTRIBUTIONS: Contribution[] = [
  {
    id: "C-5001",
    memberId: "M-1001",
    memberName: "Pastor John Thomas",
    date: "2026-05-17",
    receiptNo: "REC-2026-0012",
    paymentMethod: "Bank Transfer",
    tithe: 350.00,
    combinedOffering: 50.00,
    buildingFund: 20.00,
    missions: 15.00,
    youth: 10.00,
    others: 0.00,
    total: 445.00,
    notes: "Monthly direct devotion"
  },
  {
    id: "C-5002",
    memberId: "M-1002",
    memberName: "Sarah Jenkins Miller",
    date: "2026-05-17",
    receiptNo: "REC-2026-0013",
    paymentMethod: "Cash",
    tithe: 500.00,
    combinedOffering: 100.00,
    buildingFund: 50.00,
    missions: 30.00,
    youth: 20.00,
    others: 0.00,
    total: 700.00,
    notes: "Weekly offering & general tithe"
  },
  {
    id: "C-5003",
    memberId: "M-1006",
    memberName: "David & Clara Harrison",
    date: "2026-05-16",
    receiptNo: "REC-2026-0014",
    paymentMethod: "Check",
    tithe: 800.00,
    combinedOffering: 150.00,
    buildingFund: 300.00,
    missions: 50.00,
    youth: 50.00,
    others: 50.00,
    total: 1400.00,
    notes: "Monthly contribution - Special Building Devotion"
  },
  {
    id: "C-5004",
    memberId: "M-1003",
    memberName: "Robert D. Chen",
    date: "2026-05-10",
    receiptNo: "REC-2026-0015",
    paymentMethod: "Cash",
    tithe: 250.00,
    combinedOffering: 60.00,
    buildingFund: 0.00,
    missions: 20.00,
    youth: 10.00,
    others: 10.00,
    total: 350.00,
    notes: "Giving envelope from Sabbath service"
  },
  {
    id: "C-5005",
    memberId: "M-1005",
    memberName: "Marcus A. Aurelius",
    date: "2026-05-10",
    receiptNo: "REC-2026-0016",
    paymentMethod: "Mobile Payment",
    tithe: 400.00,
    combinedOffering: 80.00,
    buildingFund: 10.00,
    missions: 10.00,
    youth: 10.00,
    others: 0.00,
    total: 510.00,
    notes: "E-giving portal"
  },
  {
    id: "C-5006",
    memberId: "M-1007",
    memberName: "Leticia Gomez",
    date: "2026-05-03",
    receiptNo: "REC-2026-0017",
    paymentMethod: "Bank Transfer",
    tithe: 180.00,
    combinedOffering: 40.00,
    buildingFund: 0.00,
    missions: 0.00,
    youth: 30.00,
    others: 0.00,
    total: 250.00,
    notes: "Direct tithe deposit"
  },
  {
    id: "C-5007",
    memberId: "M-1002",
    memberName: "Sarah Jenkins Miller",
    date: "2026-05-03",
    receiptNo: "REC-2026-0018",
    paymentMethod: "Cash",
    tithe: 400.00,
    combinedOffering: 100.00,
    buildingFund: 200.00,
    missions: 50.00,
    youth: 25.00,
    others: 0.00,
    total: 775.00,
    notes: "First Sunday Sabbath stewardship envelope"
  },
  {
    id: "C-5008",
    memberId: "M-1008",
    memberName: "Benjamin Carter",
    date: "2026-04-26",
    receiptNo: "REC-2026-0019",
    paymentMethod: "Cash",
    tithe: 0.00,
    combinedOffering: 120.00,
    buildingFund: 10.00,
    missions: 20.00,
    youth: 10.00,
    others: 0.00,
    total: 160.00,
    notes: "Visitor love offering"
  },
  {
    id: "C-5009",
    memberId: "M-1005",
    memberName: "Marcus A. Aurelius",
    date: "2026-04-19",
    receiptNo: "REC-2026-0020",
    paymentMethod: "Mobile Payment",
    tithe: 450.00,
    combinedOffering: 90.00,
    buildingFund: 20.00,
    missions: 20.00,
    youth: 20.00,
    others: 10.00,
    total: 610.00,
    notes: "Monthly contribution digital transfer"
  },
  {
    id: "C-5010",
    memberId: "M-1006",
    memberName: "David & Clara Harrison",
    date: "2026-04-12",
    receiptNo: "REC-2026-0021",
    paymentMethod: "Check",
    tithe: 900.00,
    combinedOffering: 200.00,
    buildingFund: 500.00,
    missions: 100.00,
    youth: 100.00,
    others: 0.00,
    total: 1800.00,
    notes: "Easter Communion Special Blessing Offering"
  }
];
