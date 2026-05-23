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
    { id: '1', name: 'Mission Funds', percentage: 50 },
    { id: '2', name: 'Church Funds', percentage: 50 },
  ],
  titheAllocations: [
    { id: 't1', name: 'Conference/Mission Funds (Tithe Devotion)', percentage: 100 }
  ]
};

export const INITIAL_MEMBERS: Member[] = [];

export const INITIAL_CONTRIBUTIONS: Contribution[] = [];
