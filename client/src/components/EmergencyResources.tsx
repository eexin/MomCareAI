import { useState, useEffect } from 'react';

interface EmergencyResourcesProps {
  locale: 'en' | 'zh' | 'ms';
  emergencyContact?: string;
  emergencyPhone?: string;
}

interface Hospital {
  name: string;
  address: string;
  distance: number;
  lat: number;
  lng: number;
}

interface CountryNumbers {
  country: string;
  ambulance: string;
  maternalHotline: { name: string; number: string; desc: string } | null;
  crisisLine: { name: string; number: string; desc: string } | null;
}

// Emergency numbers by country code
const COUNTRY_NUMBERS: Record<string, CountryNumbers> = {
  MY: {
    country: 'Malaysia',
    ambulance: '999',
    maternalHotline: { name: 'Maternal Health Hotline', number: '15555', desc: '24/7 pregnancy & postpartum support' },
    crisisLine: { name: 'Mental Health Crisis Line', number: '15999', desc: 'Emotional support & counseling' },
  },
  SG: {
    country: 'Singapore',
    ambulance: '995',
    maternalHotline: { name: 'KKH Women\'s Helpline', number: '6294-4050', desc: '24/7 women\'s health support' },
    crisisLine: { name: 'Samaritans of Singapore', number: '1767', desc: '24/7 emotional support' },
  },
  AU: {
    country: 'Australia',
    ambulance: '000',
    maternalHotline: { name: 'PANDA Helpline', number: '1300-726-306', desc: 'Perinatal anxiety & depression support' },
    crisisLine: { name: 'Lifeline', number: '13-11-14', desc: '24/7 crisis support' },
  },
  GB: {
    country: 'United Kingdom',
    ambulance: '999',
    maternalHotline: { name: 'Association for Post Natal Illness', number: '0207-386-0868', desc: 'Postnatal illness support' },
    crisisLine: { name: 'Samaritans', number: '116-123', desc: '24/7 emotional support' },
  },
  US: {
    country: 'United States',
    ambulance: '911',
    maternalHotline: { name: 'Postpartum Support International', number: '1-800-944-4773', desc: 'Postpartum mental health support' },
    crisisLine: { name: 'Crisis & Suicide Lifeline', number: '988', desc: '24/7 mental health crisis support' },
  },
  CA: {
    country: 'Canada',
    ambulance: '911',
    maternalHotline: { name: 'Pacific Postpartum Support', number: '1-855-255-7999', desc: 'Postpartum support line' },
    crisisLine: { name: 'Crisis Services Canada', number: '1-833-456-4566', desc: '24/7 crisis support' },
  },
  NZ: {
    country: 'New Zealand',
    ambulance: '111',
    maternalHotline: { name: 'Perinatal Anxiety & Depression NZ', number: '0800-873-776', desc: 'Perinatal mental health support' },
    crisisLine: { name: 'Lifeline', number: '0800-543-354', desc: '24/7 crisis support' },
  },
  ID: {
    country: 'Indonesia',
    ambulance: '118',
    maternalHotline: { name: 'Hotline Kesehatan Ibu', number: '119', desc: 'Layanan kesehatan 24/7' },
    crisisLine: { name: 'Into The Light', number: '119 ext 8', desc: 'Dukungan kesehatan mental' },
  },
  PH: {
    country: 'Philippines',
    ambulance: '911',
    maternalHotline: { name: 'DOH Health Hotline', number: '1555', desc: '24/7 health support' },
    crisisLine: { name: 'In Touch Crisis Line', number: '893-7603', desc: 'Mental health crisis support' },
  },
  IN: {
    country: 'India',
    ambulance: '108',
    maternalHotline: { name: 'iCall', number: '9152987821', desc: 'Mental health helpline' },
    crisisLine: { name: 'Vandrevala Foundation', number: '1860-2662-345', desc: '24/7 mental health support' },
  },
};

// Default fallback
const DEFAULT_NUMBERS: CountryNumbers = {
  country: '',
  ambulance: '112', // International emergency number
  maternalHotline: null,
  crisisLine: null,
};

