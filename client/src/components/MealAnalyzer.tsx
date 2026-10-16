import { useState } from 'react';
import type { UserProfile } from '../types';
import { t, type Locale } from '../translations';
import { API_URL } from '../config';
import LoadingDots from './LoadingDots';

interface MealAnalyzerProps {
  profile: UserProfile;
  recoveryStage: number;
  deviceId: string;
  locale: Locale;
}

interface ParsedAnalysis {
  identifiedFoods?: string[];
  nutritionalHighlights?: string[];
  suitability?: { status: string; reason: string };
  suggestions?: string[];
  rawText?: string;
}

export default function MealAnalyzer({ profile, recoveryStage, locale }: MealAnalyzerProps) {
  const [analysis, setAnalysis] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');

  const parseAnalysis = (content: string): ParsedAnalysis => {
    const parsed: ParsedAnalysis = {};
    
    const cleanText = (text: string) => text.replace(/\*\*/g, '').replace(/##\s*/g, '').replace(/\*/g, '').trim();
    
    // Match headers in all 3 languages
    const foodsHeaders = ['Identified Foods', '识别的食物', 'Makanan yang Dikenal Pasti'];
    const highlightsHeaders = ['Nutritional Highlights', '营养亮点', 'Sorotan Pemakanan'];
    const suitabilityHeaders = ['Postpartum Suitability', '产后适宜性', 'Kesesuaian Selepas Bersalin'];
    const suggestionsHeaders = ['Suggestions', '建议', 'Cadangan'];

    const makePattern = (headers: string[], nextHeaders: string[]) => {
      const h = headers.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      const n = nextHeaders.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
      return new RegExp(`\\*\\*(${h})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*(${n})\\*\\*|$)`, 's');
    };

    // Extract Identified Foods
    const foodsMatch = content.match(makePattern(foodsHeaders, highlightsHeaders));
    if (foodsMatch) {
      const foods = foodsMatch[2]
        .split('\n')
        .filter(line => {
          const trimmed = line.trim();
          return (trimmed.startsWith('•') || trimmed.startsWith('-')) && !trimmed.includes(':') && trimmed.length < 60;
        })
        .map(line => cleanText(line.replace(/^[•\-]\s*/, '')))
        .filter(line => line.length > 0);
      if (foods.length > 0) parsed.identifiedFoods = foods;
    }

    // Extract Nutritional Highlights
    const highlightsMatch = content.match(makePattern(highlightsHeaders, suitabilityHeaders));
    if (highlightsMatch) {
      const highlights = highlightsMatch[2]
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map(line => cleanText(line.replace(/^[•\-]\s*/, '')))
        .filter(line => line.length > 0);
      if (highlights.length > 0) parsed.nutritionalHighlights = highlights;
    }

    // Extract Suitability
    const suitabilityMatch = content.match(makePattern(suitabilityHeaders, suggestionsHeaders));
    if (suitabilityMatch) {
      const suitText = cleanText(suitabilityMatch[2]);
      const statusMatch = suitText.match(/(Good|Moderate|Caution)/i);
      if (statusMatch) {
        const status = statusMatch[1].charAt(0).toUpperCase() + statusMatch[1].slice(1).toLowerCase();
        const reason = suitText.replace(/^(Good|Moderate|Caution)[:\s\-]*/i, '').trim();
        parsed.suitability = { status, reason };
      }
    }

    // Extract Suggestions (last section, no next header)
    const suggestionsHeadersEscaped = suggestionsHeaders.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
    const suggestionsMatch = content.match(new RegExp(`\\*\\*(${suggestionsHeadersEscaped})\\*\\*\\s*\\n(.*?)$`, 's'));
    if (suggestionsMatch) {
      const bullets = suggestionsMatch[2]
        .split('\n')
        .filter(line => line.trim().startsWith('•') || line.trim().startsWith('-'))
        .map(line => cleanText(line.replace(/^[•\-]\s*/, '')))
        .filter(line => line.length > 0);
      if (bullets.length > 0) {
        parsed.suggestions = bullets;
      } else {
        const raw = cleanText(suggestionsMatch[2]);
        if (raw.length > 0) parsed.suggestions = [raw];
      }
    }

    if (!parsed.identifiedFoods && !parsed.nutritionalHighlights && !parsed.suitability && !parsed.suggestions) {
      parsed.rawText = cleanText(content);
    }

    return parsed;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setError(t(locale, 'imageTooLarge'));
      return;
    }

    setLoading(true);
    setError('');
    setAnalysis(''); // Clear previous analysis

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64 = reader.result as string;
        setImagePreview(base64);
        
        console.log('Sending image to server...');
        
        const response = await fetch(`${API_URL}/api/meal-analysis`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            recoveryStage,
            deliveryMethod: profile.deliveryMethod,
            locale: profile.locale
          })
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to analyze meal');
        }

        const data = await response.json();
        console.log('Analysis received:', data.analysis?.substring(0, 100));
        
        if (!data.analysis) {
          throw new Error('No analysis returned from server');
        }
        
        setAnalysis(data.analysis);
      } catch (err) {
        console.error('Upload error:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`${t(locale, 'failedToAnalyze')} ${errorMessage}`);
      } finally {
        setLoading(false);
      }
    };

    reader.onerror = () => {
      setError(t(locale, 'failedToAnalyze'));
      setLoading(false);
    };

    reader.readAsDataURL(file);
  };

  const parsed = analysis ? parseAnalysis(analysis) : null;

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-section-margin">
        <h1 className="font-display-lg text-display-lg text-primary mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-5xl">restaurant</span>
          {t(locale, 'mealPhotoAnalyzer')}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {t(locale, 'uploadAnalysisDescription')}
        </p>
      </div>

      {/* Upload Section */}
      <div className="glass-card gradient-border rounded-xl p-8 mb-6 text-center">
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImageUpload}
          disabled={loading}
          id="meal-upload"
          className="hidden"
        />
        
        {!imagePreview ? (
          <label
            htmlFor="meal-upload"
            className="cursor-pointer block"
          >
            <div className="w-24 h-24 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-6xl text-primary">
                add_photo_alternate
              </span>
            </div>
            <h3 className="font-headline-md text-headline-md text-on-surface mb-2">
              {t(locale, 'uploadMealPhoto')}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-4">
              {t(locale, 'takeOrSelectPhoto')}
            </p>
            <div className="inline-flex items-center gap-2 btn-3d text-on-primary font-label-sm text-label-sm px-8 py-3 rounded-full min-h-touch-target-min">
              {loading ? (
                <>
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  {t(locale, 'analyzing')}<LoadingDots />
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">photo_camera</span>
                  {t(locale, 'choosePhoto')}
                </>
              )}
            </div>
          </label>
        ) : (
          <div>
            <img
              src={imagePreview}
              alt="Meal preview"
              className="max-w-full max-h-64 mx-auto rounded-xl mb-4 shadow-lg"
            />
            <label
              htmlFor="meal-upload"
              className="inline-flex items-center gap-2 btn-3d-secondary text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full min-h-touch-target-min cursor-pointer"
            >
              <span className="material-symbols-outlined">refresh</span>
              {t(locale, 'uploadDifferentPhoto')}
            </label>
          </div>
        )}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-error-container text-on-error-container rounded-xl border-l-4 border-error flex items-start gap-3">
          <span className="material-symbols-outlined text-error">error</span>
          <div className="flex-1">
            <p className="font-body-md text-body-md">{error}</p>
            <p className="font-body-md text-[12px] mt-2 opacity-70">
              {t(locale, 'checkConsole')}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="glass-card rounded-xl p-8 text-center">
          <span className="material-symbols-outlined text-6xl text-primary mb-4 block animate-pulse">
            restaurant
          </span>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2 flex items-center justify-center">
            {t(locale, 'analyzingYourMeal')}&nbsp;<LoadingDots />
          </h3>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {t(locale, 'identifyingIngredients')}
          </p>
        </div>
      )}

      {/* Analysis Results - Structured View */}
      {parsed && !loading && !parsed.rawText && (
        <div className="space-y-4">
          {/* Identified Foods */}
          {parsed.identifiedFoods && parsed.identifiedFoods.length > 0 && (
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-primary text-2xl">
                  restaurant_menu
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  {t(locale, 'identifiedFoods')}
                </h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {parsed.identifiedFoods.map((food, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 text-primary font-body-md text-body-md"
                  >
                    {food}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Nutritional Highlights */}
          {parsed.nutritionalHighlights && parsed.nutritionalHighlights.length > 0 && (
            <div className="glass-card rounded-xl p-6">
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-secondary text-2xl">
                  nutrition
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  {t(locale, 'nutritionalHighlights')}
                </h3>
              </div>
              <ul className="space-y-3">
                {parsed.nutritionalHighlights.map((highlight, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-secondary text-[20px] mt-0.5">
                      check_circle
                    </span>
                    <span className="font-body-md text-body-md text-on-surface">
                      {highlight}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suitability */}
          {parsed.suitability && (
            <div className={`glass-card rounded-xl p-6 border-l-4 ${
              parsed.suitability.status.toLowerCase() === 'good' ? 'border-primary bg-primary/5' :
              parsed.suitability.status.toLowerCase() === 'moderate' ? 'border-tertiary bg-tertiary/5' :
              'border-error bg-error/5'
            }`}>
              <div className="flex items-start gap-3">
                <span className={`material-symbols-outlined text-2xl ${
                  parsed.suitability.status.toLowerCase() === 'good' ? 'text-primary' :
                  parsed.suitability.status.toLowerCase() === 'moderate' ? 'text-tertiary' :
                  'text-error'
                }`}>
                  {parsed.suitability.status.toLowerCase() === 'good' ? 'check_circle' :
                   parsed.suitability.status.toLowerCase() === 'moderate' ? 'info' :
                   'warning'}
                </span>
                <div>
                  <h3 className={`font-headline-sm text-headline-sm mb-2 ${
                    parsed.suitability.status.toLowerCase() === 'good' ? 'text-primary' :
                    parsed.suitability.status.toLowerCase() === 'moderate' ? 'text-tertiary' :
                    'text-error'
                  }`}>
                    {t(locale, 'postpartumSuitability')}: {
                      parsed.suitability.status.toLowerCase() === 'good' ? t(locale, 'suitabilityGood') :
                      parsed.suitability.status.toLowerCase() === 'moderate' ? t(locale, 'suitabilityModerate') :
                      t(locale, 'suitabilityCaution')
                    }
                  </h3>
                  <p className="font-body-md text-body-md text-on-surface">
                    {parsed.suitability.reason}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Suggestions */}
          {parsed.suggestions && parsed.suggestions.length > 0 && (
            <div className="glass-card rounded-xl p-6 bg-tertiary/5">
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-tertiary text-2xl">
                  lightbulb
                </span>
                <h3 className="font-headline-md text-headline-md text-on-surface">
                  {t(locale, 'suggestions')}
                </h3>
              </div>
              <ul className="space-y-2">
                {parsed.suggestions.map((suggestion, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-tertiary mt-1">•</span>
                    <span className="font-body-md text-body-md text-on-surface">
                      {suggestion}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-3">
            <label
              htmlFor="meal-upload"
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min cursor-pointer"
            >
              <span className="material-symbols-outlined">add_photo_alternate</span>
              {t(locale, 'analyzeAnotherMeal')}
            </label>
          </div>
        </div>
      )}

      {/* Fallback Text View */}
      {parsed && !loading && parsed.rawText && (
        <div className="space-y-6">
          <div className="glass-card rounded-xl p-6">
            <h2 className="font-headline-md text-headline-md text-primary mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">analytics</span>
              {t(locale, 'nutritionalAnalysis')}
            </h2>
            <div className="prose prose-slate max-w-none">
              <p className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                {parsed.rawText}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <label
              htmlFor="meal-upload"
              className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min cursor-pointer"
            >
              <span className="material-symbols-outlined">add_photo_alternate</span>
              {t(locale, 'analyzeAnotherMeal')}
            </label>
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass-card rounded-xl p-4 border-l-4 border-primary">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-primary text-2xl">
              verified
            </span>
            <div>
              <h4 className="font-label-sm text-label-sm text-on-surface mb-1">
                {t(locale, 'halalAware')}
              </h4>
              <p className="font-body-md text-[13px] text-on-surface-variant">
                {t(locale, 'culturallySensitive')}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border-l-4 border-secondary">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-secondary text-2xl">
              favorite
            </span>
            <div>
              <h4 className="font-label-sm text-label-sm text-on-surface mb-1">
                {t(locale, 'recoveryFocused')}
              </h4>
              <p className="font-body-md text-[13px] text-on-surface-variant">
                {t(locale, 'tailoredForPostpartum')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
