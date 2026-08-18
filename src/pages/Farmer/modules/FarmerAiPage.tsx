import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Send, Bot, User, Wheat, MapPin, Droplets, Info } from 'lucide-react';
import { Container } from '../../../components/ui/Container';
import { Card } from '../../../components/ui/Card';
import { FarmerModuleHeader } from '../components/FarmerModuleHeader';
import { useFarmerContext } from '../../../context/FarmerContext';
import { useWeatherData } from '../../../hooks/useWeatherData';
import { useI18n } from '../../../i18n';
import { farmerAiService } from '../../../services/farmerAi.service';
import styles from './FarmerAiPage.module.css';

interface ChatMsg {
  readonly id: string;
  readonly role: 'user' | 'assistant';
  readonly content: string;
  readonly timestamp: string;
}

export const FarmerAiPage: React.FC = () => {
  const { farmProfile, farmerLocation, farmLocationAsUserLocation, activeCrop } = useFarmerContext();
  const { weatherData } = useWeatherData(farmLocationAsUserLocation);
  const { language } = useI18n();

  const curr = weatherData?.current;
  const next24h = weatherData?.hourly.slice(0, 24) || [];
  const rain24hSum = next24h.reduce((sum, h) => sum + (h.precipitation || 0), 0);
  const maxProb24h = next24h.reduce((max, h) => Math.max(max, h.precipitationProbability || 0), 0);

  const initialMsg: ChatMsg = {
    id: 'msg-init',
    role: 'assistant',
    content: language === 'hi'
      ? `नमस्ते ${farmProfile.farmerName}! मैं R.A.I. किसान AI सहायक हूँ। मैं आपके खेत (${farmerLocation.village}, ${farmerLocation.district}), आपकी फसल **${activeCrop.name}** (${activeCrop.currentStage} अवस्था) और लाइव मौसम डेटा से जुड़ा हूँ।\n\nवर्तमान में ${farmerLocation.district} में तापमान **${curr ? curr.temperature.toFixed(1) : '31'}°C**, बारिश **${curr ? curr.precipitation : 0} मिमी**, और 24 घंटे में अनुमानित बारिश **${rain24hSum.toFixed(1)} मिमी** (${maxProb24h}% संभावना) है। आज आप अपनी खेती के लिए क्या मार्गदर्शन चाहते हैं?`
      : `Namaste ${farmProfile.farmerName}! I am R.A.I. Farmer AI. I am synchronized with your farm in ${farmerLocation.village}, ${farmerLocation.district} (${farmerLocation.latitude.toFixed(2)}°N, ${farmerLocation.longitude.toFixed(2)}°E), your active crop **${activeCrop.name}** at the **${activeCrop.currentStage}** stage, and live Open-Meteo observations.\n\nCurrently in ${farmerLocation.district}, temperature is **${curr ? curr.temperature.toFixed(1) : '31'}°C**, rainfall is **${curr ? curr.precipitation : 0} mm**, and 24h expected accumulation is **${rain24hSum.toFixed(1)} mm** (${maxProb24h}% peak probability). How can I assist your field operations today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };

  const [messages, setMessages] = useState<readonly ChatMsg[]>([initialMsg]);
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