const UI = {
  en: {
    title: 'Emergency Resources',
    subtitle: 'Quick access when you need help',
    emergencyContactsTitle: 'Emergency Contacts',
    yourEmergencyContact: 'Your Emergency Contact',
    notProvided: 'Not provided',
    noNumber: 'No number',
    physicalWarningSignsTitle: 'Physical Warning Signs',
    mentalHealthWarningSignsTitle: 'Mental Health Warning Signs',
    ambulanceLabel: 'Ambulance',
    ambulanceDesc: 'Emergency medical transport',
    nearestHospital: 'Nearest Hospital',
    findingLocation: 'Detecting your location...',
    distance: 'Distance',
    getDirections: 'Get Directions',
    locationDenied: 'Location access denied. Enable location services to find nearby hospitals and get local emergency numbers.',
    locationUnsupported: 'Location services not supported by your browser.',
    detectedCountry: 'Detected country',
    physicalSigns: [
      'Heavy bleeding (soaking through a pad in an hour)',
      'Fever above 38°C (100.4°F)',
      'Severe abdominal pain',
      'Foul-smelling discharge',
      'Swollen, red, painful breast with fever',
      'Severe headache with blurred vision',
      'Chest pain or difficulty breathing',
      'Leg pain with swelling (one leg only)',
    ],
    mentalSigns: [
      'Thoughts of harming yourself or baby',
      'Severe anxiety or panic attacks',
      'Inability to care for yourself or baby',
      'Hallucinations or delusions',
      'Feeling disconnected from baby for more than 2 weeks',
    ],
  },
  zh: {
    title: '紧急资源',
    subtitle: '需要帮助时快速访问',
    emergencyContactsTitle: '紧急联系人',
    yourEmergencyContact: '您的紧急联系人',
    notProvided: '未提供',
    noNumber: '无号码',
    physicalWarningSignsTitle: '身体警告信号',
    mentalHealthWarningSignsTitle: '心理健康警告信号',
    ambulanceLabel: '救护车',
    ambulanceDesc: '紧急医疗运输',
    nearestHospital: '最近的医院',
    findingLocation: '正在检测您的位置...',
    distance: '距离',
    getDirections: '获取路线',
    locationDenied: '位置访问被拒绝。请启用位置服务以查找附近的医院并获取当地紧急号码。',
    locationUnsupported: '您的浏览器不支持位置服务。',
    detectedCountry: '检测到的国家',
    physicalSigns: [
      '大量出血（一小时内浸透卫生巾）',
      '发烧超过38°C',
      '严重腹痛',
      '恶臭分泌物',
      '乳房肿胀、发红、疼痛并伴有发烧',
      '严重头痛伴视力模糊',
      '胸痛或呼吸困难',
      '腿部疼痛伴肿胀（仅一条腿）',
    ],
    mentalSigns: [
      '有伤害自己或婴儿的想法',
      '严重焦虑或恐慌发作',
      '无法照顾自己或婴儿',
      '幻觉或妄想',
      '与婴儿感到疏离超过2周',
    ],
  },
  ms: {
    title: 'Sumber Kecemasan',
    subtitle: 'Akses pantas bila anda perlukan bantuan',
    emergencyContactsTitle: 'Kenalan Kecemasan',
    yourEmergencyContact: 'Kenalan Kecemasan Anda',
    notProvided: 'Tidak disediakan',
    noNumber: 'Tiada nombor',
    physicalWarningSignsTitle: 'Tanda Amaran Fizikal',
    mentalHealthWarningSignsTitle: 'Tanda Amaran Kesihatan Mental',
    ambulanceLabel: 'Ambulans',
    ambulanceDesc: 'Pengangkutan perubatan kecemasan',
    nearestHospital: 'Hospital Terdekat',
    findingLocation: 'Mengesan lokasi anda...',
    distance: 'Jarak',
    getDirections: 'Dapatkan Arah',
    locationDenied: 'Akses lokasi ditolak. Aktifkan perkhidmatan lokasi untuk mencari hospital berdekatan dan mendapatkan nombor kecemasan tempatan.',
    locationUnsupported: 'Perkhidmatan lokasi tidak disokong oleh pelayar anda.',
    detectedCountry: 'Negara dikesan',
    physicalSigns: [
      'Pendarahan berat (pad penuh dalam sejam)',
      'Demam melebihi 38°C',
      'Sakit perut yang teruk',
      'Pelepasan berbau busuk',
      'Payudara bengkak, merah, sakit dengan demam',
      'Sakit kepala teruk dengan penglihatan kabur',
      'Sakit dada atau kesukaran bernafas',
      'Sakit kaki dengan bengkak (satu kaki sahaja)',
    ],
    mentalSigns: [
      'Fikiran untuk mencederakan diri atau bayi',
      'Kebimbangan atau serangan panik yang teruk',
      'Tidak dapat menjaga diri atau bayi',
      'Halusinasi atau khayalan',
      'Berasa terpisah dari bayi lebih dari 2 minggu',
    ],
  },
};

