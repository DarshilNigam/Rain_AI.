import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Send, Bot, User, Wheat, MapPin, Droplets, Info, Settings } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { useI18n } from '../../../i18n';
import { farmerAiService } from '../../../services/farmerAi.service';
import { FarmerOnboardingPage } from '../onboarding/FarmerOnboardingPage';
import styles from './FarmerAiPage.module.css';

interface ChatMsg {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
}

export const FarmerAiPage: React.FC = () => {
  const navigate = useNavigate();
  const { farmProfile, farmerLocation, farmLocationAsUserLocation, activeCrop, isProfileComplete } = useFarmerContext();
  const { weatherData } = useWeatherData(farmLocationAsUserLocation);
  const { language } = useI18n();

  // If farmer profile or location is unassigned for current user, show onboarding form immediately
  if (!isProfileComplete) {
    return <FarmerOnboardingPage />;
  }

  const curr = weatherData?.current;
  const next24h = weatherData?.hourly.slice(0, 24) || [];
  const rain24hSum = next24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);

  const buildInitialGreeting = (loc: typeof farmerLocation, crop: typeof activeCrop, profile: typeof farmProfile, weather: typeof weatherData): string => {
    const c = weather?.current;
    const n24 = weather?.hourly.slice(0, 24) || [];
    const r24 = n24.reduce((sum, h) => sum + (h.precipitation || 0), 0);
    const p24 = n24.reduce((max, h) => Math.max(max, h.precipitationProbability || 0), 0);

    return language === 'hi'
      ? `नमस्ते ${profile.farmerName}! मैं R.A.I. किसान AI सहायक हूँ। मैं आपके खेत (${loc.village}, ${loc.district}), आपकी फसल **${crop.name}** (${crop.currentStage} अवस्था) और लाइव मौसम डेटा से जुड़ा हूँ।\n\nवर्तमान में ${loc.district} में तापमान **${c ? c.temperature.toFixed(1) : '31'}°C**, बारिश **${c ? c.precipitation : 0} मिमी**, और 24 घंटे में अनुमानित बारिश **${r24.toFixed(1)} मिमी** (${p24}% संभावना) है। आज आप अपनी खेती के लिए क्या मार्गदर्शन चाहते हैं?`
      : `Namaste ${profile.farmerName}! I am R.A.I. Farmer AI. I am synchronized with your farm in ${loc.village}, ${loc.district} (${loc.latitude.toFixed(2)}°N, ${loc.longitude.toFixed(2)}°E), your active crop **${crop.name}** at the **${crop.currentStage}** stage, and live Open-Meteo observations.\n\nCurrently in ${loc.district}, temperature is **${c ? c.temperature.toFixed(1) : '31'}°C**, rainfall is **${c ? c.precipitation : 0} mm**, and 24h expected accumulation is **${r24.toFixed(1)} mm** (${p24}% peak probability). How can I assist your field operations today?`;
  };

  const [messages, setMessages] = useState<readonly ChatMsg[]>(() => [
    {
      id: 'msg-init',
      role: 'assistant',
      content: buildInitialGreeting(farmerLocation, activeCrop, farmProfile, weatherData),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  // Reactive Chat Memory: whenever farm location updates in the active session, reset/update the conversation context
  useEffect(() => {
    const updatedGreeting: ChatMsg = {
      id: `msg-loc-sync-${Date.now()}`,
      role: 'assistant',
      content: language === 'hi'
        ? `📍 **खेत स्थान अद्यतन:** मैं अब इस बातचीत के लिए आपके खेत स्थान **${farmerLocation.village}, ${farmerLocation.district}** (${farmerLocation.latitude.toFixed(2)}°N, ${farmerLocation.longitude.toFixed(2)}°E) का उपयोग कर रहा हूँ। लाइव मौसम टेलीमेट्री को नए निर्देशांकों के साथ ताज़ा कर दिया गया है।`
        : `📍 **Farm Location Synchronized:** I'm now using your farm location: **${farmerLocation.village}, ${farmerLocation.district}** (${farmerLocation.latitude.toFixed(2)}°N, ${farmerLocation.longitude.toFixed(2)}°E) for this conversation.\n\nLive observations and forecasts have been updated for ${farmerLocation.district}. How can I assist your field operations?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([updatedGreeting]);
  }, [farmerLocation.village, farmerLocation.district, farmerLocation.latitude, farmerLocation.longitude, language]);
  const [inputText, setInputText] = useState<string>('');
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const messagesThreadRef = useRef<HTMLDivElement>(null);

  // Keep chat internal scroll isolated without affecting page window scroll
  useEffect(() => {
    if (messagesThreadRef.current) {
      messagesThreadRef.current.scrollTo({
        top: messagesThreadRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = textToSend || inputText;
    if (!query.trim()) return;

    const userMsg: ChatMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInputText('');
    setIsTyping(true);

    // Context-grounded response generation strictly bound to Farmer Location and multi-turn context
    setTimeout(() => {
      const { text } = farmerAiService.generateResponse(query, {
        farmProfile,
        farmerLocation,
        activeCrop,
        weatherData,
        language: language as 'en' | 'hi',
        conversationHistory: [...messages, userMsg],
      });

      const aiMsg: ChatMsg = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        content: text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, aiMsg]);
      setIsTyping(false);
    }, 400);
  };

  const samplePrompts = language === 'hi' ? [
    'मेरे खेत पर मौसम कैसा है?',
    `${activeCrop.name} फसल पर बारिश का क्या असर होगा?`,
    'क्या मुझे कल सिंचाई करनी चाहिए या रोकनी चाहिए?',
    'क्या आज कीटनाशक या पर्णीय छिड़काव करना सुरक्षित है?',
  ] : [
    'What is the weather at my farm?',
    `How might rainfall affect ${activeCrop.name} at ${activeCrop.currentStage}?`,
    'Should I hold or proceed with irrigation tomorrow?',
    'Is the weather suitable for foliar spraying today?',
  ];

  return (
    <div className={styles.pageRoot}>
      <Container size="wide" className={styles.container}>
        <FarmerModuleHeader
          title={language === 'hi' ? 'किसान AI सहायक' : 'Farmer AI Assistant'}
          subtitle={language === 'hi' ? 'लाइव मौसम टेलीमेट्री पर आधारित स्थान-विशिष्ट कृषि परामर्श' : 'Location-grounded agricultural conversation powered by live Open-Meteo telemetry'}
          moduleNumber="INTELLIGENCE CORE"
          icon={<Sparkles size={20} color="#16a34a" />}
        />

        {/* Live Farm Context Header Bar */}
        <div className={styles.contextStrip}>
          <div className={styles.contextItem}>
            <MapPin size={13} color="#16a34a" />
            <span>
              {farmerLocation.formattedAddress} ({farmerLocation.latitude.toFixed(2)}°N, {farmerLocation.longitude.toFixed(2)}°E)
            </span>
          </div>

          <div className={styles.contextItem}>
            <Wheat size={13} color="#0891b2" />
            <span>Active Crop: <strong>{activeCrop.name}</strong> ({activeCrop.currentStage})</span>
          </div>

          <div className={styles.contextItem}>
            <Droplets size={13} color="#0284c7" />
            <span>Live Rain: <strong>{curr ? curr.precipitation : 0} mm</strong> (24h sum: {rain24hSum.toFixed(1)} mm)</span>
          </div>

          <button
            type="button"
            className={styles.updateLocationBtn}
            onClick={() => navigate('/farmer/profile/edit')}
            title="Update Farm Location"
          >
            <Settings size={11} />
            <span>{language === 'hi' ? 'खेत का स्थान बदलें' : 'Update Farm Location'}</span>
          </button>
        </div>

        {/* Chat Conversation Card */}
        <Card variant="default" padding="none" className={styles.chatCard}>
          {/* Thread Container with Isolated Scroll */}
          <div ref={messagesThreadRef} className={styles.messagesThread}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={`${styles.messageRow} ${m.role === 'user' ? styles.userRow : styles.assistantRow}`}
              >
                <div className={styles.avatar}>
                  {m.role === 'user' ? <User size={15} /> : <Bot size={15} />}
                </div>
                <div className={styles.bubble}>
                  <div className={styles.bubbleMeta}>
                    <span className={styles.authorName}>
                      {m.role === 'user' ? farmProfile.farmerName : 'R.A.I. Farmer AI'}
                    </span>
                    <span className={styles.msgTime}>{m.timestamp}</span>
                  </div>
                  <div className={styles.msgText}>{m.content}</div>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className={`${styles.messageRow} ${styles.assistantRow}`}>
                <div className={styles.avatar}>
                  <Bot size={15} />
                </div>
                <div className={styles.typingBubble}>
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                  <div className={styles.dot} />
                </div>
              </div>
            )}
          </div>

          {/* Quick Prompts Suggestions */}
          <div className={styles.promptsBar}>
            <span className={styles.promptsLabel}>Suggested Inquiries:</span>
            <div className={styles.promptsList}>
              {samplePrompts.map((p, i) => (
                <button
                  key={i}
                  type="button"
                  className={styles.promptPill}
                  onClick={() => handleSend(p)}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className={styles.inputArea}
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={`Ask Farmer AI anything about your farm in ${farmerLocation.village} or ${activeCrop.name}...`}
              className={styles.chatInput}
            />
            <button type="submit" className={styles.sendBtn} disabled={!inputText.trim()}>
              <Send size={15} />
              <span>Send</span>
            </button>
          </form>
        </Card>

        {/* Footnote */}
        <div className={styles.footnote}>
          <Info size={13} color="#64748b" />
          <span>
            <strong>Transparency Notice:</strong> Farmer AI provides physical weather telemetry interpretation and standard agronomic best practices for {farmerLocation.formattedAddress}. It does not replace professional agronomic consultation or local agriculture officers.
          </span>
        </div>
      </Container>
    </div>
  );
};
