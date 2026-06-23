// ClimaLens — Sri Lankan Districts Data
import { District } from '../types';

export const DISTRICTS: District[] = [
  { id: 'colombo', name: 'Colombo', province: 'Western', lat: 6.9271, lng: 79.8612, population: 2324349, area: 699 },
  { id: 'gampaha', name: 'Gampaha', province: 'Western', lat: 7.0840, lng: 80.0098, population: 2304833, area: 1387 },
  { id: 'kalutara', name: 'Kalutara', province: 'Western', lat: 6.5854, lng: 80.1049, population: 1221948, area: 1598 },
  { id: 'kandy', name: 'Kandy', province: 'Central', lat: 7.2906, lng: 80.6337, population: 1375382, area: 1940 },
  { id: 'matale', name: 'Matale', province: 'Central', lat: 7.4675, lng: 80.6234, population: 484531, area: 1993 },
  { id: 'nuwara-eliya', name: 'Nuwara Eliya', province: 'Central', lat: 6.9497, lng: 80.7891, population: 711644, area: 1741 },
  { id: 'galle', name: 'Galle', province: 'Southern', lat: 6.0535, lng: 80.2200, population: 1063334, area: 1652 },
  { id: 'matara', name: 'Matara', province: 'Southern', lat: 5.9549, lng: 80.5550, population: 814048, area: 1283 },
  { id: 'hambantota', name: 'Hambantota', province: 'Southern', lat: 6.1429, lng: 81.1212, population: 599903, area: 2609 },
  { id: 'jaffna', name: 'Jaffna', province: 'Northern', lat: 9.6615, lng: 80.0255, population: 583882, area: 1025 },
  { id: 'kilinochchi', name: 'Kilinochchi', province: 'Northern', lat: 9.3803, lng: 80.3770, population: 112872, area: 1279 },
  { id: 'mannar', name: 'Mannar', province: 'Northern', lat: 8.9810, lng: 79.9044, population: 99051, area: 1996 },
  { id: 'mullaitivu', name: 'Mullaitivu', province: 'Northern', lat: 9.2671, lng: 80.8142, population: 92228, area: 2617 },
  { id: 'vavuniya', name: 'Vavuniya', province: 'Northern', lat: 8.7514, lng: 80.4971, population: 172115, area: 1967 },
  { id: 'trincomalee', name: 'Trincomalee', province: 'Eastern', lat: 8.5874, lng: 81.2152, population: 378182, area: 2727 },
  { id: 'batticaloa', name: 'Batticaloa', province: 'Eastern', lat: 7.7310, lng: 81.6747, population: 526567, area: 2854 },
  { id: 'ampara', name: 'Ampara', province: 'Eastern', lat: 7.2964, lng: 81.6747, population: 649402, area: 4415 },
  { id: 'kurunegala', name: 'Kurunegala', province: 'North Western', lat: 7.4818, lng: 80.3609, population: 1618465, area: 4816 },
  { id: 'puttalam', name: 'Puttalam', province: 'North Western', lat: 8.0408, lng: 79.8394, population: 762396, area: 3072 },
  { id: 'anuradhapura', name: 'Anuradhapura', province: 'North Central', lat: 8.3114, lng: 80.4037, population: 860575, area: 7179 },
  { id: 'polonnaruwa', name: 'Polonnaruwa', province: 'North Central', lat: 7.9403, lng: 81.0188, population: 406088, area: 3293 },
  { id: 'badulla', name: 'Badulla', province: 'Uva', lat: 6.9934, lng: 81.0550, population: 815405, area: 2861 },
  { id: 'monaragala', name: 'Monaragala', province: 'Uva', lat: 6.8728, lng: 81.3507, population: 451058, area: 5639 },
  { id: 'ratnapura', name: 'Ratnapura', province: 'Sabaragamuwa', lat: 6.6828, lng: 80.3992, population: 1088007, area: 3275 },
  { id: 'kegalle', name: 'Kegalle', province: 'Sabaragamuwa', lat: 7.2513, lng: 80.3464, population: 840620, area: 1693 },
];

export function getDistrictById(id: string): District | undefined {
  return DISTRICTS.find(d => d.id === id);
}

export function getDistrictByName(name: string): District | undefined {
  return DISTRICTS.find(d => d.name === name);
}