// Translate hotline/crisis names when locale is zh or ms
function translateContactName(name: string, locale: 'en' | 'zh' | 'ms'): string {
  if (locale === 'en') return name;
  const map: Record<string, { zh: string; ms: string }> = {
    'Maternal Health Hotline':        { zh: '母婴健康热线',       ms: 'Talian Kesihatan Ibu' },
    'Mental Health Crisis Line':      { zh: '心理健康危机热线',   ms: 'Talian Krisis Kesihatan Mental' },
    '24/7 pregnancy & postpartum support': { zh: '24/7 孕期和产后支持', ms: 'Sokongan kehamilan & selepas bersalin 24/7' },
    'Emotional support & counseling': { zh: '情感支持和咨询',     ms: 'Sokongan emosi & kaunseling' },
  };
  return map[name]?.[locale] ?? name;
}

function translateContactDesc(desc: string, locale: 'en' | 'zh' | 'ms'): string {
  if (locale === 'en') return desc;
  const map: Record<string, { zh: string; ms: string }> = {
    '24/7 pregnancy & postpartum support': { zh: '24/7 孕期和产后支持', ms: 'Sokongan kehamilan & selepas bersalin 24/7' },
    'Emotional support & counseling':      { zh: '情感支持和咨询',     ms: 'Sokongan emosi & kaunseling' },
    'Emergency medical transport':         { zh: '紧急医疗运输',       ms: 'Pengangkutan perubatan kecemasan' },
  };
  return map[desc]?.[locale] ?? desc;
}

