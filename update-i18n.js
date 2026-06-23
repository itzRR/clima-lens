const fs = require('fs');
const path = require('path');

const locales = ['en', 'si', 'ta'];
const i18nDir = path.join(__dirname, 'src', 'i18n');

const missingKeys = {
  months: {
    en: { jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec' },
    si: { jan: 'ජන', feb: 'පෙබ', mar: 'මාර්තු', apr: 'අප්‍රේල්', may: 'මැයි', jun: 'ජූනි', jul: 'ජූලි', aug: 'අගෝ', sep: 'සැප්', oct: 'ඔක්', nov: 'නොවැ', dec: 'දෙසැ' },
    ta: { jan: 'ஜன.', feb: 'பிப்.', mar: 'மார்ச்', apr: 'ஏப்.', may: 'மே', jun: 'ஜூன்', jul: 'ஜூலை', aug: 'ஆக.', sep: 'செப்.', oct: 'அக்.', nov: 'நவ.', dec: 'டிச.' }
  },
  interests: {
    en: { surfing: 'Surfing', wildlife: 'Wildlife', hiking: 'Hiking', culture: 'Culture', beaches: 'Beaches', food: 'Food' },
    si: { surfing: 'සර්ෆිං', wildlife: 'වනජීවී', hiking: 'කඳු නැගීම', culture: 'සංස්කෘතිය', beaches: 'වෙරළ', food: 'ආහාර' },
    ta: { surfing: 'சர்ஃபிங்', wildlife: 'வனவிலங்கு', hiking: 'மலையேற்றம்', culture: 'கலாச்சாரம்', beaches: 'கடற்கரைகள்', food: 'உணவு' }
  },
  explore: {
    en: { findDestinations: 'Find Destinations' },
    si: { findDestinations: 'ගමනාන්ත සොයන්න' },
    ta: { findDestinations: 'இடங்களை தேடுங்கள்' }
  },
  profile: {
    en: {
      aboutText: 'ClimaLens is an AI-powered Climate Risk & Travel Intelligence Platform designed for Sri Lanka. It combines disaster-risk prediction, tourism intelligence, and community reporting into one unified experience.',
      limitations: 'Limitations & Roadmap',
      limitation1: 'This is a UI/UX Prototype, not a production-ready emergency system.',
      limitation2: 'AI Predictions are simulated based on historical aggregates, not real-time telemetry.',
      limitation3: 'Community reporting (Part 7) is planned for Phase 2.',
      dataSources: 'Data Sources',
      disclaimer: 'For academic and demonstration purposes only. Do not rely on this application for life-safety or official weather advisories.'
    },
    si: {
      aboutText: 'ClimaLens යනු ශ්‍රී ලංකාව සඳහා නිර්මාණය කර ඇති AI-බල ගැන්වූ දේශගුණ අවදානම් හා සංචාරක බුද්ධි වේදිකාවකි.',
      limitations: 'සීමාවන් සහ මාර්ග සිතියම',
      limitation1: 'මෙය නිෂ්පාදනයට සූදානම් හදිසි පද්ධතියක් නොවේ.',
      limitation2: 'AI අනාවැකි ඓතිහාසික දත්ත මත පදනම් වේ.',
      limitation3: 'ප්‍රජා වාර්තාකරණය අදියර 2 සඳහා සැලසුම් කර ඇත.',
      dataSources: 'දත්ත මූලාශ්‍ර',
      disclaimer: 'ශාස්ත්‍රීය හා ප්‍රදර්ශන අරමුණු සඳහා පමණි.'
    },
    ta: {
      aboutText: 'ClimaLens என்பது இலங்கைக்காக வடிவமைக்கப்பட்ட AI-இயக்கப்படும் காலநிலை ஆபத்து மற்றும் பயண நுண்ணறிவு தளமாகும்.',
      limitations: 'வரம்புகள் மற்றும் வரைபடம்',
      limitation1: 'இது உற்பத்திக்கான அவசர அமைப்பு அல்ல.',
      limitation2: 'AI கணிப்புகள் வரலாற்று தரவுகளின் அடிப்படையில் அமைந்தவை.',
      limitation3: 'சமூக அறிக்கை 2 ஆம் கட்டத்திற்கு திட்டமிடப்பட்டுள்ளது.',
      dataSources: 'தரவு ஆதாரங்கள்',
      disclaimer: 'கல்வி மற்றும் விளக்க நோக்கங்களுக்காக மட்டுமே.'
    }
  }
};

locales.forEach(lang => {
  const filePath = path.join(i18nDir, `${lang}.json`);
  if (fs.existsSync(filePath)) {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    // Merge nested missing keys
    Object.keys(missingKeys).forEach(category => {
      if (!data[category]) data[category] = {};
      Object.keys(missingKeys[category][lang]).forEach(key => {
        data[category][key] = missingKeys[category][lang][key];
      });
    });

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`Updated ${lang}.json`);
  }
});
