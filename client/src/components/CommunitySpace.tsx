import { useState } from 'react';
import type { UserProfile } from '../types';
import { t, type Locale } from '../translations';
import { API_URL } from '../config';
import LoadingDots from './LoadingDots';

interface CommunitySpaceProps {
  profile: UserProfile;
  deviceId: string;
  locale: Locale;
}

interface ParsedDiscussion {
  westernMedical?: string;
  tcm?: string;
  malayTraditional?: string;
  commonGround?: string;
  disclaimer?: string;
  rawText?: string;
}

export default function CommunitySpace({ profile, locale }: CommunitySpaceProps) {
  const [topic, setTopic] = useState('');
  const [discussion, setDiscussion] = useState('');
  const [loading, setLoading] = useState(false);

  // Build all topics and shuffle on mount — 6 shown, different every visit
  const [displayedTopics] = useState(() => {
    const all = [
      { icon: 'groups',            key: 'topicManagingVisitors' },
      { icon: 'nightlight',        key: 'topicNightFeeding' },
      { icon: 'work',              key: 'topicReturningWork' },
      { icon: 'family_restroom',   key: 'topicPartnerInvolvement' },
      { icon: 'restaurant',        key: 'topicTraditionalFoods' },
      { icon: 'self_improvement',  key: 'topicSelfCare' },
      { icon: 'mood_bad',          key: 'topicBabyBlues' },
      { icon: 'child_care',        key: 'topicBreastfeedingChallenges' },
      { icon: 'favorite',          key: 'topicBodyImage' },
      { icon: 'bedtime',           key: 'topicSleepDeprivation' },
      { icon: 'people',            key: 'topicRelationshipChanges' },
      { icon: 'spa',               key: 'topicConfinementPractices' },
      { icon: 'healing',           key: 'topicPainManagement' },
      { icon: 'psychology',        key: 'topicMoodSwings' },
      { icon: 'volunteer_activism',key: 'topicBondingWithBaby' },
      { icon: 'directions_run',    key: 'topicExerciseRecovery' },
      { icon: 'nutrition',         key: 'topicDietNutrition' },
      { icon: 'sentiment_worried', key: 'topicAnxiety' },
    ].map(item => ({ icon: item.icon, text: t(locale, item.key as any) }));

    // Fisher-Yates shuffle
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all.slice(0, 6);
  });

  const parseDiscussion = (content: string): ParsedDiscussion => {
    const parsed: ParsedDiscussion = {};
    
    // Clean up markdown
    const cleanText = (text: string) => {
      return text
        .replace(/\*\*/g, '')
        .replace(/##\s*/g, '')
        .replace(/#\s*/g, '')
        .trim();
    };
    
    // Define headers in all languages for matching
    const westernHeaders = ['Western Medical Perspective', '西医观点', 'Perspektif Perubatan Barat'];
    const tcmHeaders = ['Traditional Chinese Medicine', '中医观点', 'Perubatan Tradisional Cina'];
    const malayHeaders = ['Malay Traditional Practices', '马来传统习俗', 'Amalan Tradisional Melayu'];
    const commonHeaders = ['Common Ground', '共同点', 'Persamaan'];
    
    // Create regex patterns that match any language version
    const westernPattern = new RegExp(`\\*\\*(${westernHeaders.join('|')})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*|$)`, 's');
    const tcmPattern = new RegExp(`\\*\\*(${tcmHeaders.join('|')})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*|$)`, 's');
    const malayPattern = new RegExp(`\\*\\*(${malayHeaders.join('|')})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*|$)`, 's');
    const commonPattern = new RegExp(`\\*\\*(${commonHeaders.join('|')})\\*\\*\\s*\\n(.*?)(?=\\n\\*\\*|Disclaimer|Note:|$)`, 'si');
    
    // Extract Western Medical Perspective
    const westernMatch = content.match(westernPattern);
    if (westernMatch) {
      parsed.westernMedical = cleanText(westernMatch[2]);
    }
    
    // Extract Traditional Chinese Medicine
    const tcmMatch = content.match(tcmPattern);
    if (tcmMatch) {
      parsed.tcm = cleanText(tcmMatch[2]);
    }
    
    // Extract Malay Traditional Practices
    const malayMatch = content.match(malayPattern);
    if (malayMatch) {
      parsed.malayTraditional = cleanText(malayMatch[2]);
    }
    
    // Extract Common Ground
    const commonMatch = content.match(commonPattern);
    if (commonMatch) {
      parsed.commonGround = cleanText(commonMatch[2]);
    }
    
    // Extract disclaimer
    const disclaimerMatch = content.match(/(Disclaimer|Note:|Important)[\s:]*(.*)$/si);
    if (disclaimerMatch) {
      parsed.disclaimer = cleanText(disclaimerMatch[2]);
    }
    
    // If no structured content found, use raw text
    if (!parsed.westernMedical && !parsed.tcm && !parsed.malayTraditional && !parsed.commonGround) {
      parsed.rawText = cleanText(content);
    }
    
    return parsed;
  };

  const handleSubmit = async () => {
    if (!topic.trim()) return;

    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/community-discussion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic,
          locale: profile.locale
        })
      });

      const data = await response.json();
      setDiscussion(data.discussion);
    } catch (err) {
      console.error('Discussion error:', err);
    } finally {
      setLoading(false);
    }
  };

  const suggestedTopics = displayedTopics;

  return (
    <div className="max-w-4xl mx-auto pb-24 md:pb-0">
      {/* Header */}
      <div className="mb-section-margin stagger-1">
        <h1 className="font-display-lg text-display-lg text-primary mb-2 flex items-center gap-3">
          <span className="material-symbols-outlined text-5xl">groups</span>
          {t(locale, 'communitySpaceTitle')}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant">
          {t(locale, 'communitySpaceDesc')}
        </p>
      </div>

      {/* Topic Input Card */}
      <div className="glass-card gradient-border rounded-xl p-6 mb-6 stagger-2">
        <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined">chat</span>
          {t(locale, 'whatToExplore')}
        </h2>
        
        <textarea
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder={t(locale, 'topicPlaceholder')}
          rows={4}
          className="w-full p-4 rounded-xl border-2 border-outline-variant bg-surface text-on-surface font-body-md text-body-md focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all resize-none"
        />

        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSubmit}
            disabled={loading || !topic.trim()}
            className="btn-3d text-on-primary font-label-sm text-label-sm px-8 py-3 rounded-full flex items-center justify-center gap-2 min-h-touch-target-min disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                {t(locale, 'generating')}<LoadingDots />
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">forum</span>
                {t(locale, 'explorePerspectives')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Suggested Topics */}
      {!discussion && (
        <div className="glass-card rounded-xl p-6 mb-6 stagger-3">
          <h3 className="font-headline-md text-[18px] text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">lightbulb</span>
            {t(locale, 'suggestedTopics')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedTopics.map((suggested, i) => (
              <button
                key={i}
                onClick={() => setTopic(suggested.text)}
                className="p-4 rounded-xl bg-surface-variant text-on-surface-variant border border-outline-variant/30 hover:bg-surface-container hover:border-primary transition-all text-left flex items-center gap-3 min-h-[touch-target-min]"
              >
                <span className="material-symbols-outlined text-primary">{suggested.icon}</span>
                <span className="font-body-md text-body-md">{suggested.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Discussion Result */}
      {discussion && (() => {
        const parsed = parseDiscussion(discussion);
        
        return (
          <div className="space-y-6 stagger-3">
            <div className="mb-4 p-4 rounded-xl bg-primary/10 border-l-4 border-primary">
              <span className="font-label-sm text-label-sm text-primary">{t(locale, 'topicLabel')}</span>
              <p className="font-body-md text-body-md text-on-surface mt-1">{topic}</p>
            </div>

            {/* Structured View */}
            {!parsed.rawText && (
              <>
                {/* Western Medical Perspective */}
                {parsed.westernMedical && (
                  <div className="glass-card rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary text-3xl">medical_services</span>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                          {t(locale, 'westernMedicalPerspective')}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                          {parsed.westernMedical}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Traditional Chinese Medicine */}
                {parsed.tcm && (
                  <div className="glass-card rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-secondary text-3xl">spa</span>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-secondary mb-2">
                          {t(locale, 'traditionalChineseMedicine')}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                          {parsed.tcm}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Malay Traditional Practices */}
                {parsed.malayTraditional && (
                  <div className="glass-card rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-tertiary text-3xl">self_improvement</span>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-tertiary mb-2">
                          {t(locale, 'malayTraditionalPractices')}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                          {parsed.malayTraditional}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common Ground */}
                {parsed.commonGround && (
                  <div className="glass-card rounded-xl p-6 bg-gradient-to-r from-primary/5 to-secondary/5 border-l-4 border-primary">
                    <div className="flex items-start gap-4">
                      <span className="material-symbols-outlined text-primary text-3xl">favorite</span>
                      <div>
                        <h3 className="font-headline-sm text-headline-sm text-primary mb-2">
                          {t(locale, 'commonGround')}
                        </h3>
                        <p className="font-body-md text-body-md text-on-surface leading-relaxed">
                          {parsed.commonGround}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Disclaimer */}
                {parsed.disclaimer && (
                  <div className="glass-card rounded-xl p-4 bg-tertiary/5 border-l-4 border-tertiary">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-tertiary text-xl">info</span>
                      <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">
                        {parsed.disclaimer}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Fallback Text View */}
            {parsed.rawText && (
              <div className="glass-card rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="font-headline-md text-headline-md text-primary flex items-center gap-2">
                    <span className="material-symbols-outlined">forum</span>
                    {t(locale, 'multiPerspectiveDiscussion')}
                  </h2>
                  <button
                    onClick={() => {
                      setDiscussion('');
                      setTopic('');
                    }}
                    className="text-on-surface-variant hover:text-on-surface transition-colors"
                  >
                    <span className="material-symbols-outlined">close</span>
                  </button>
                </div>

                <div className="prose prose-slate max-w-none">
                  <div className="font-body-md text-body-md text-on-surface whitespace-pre-wrap leading-relaxed">
                    {parsed.rawText}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => {
                  setDiscussion('');
                  setTopic('');
                }}
                className="btn-3d text-on-primary font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min"
              >
                <span className="material-symbols-outlined">add</span>
                {t(locale, 'exploreAnotherTopic')}
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(discussion);
                }}
                className="btn-3d-secondary text-on-surface font-label-sm text-label-sm px-6 py-3 rounded-full flex items-center gap-2 min-h-touch-target-min"
              >
                <span className="material-symbols-outlined">content_copy</span>
                {t(locale, 'copyDiscussion')}
              </button>
            </div>
          </div>
        );
      })()}

      {/* Info Card */}
      <div className="mt-6 glass-card rounded-xl p-6 border-l-4 border-secondary stagger-4">
        <div className="flex items-start gap-4">
          <span className="material-symbols-outlined text-secondary text-3xl">info</span>
          <div>
            <h3 className="font-headline-md text-[18px] text-on-surface mb-2">
              {t(locale, 'aboutCommunityPerspectives')}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {t(locale, 'communityPerspectivesDesc')}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