export default function EmergencyResources({ locale, emergencyContact, emergencyPhone }: EmergencyResourcesProps) {
  const [nearestHospital, setNearestHospital] = useState<Hospital | null>(null);
  const [locationError, setLocationError] = useState<string>('');
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [countryNumbers, setCountryNumbers] = useState<CountryNumbers>(DEFAULT_NUMBERS);

  const t = UI[locale];

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  useEffect(() => {
    if (!('geolocation' in navigator)) {
      setLocationError(t.locationUnsupported);
      return;
    }

    setLoadingLocation(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        try {
          // 1. Reverse geocode to get country code
          const geoRes = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const geoData = await geoRes.json();
          const countryCode: string = geoData.address?.country_code?.toUpperCase() ?? '';
          setCountryNumbers(COUNTRY_NUMBERS[countryCode] ?? DEFAULT_NUMBERS);

          // 2. Find nearest hospital via Overpass API, then reverse-geocode for full address
          const query = `[out:json];(node["amenity"="hospital"](around:10000,${lat},${lng});way["amenity"="hospital"](around:10000,${lat},${lng}););out center 5;`;
          const ovRes = await fetch('https://overpass-api.de/api/interpreter', {
            method: 'POST',
            body: query,
          });
          const ovData = await ovRes.json();

          if (ovData.elements?.length > 0) {
            // Build candidates with distance
            const candidates: Hospital[] = ovData.elements
              .map((el: any) => {
                const hLat = el.lat ?? el.center?.lat;
                const hLng = el.lon ?? el.center?.lon;
                if (!hLat || !hLng) return null;

                // Build address from OSM tags first (may be partial)
                const tags = el.tags ?? {};
                const osmParts = [
                  tags['addr:housenumber'] && tags['addr:street']
                    ? `${tags['addr:housenumber']} ${tags['addr:street']}`
                    : tags['addr:street'],
                  tags['addr:city'] ?? tags['addr:town'],
                  tags['addr:postcode'],
                ].filter(Boolean);

                return {
                  name: tags.name ?? (locale === 'zh' ? '医院' : 'Hospital'),
                  address: osmParts.join(', '),   // may be empty — filled below
                  distance: calculateDistance(lat, lng, hLat, hLng),
                  lat: hLat,
                  lng: hLng,
                };
              })
              .filter((h: Hospital | null): h is Hospital => h !== null && h.distance < 50);

            candidates.sort((a, b) => a.distance - b.distance);

            if (candidates.length > 0) {
              const nearest = candidates[0];

              // If OSM tags gave no address, reverse-geocode the hospital's coordinates
              if (!nearest.address) {
                try {
                  const revRes = await fetch(
                    `https://nominatim.openstreetmap.org/reverse?lat=${nearest.lat}&lon=${nearest.lng}&format=json&addressdetails=1`,
                    { headers: { 'Accept-Language': 'en', 'User-Agent': 'MumCareApp/1.0' } }
                  );
                  const revData = await revRes.json();
                  const addr = revData.address ?? {};

                  // Use the hospital name from Nominatim if OSM had none
                  if (!nearest.name || nearest.name === 'Hospital' || nearest.name === '医院') {
                    nearest.name = revData.name || revData.display_name?.split(',')[0] || nearest.name;
                  }

                  const parts = [
                    addr.house_number && addr.road
                      ? `${addr.house_number} ${addr.road}`
                      : addr.road,
                    addr.suburb ?? addr.neighbourhood ?? addr.quarter,
                    addr.city ?? addr.town ?? addr.village,
                    addr.postcode,
                  ].filter(Boolean);

                  nearest.address = parts.join(', ');
                } catch (_) {
                  // reverse geocode failed — address stays empty, that's fine
                }
              }

              setNearestHospital(nearest);
            }
          }
        } catch (err) {
          console.error('Location lookup error:', err);
        } finally {
          setLoadingLocation(false);
        }
      },
      (err) => {
        setLoadingLocation(false);
        setLocationError(err.code === err.PERMISSION_DENIED ? t.locationDenied : t.locationUnsupported);
      }
    );
  }, [locale]);

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-section-margin">
        <h1 className="font-display-lg text-display-lg text-error mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-5xl">emergency</span>
          {t.title}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">{t.subtitle}</p>
      </div>

      {/* Emergency Contacts */}
      <section className="glass-card rounded-xl p-6 mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">call</span>
          {t.emergencyContactsTitle}
        </h2>

        {/* Ambulance — always shown, number updates once location resolves */}
        <div className="mb-4 p-5 rounded-xl bg-error text-on-error shadow-lg flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <span className="material-symbols-outlined text-5xl">ambulance</span>
            <div>
              <div className="font-headline-md text-headline-md mb-0.5">{t.ambulanceLabel}</div>
              <div className="font-body-md text-[13px] opacity-90">{t.ambulanceDesc}</div>
              {countryNumbers.country && (
                <div className="font-body-md text-[12px] opacity-75 mt-0.5">
                  {t.detectedCountry}: {countryNumbers.country}
                </div>
              )}
            </div>
          </div>
          <a
            href={`tel:${countryNumbers.ambulance}`}
            className="bg-on-error text-error font-headline-lg text-headline-lg px-8 py-4 rounded-full flex items-center gap-3 min-h-touch-target-min hover:shadow-xl transition-shadow whitespace-nowrap"
          >
            <span className="material-symbols-outlined text-3xl">call</span>
            {loadingLocation ? '...' : countryNumbers.ambulance}
          </a>
        </div>

        {/* Location loading */}
        {loadingLocation && (
          <div className="mb-4 p-4 rounded-xl bg-surface-variant border border-outline-variant/30 flex items-center gap-3">
            <span className="material-symbols-outlined animate-pulse text-primary">location_searching</span>
            <span className="font-body-md text-body-md text-on-surface-variant">{t.findingLocation}</span>
          </div>
        )}

        {/* Nearest Hospital */}
        {nearestHospital && !loadingLocation && (
          <div className="mb-4 p-4 rounded-xl bg-primary/10 border-2 border-primary">
            <div className="flex items-start gap-3 mb-3">
              <span className="material-symbols-outlined text-primary text-2xl shrink-0">local_hospital</span>
              <div className="flex-1">
                <div className="font-label-sm text-label-sm text-primary mb-1">{t.nearestHospital}</div>
                <div className="font-headline-sm text-headline-sm text-on-surface mb-1">{nearestHospital.name}</div>
                {nearestHospital.address && (
                  <div className="font-body-md text-[13px] text-on-surface-variant mb-1">{nearestHospital.address}</div>
                )}
                <div className="font-body-md text-[13px] text-primary">
                  {t.distance}: {nearestHospital.distance.toFixed(1)} km
                </div>
              </div>
            </div>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${nearestHospital.lat},${nearestHospital.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min w-full sm:w-auto justify-center"
            >
              <span className="material-symbols-outlined">directions</span>
              {t.getDirections}
            </a>
          </div>
        )}

        {/* Location error */}
        {locationError && !loadingLocation && (
          <div className="mb-4 p-4 rounded-xl bg-tertiary/10 border border-tertiary/30 flex items-start gap-3">
            <span className="material-symbols-outlined text-tertiary shrink-0">info</span>
            <span className="font-body-md text-[13px] text-on-surface-variant">{locationError}</span>
          </div>
        )}

        {/* Personal emergency contact */}
        {emergencyContact && emergencyContact !== 'Not provided' && emergencyPhone ? (
          <div className="mb-4 p-4 rounded-xl bg-primary/10 border-2 border-primary flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="font-label-sm text-label-sm text-primary mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">person</span>
                {t.yourEmergencyContact}
              </div>
              <div className="font-body-md text-body-md text-on-surface">{emergencyContact}</div>
            </div>
            <a
              href={`tel:${emergencyPhone}`}
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min"
            >
              <span className="material-symbols-outlined">call</span>
              {emergencyPhone}
            </a>
          </div>
        ) : (
          <div className="mb-4 p-4 rounded-xl bg-surface-variant/50 border-2 border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 opacity-60">
            <div>
              <div className="font-label-sm text-label-sm text-on-surface-variant mb-1 flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">person</span>
                {t.yourEmergencyContact}
              </div>
              <div className="font-body-md text-body-md text-on-surface-variant italic">
                {t.notProvided}
              </div>
            </div>
            <div className="bg-surface-variant text-on-surface-variant font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 cursor-not-allowed">
              <span className="material-symbols-outlined">call</span>
              {t.noNumber}
            </div>
          </div>
        )}

        {/* Maternal Hotline */}
        {countryNumbers.maternalHotline && !loadingLocation && (
          <div className="mb-3 p-4 rounded-xl bg-surface border border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-label-sm text-label-sm text-on-surface mb-1">
                {translateContactName(countryNumbers.maternalHotline.name, locale)}
              </div>
              <div className="font-body-md text-[13px] text-on-surface-variant">
                {translateContactDesc(countryNumbers.maternalHotline.desc, locale)}
              </div>
            </div>
            <a
              href={`tel:${countryNumbers.maternalHotline.number}`}
              className="bg-secondary text-on-secondary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min hover:shadow-lg transition-shadow whitespace-nowrap"
            >
              <span className="material-symbols-outlined">call</span>
              {countryNumbers.maternalHotline.number}
            </a>
          </div>
        )}

        {/* Crisis Line */}
        {countryNumbers.crisisLine && !loadingLocation && (
          <div className="p-4 rounded-xl bg-surface border border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex-1">
              <div className="font-label-sm text-label-sm text-on-surface mb-1">
                {translateContactName(countryNumbers.crisisLine.name, locale)}
              </div>
              <div className="font-body-md text-[13px] text-on-surface-variant">
                {translateContactDesc(countryNumbers.crisisLine.desc, locale)}
              </div>
            </div>
            <a
              href={`tel:${countryNumbers.crisisLine.number}`}
              className="bg-tertiary text-on-tertiary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min hover:shadow-lg transition-shadow whitespace-nowrap"
            >
              <span className="material-symbols-outlined">call</span>
              {countryNumbers.crisisLine.number}
            </a>
          </div>
        )}
      </section>

      {/* Physical Warning Signs */}
      <section className="glass-card rounded-xl p-6 mb-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">warning</span>
          {t.physicalWarningSignsTitle}
        </h2>
        <ul className="space-y-2">
          {t.physicalSigns.map((sign, i) => (
            <li key={i} className="p-3 rounded-lg bg-tertiary/10 border-l-4 border-tertiary font-body-md text-body-md text-on-surface flex items-start gap-3">
              <span className="material-symbols-outlined text-tertiary text-[20px] mt-0.5">error</span>
              {sign}
            </li>
          ))}
        </ul>
      </section>

      {/* Mental Health Warning Signs */}
      <section className="glass-card rounded-xl p-6">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">psychology</span>
          {t.mentalHealthWarningSignsTitle}
        </h2>
        <ul className="space-y-2">
          {t.mentalSigns.map((sign, i) => (
            <li key={i} className="p-3 rounded-lg bg-secondary/10 border-l-4 border-secondary font-body-md text-body-md text-on-surface flex items-start gap-3">
              <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">error</span>
              {sign}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
