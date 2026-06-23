// Authentic Historical Disaster Database for Sri Lanka
// Sourced from Disaster Management Centre (DMC) and DesInventar

export const REAL_DISASTERS = [
  {
    year: 2025,
    type: "cyclone",
    severity: "critical",
    description: "Cyclone Ditwah caused catastrophic nationwide impacts. Extreme winds and heavy rainfall triggered widespread devastation across the entire country.",
    affected_districts: ['colombo', 'gampaha', 'kalutara', 'kandy', 'matale', 'nuwara eliya', 'galle', 'matara', 'hambantota', 'jaffna', 'kilinochchi', 'mannar', 'vavuniya', 'mullaitivu', 'batticaloa', 'ampara', 'trincomalee', 'kurunegala', 'puttalam', 'anuradhapura', 'polonnaruwa', 'badulla', 'moneragala', 'ratnapura', 'kegalle']
  },
  {
    year: 2025,
    type: "landslide",
    severity: "critical",
    description: "Cyclone Ditwah triggered deadly landslides, earth slips, and rockfalls across the mountainous and hilly terrain.",
    affected_districts: ['kandy', 'badulla', 'matale', 'kegalle', 'nuwara eliya', 'ratnapura', 'kalutara']
  },
  {
    year: 2004,
    type: "tsunami",
    severity: "critical",
    description: "The catastrophic 2004 Indian Ocean Tsunami devastated this coastal district, causing massive loss of life and obliterating coastal infrastructure.",
    affected_districts: ['galle', 'matara', 'hambantota', 'ampara', 'batticaloa', 'trincomalee', 'mullaitivu', 'puttalam', 'colombo', 'kalutara', 'jaffna']
  },
  {
    year: 2017,
    type: "flood",
    severity: "high",
    description: "Extreme South-West monsoonal rains triggered massive mudflows and catastrophic flooding.",
    affected_districts: ['kalutara', 'matara', 'ratnapura', 'galle']
  },
  {
    year: 2016,
    type: "flood",
    severity: "high",
    description: "Tropical Storm Roanu caused devastating urban flooding as the Kelani river overflowed its banks.",
    affected_districts: ['colombo', 'gampaha']
  },
  {
    year: 2016,
    type: "landslide",
    severity: "critical",
    description: "Tropical Storm Roanu triggered the catastrophic Aranayake landslide, completely burying entire villages.",
    affected_districts: ['kegalle']
  },
  {
    year: 2014,
    type: "drought",
    severity: "high",
    description: "A severe, prolonged drought devastated agricultural yields and dried up major reservoirs.",
    affected_districts: ['kurunegala', 'hambantota', 'moneragala', 'puttalam', 'anuradhapura', 'polonnaruwa']
  },
  {
    year: 2000,
    type: "cyclone",
    severity: "high",
    description: "A severe cyclonic storm made landfall, causing massive wind damage and coastal flooding.",
    affected_districts: ['batticaloa', 'trincomalee', 'ampara']
  }
];

export const matchDisastersToLocation = (district: string, name: string) => {
  const disasters: any[] = [];
  const districtLower = (district || '').toLowerCase();
  const nameLower = (name || '').toLowerCase();
  
  REAL_DISASTERS.forEach(event => {
    // If the location's district is in the event's affected list
    if (event.affected_districts.some(d => districtLower.includes(d))) {
      disasters.push({
        year: event.year,
        type: event.type,
        severity: event.severity,
        description: event.description
      });
    }
  });

  // Tsunami fallback: If it's a beach/bay but the district wasn't captured properly
  const isCoastal = nameLower.includes('beach') || nameLower.includes('bay') || nameLower.includes('coast');
  if (isCoastal && !disasters.some(d => d.type === 'tsunami')) {
    disasters.push({
      year: 2004,
      type: "tsunami",
      severity: "high",
      description: "Coastal regions of Sri Lanka were highly impacted by the 2004 Indian Ocean Tsunami."
    });
  }

  // Sort by year descending (newest first)
  return disasters.sort((a, b) => b.year - a.year);
};
