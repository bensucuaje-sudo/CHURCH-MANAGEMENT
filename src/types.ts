/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type AccountRole = 'Admin' | 'Member';

export type MembershipStatus = 'Active' | 'Inactive' | 'Visitor';

export type ChurchRole = 'Member' | 'Pastor' | 'Elder' | 'Deacon' | 'Treasurer' | 'Volunteer';

export interface Member {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  membershipDate: string;
  status: MembershipStatus;
  role: ChurchRole;
  notes?: string;
}

export type FundCategory = 'tithe' | 'combinedOffering' | 'buildingFund' | 'missions' | 'youth' | 'others';

export interface CombinedOfferingAllocation {
  id: string;
  name: string;
  percentage: number; // e.g. 50 for 50%
}

export interface Contribution {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  receiptNo: string;
  paymentMethod: 'Cash' | 'Check' | 'Bank Transfer' | 'Mobile Payment' | 'Other';
  tithe: number;
  combinedOffering: number;
  buildingFund: number;
  missions: number;
  youth: number;
  others: number;
  total: number;
  notes?: string;
  copMission?: number;
  harvestIngathering?: number;
  hopeRadio?: number;
  sulads?: number;
  specifiedOffering?: number;
  copChurch?: number;
  specifiedOfferingName?: string;
}

export interface ChurchPreferences {
  churchName: string;
  churchAddress: string;
  churchEmail: string;
  currency: string;
  combinedOfferingAllocations: CombinedOfferingAllocation[];
  titheAllocations: CombinedOfferingAllocation[];
}
