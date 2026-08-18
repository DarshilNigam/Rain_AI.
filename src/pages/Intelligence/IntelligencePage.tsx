import React, { useState, useEffect, useRef } from 'react';
import {
  Brain,
  Sparkles,
  Send,
  MapPin,
  HelpCircle,
  Clock,
  Compass,
  Thermometer,
  Droplets,
  CloudRain,
  Wind,
  Gauge,
} from 'lucide-react';
import { Container } from '../../components/ui/Container';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { LocationSwitcher } from '../../components/ui/LocationSwitcher';
import { useAuth } from '../../context/AuthContext';
import { useLocationContext } from '../../context/LocationContext';
import { useWeatherData } from '../../hooks/useWeatherData';
import { useI18n } from '../../i18n';
import { intelligenceService } from '../../services/intelligence.service';
import { ChatMessage } from '../../types/intelligence';
import styles from './IntelligencePage.module.css';

const SUGGESTED_PROMPTS_EN = [
  'Will it rain today?',
  'How much rain is expected?',
  'When will the rain be strongest?',
  'Why are you predicting this?',
  'What factors are increasing the risk?',
  'What factors are reducing the risk?',
  'Is this dangerous?',
  'What should a farmer do?',
];

const SUGGESTED_PROMPTS_HI = [
  'आज बारिश होगी क्या?',
  'कितनी बारिश होने की संभावना है?',
  'बारिश कब सबसे तेज होगी?',
  'आप यह भविष्यवाणी क्यों कर रहे हैं?',
  'जोखिम बढ़ाने वाले कारण क्या हैं?',
  'जोखिम कम करने वाले कारण क्या हैं?',
  'क्या यह खतरनाक है?',
  'किसान को अभी क्या करना चाहिए?',
];

export const IntelligencePage: React.FC = () => {
  const { user } = useAuth();
  const { location } = useLocationContext();
  const { weatherData, isLoading: weatherLoading, error: weatherError } = useWeatherData(location);
  const { language } = useI18n();

  const suggestedPrompts = language === 'hi' ? SUGGESTED_PROMPTS_HI : SUGGESTED_PROMPTS_EN;

  const [inputQuery, setInputQuery] = useState<string>('');
  const [isLocationModalOpen, setIsLocationModalOpen] = useState<boolean>(false);
  const [isThinking, setIsThinking] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Ref attached ONLY to the internal chat scroll container to prevent page jumping
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const prevCityRef = useRef<string>(location.city);

  const curr = weatherData?.current;

  // 1. Reset conversation when user changes city location node
  useEffect(() => {
    const isCityChanged = prevCityRef.current !== location.city;
    prevCityRef.current = location.city;

    const initialGreeting: ChatMessage = {
      id: `init-${location.city}-${Date.now()}`,
      sender: 'rai',
      text: curr
        ? `Hello ${user?.fullName ? user.fullName.split(' ')[0] : 'there'}. I am your R.A.I. Intelligence assistant for ${location.city}, ${location.region}. Current verified telemetry reports ${curr.temperature.toFixed(1)}°C with ${curr.weatherCondition.toLowerCase()}, ${curr.humidity}% humidity, and ${curr.precipitation} mm precipitation. What would you like to explore regarding local precipitation risk?`
        : `Hello ${user?.fullName ? user.fullName.split(' ')[0] : 'there'}. I am your R.A.I. Intelligence assistant for ${location.city}, ${location.region}. Connecting to verified meteorological observations for coordinates [${location.lat}° N, ${location.lng}° E]...`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      metadata: {
        locationCity: location.city,
        dataSource: 'Open-Meteo + R.A.I. Meteorological Intelligence',
        weatherTimestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    };

    if (isCityChanged || messages.length === 0) {
      setMessages([initialGreeting]);
    }
  }, [location.city, location.region, location.lat, location.lng, curr?.temperature, curr?.weatherCondition]);

  // 2. Chat-Only Auto-Scroll: scroll strictly the internal message thread container, NOT the window
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [messages, isThinking]);

  // 3. Handle Message Submission
  const handleSendMessage = async (textToSend: string) => {
    const query = textToSend.trim();
    if (!query || isThinking) return;

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputQuery('');
    setIsThinking(true);

    try {
      const response = await intelligenceService.ask(query, {
        user: { name: user?.fullName },
        location,
        weatherData,
        conversationHistory: [...messages, userMessage],
      });

      const raiMessage: ChatMessage = {
        id: `rai-${Date.now()}`,
        sender: 'rai',
        text: response.text,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        metadata: {
          locationCity: location.city,
          dataSource: response.source,
          weatherTimestamp: response.weatherTimestamp,
        },
      };

      setMessages((prev) => [...prev, raiMessage]);
    } catch (err: unknown) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        sender: 'rai',
        text: 'R.A.I. Intelligence is temporarily unavailable. Please try your question again in a moment.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputQuery);
  };

  return (
    <div className={styles.intelligencePageRoot}>
      <Container size="wide" className={styles.pageContainer}>
        {/* Top Location Header Banner */}
        <div className={styles.locationHeaderBanner}>
          <div className={styles.locationHeaderLeft}>
            <div className={styles.iconCircle}>
              <Brain size={22} color="#0891b2" />
            </div>
            <div className={styles.headerMeta}>
              <div className={styles.badgeRow}>
                <Badge variant="ai" showDot>
                  Pillar 01 • R.A.I. Intelligence
                </Badge>
                <span className={styles.contextTag}>
                  {weatherLoading
                    ? 'CONNECTING TO OPEN-METEO...'
                    : weatherError
                    ? 'TELEMETRY OFFLINE'
                    : `NODE: ${location.city.toUpperCase()}`}
                </span>
              </div>
              <h1 className={styles.pageTitle}>R.A.I. INTELLIGENCE</h1>
              <p className={styles.pageSubtitle}>
                Personal Weather Intelligence • 📍 {location.city}, {location.region}
              </p>
            </div>
          </div>

          <div className={styles.headerRight}>
            <button
              type="button"
              className={styles.locationSwitchBtn}
              onClick={() => setIsLocationModalOpen(true)}
              title="Click to switch city location"
            >
              <MapPin size={14} color="#0891b2" />
              <span>{location.city}, {location.region}</span>
              <Compass size={13} className={styles.switchIcon} />
            </button>
          </div>
        </div>

        {/* Main Chat Layout + Weather Context Telemetry */}
        <div className={styles.mainChatLayout}>
          {/* Left Column: Conversational AI Window */}
          <div className={styles.chatWindowPane}>
            <div className={styles.chatHeader}>
              <div className={styles.chatHeaderLeft}>
                <span className={styles.chatTitle}>Active Conversation Stream</span>
                <span className={styles.chatSub}>
                  Scoped to {location.city} ({location.lat.toFixed(2)}°N, {location.lng.toFixed(2)}°E)
                </span>
              </div>
              <div className={styles.liveIndicator}>
                <div className={weatherError ? styles.errorDot : styles.liveDot} />
                <span>
                  {weatherLoading
                    ? 'Connecting Telemetry...'
                    : weatherError
                    ? 'Offline'
                    : 'Real Context Active'}
                </span>
              </div>
            </div>

            <div ref={messagesContainerRef} className={styles.messagesThread}>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={m.sender === 'user' ? styles.userMessageRow : styles.raiMessageRow}
                >
                  <div className={m.sender === 'user' ? styles.userBubble : styles.raiBubble}>
                    {m.sender === 'rai' && (
                      <div className={styles.bubbleSenderHeader}>
                        <Sparkles size={13} color="#0891b2" />
                        <span>R.A.I. Weather Intelligence</span>
                      </div>
                    )}
                    <div className={styles.messageTextFormatted}>
                      {m.text.split('\n\n').map((para, i) => (
                        <p key={i} className={styles.messagePara}>
                          {para}
                        </p>
                      ))}
                    </div>

                    <div className={styles.bubbleFooter}>
                      {m.metadata?.dataSource && (
                        <span className={styles.sourceMetaText}>
                          Based on {m.metadata.locationCity} telemetry
                        </span>
                      )}
                      <span className={styles.messageTime}>{m.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}

              {isThinking && (
                <div className={styles.raiMessageRow}>
                  <div className={styles.raiBubble}>
                    <div className={styles.thinkingWrapper}>
                      <div className={styles.thinkingSpinner} />
                      <span className={styles.thinkingText}>
                        {language === 'hi' ? `R.A.I. ${location.city} के मौसम डेटा का विश्लेषण कर रहा है...` : `R.A.I. is analyzing local weather for ${location.city}...`}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.suggestionsStrip}>
              <div className={styles.suggestionsHeadingRow}>
                <HelpCircle size={12} color="#0891b2" />
                <span className={styles.suggestionsHeading}>
                  {language === 'hi' ? `${location.city.toUpperCase()} के लिए सुझाए गए प्रश्न:` : `SUGGESTED QUESTIONS FOR ${location.city.toUpperCase()}:`}
                </span>
              </div>
              <div className={styles.suggestionsScroll}>
                {suggestedPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    className={styles.quickPromptBtn}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isThinking}
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className={styles.chatInputForm}>
              <input
                type="text"
                placeholder={language === 'hi' ? `${location.city} में बारिश, आंधी या मौसम के कारणों के बारे में पूछें...` : `Ask R.A.I. about rainfall, storm risk, or weather drivers in ${location.city}...`}
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                disabled={isThinking}
                className={styles.queryInput}
              />
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={!inputQuery.trim() || isThinking}
                trailingIcon={<Send size={14} />}
                style={{ backgroundColor: '#0891b2' }}
              >
                Send
              </Button>
            </form>
          </div>

          <div className={styles.xaiContextPane}>
            {/* Real Weather Observations Card */}
            <Card variant="aiAccent" padding="md" className={styles.xaiCard}>
              <div className={styles.cardHeaderTop}>
                <div>
                  <span className={styles.xaiCardTag}>{location.city.toUpperCase()} TELEMETRY</span>
                  <h3 className={styles.xaiCardTitle}>Live Atmospheric Context</h3>
                </div>
                <div className={styles.coordsMiniBadge}>
                  {location.lat.toFixed(2)}°N, {location.lng.toFixed(2)}°E
                </div>
              </div>

              <p className={styles.xaiCardDesc}>
                All AI explanations are grounded in verified real-time Open-Meteo observations for {location.city}.
              </p>

              {curr ? (
                <div className={styles.telemetryGrid}>
                  <div className={styles.telemetryStatBox}>
                    <Thermometer size={14} color="#0284c7" />
                    <div>
                      <span className={styles.statLabel}>Temperature</span>
                      <span className={styles.statValue}>{curr.temperature.toFixed(1)}°C</span>
                    </div>
                  </div>
                  <div className={styles.telemetryStatBox}>
                    <CloudRain size={14} color="#0891b2" />
                    <div>
                      <span className={styles.statLabel}>Condition</span>
                      <span className={styles.statValue}>{curr.weatherCondition}</span>
                    </div>
                  </div>
                  <div className={styles.telemetryStatBox}>
                    <Droplets size={14} color="#06b6d4" />
                    <div>
                      <span className={styles.statLabel}>Humidity</span>
                      <span className={styles.statValue}>{curr.humidity}%</span>
                    </div>
                  </div>
                  <div className={styles.telemetryStatBox}>
                    <Wind size={14} color="#64748b" />
                    <div>
                      <span className={styles.statLabel}>Wind Speed</span>
                      <span className={styles.statValue}>{curr.windSpeed.toFixed(1)} km/h</span>
                    </div>
                  </div>
                  <div className={styles.telemetryStatBox}>
                    <Gauge size={14} color="#64748b" />
                    <div>
                      <span className={styles.statLabel}>Pressure</span>
                      <span className={styles.statValue}>{curr.pressure.toFixed(0)} hPa</span>
                    </div>
                  </div>
                  <div className={styles.telemetryStatBox}>
                    <CloudRain size={14} color="#06b6d4" />
                    <div>
                      <span className={styles.statLabel}>Precipitation</span>
                      <span className={styles.statValue}>{curr.precipitation} mm</span>
                    </div>
                  </div>
                </div>
              ) : weatherLoading ? (
                <div className={styles.telemetryLoadingBox}>
                  <span>Connecting to local weather intelligence for {location.city}...</span>
                </div>
              ) : (
                <div className={styles.telemetryLoadingBox}>
                  <span>{weatherError || 'Local weather intelligence temporarily unavailable.'}</span>
                </div>
              )}

              <div className={styles.telemetryMetadataList}>
                <div className={styles.metaItem}>
                  <MapPin size={14} color="#0891b2" />
                  <div>
                    <span className={styles.metaLabel}>Active Geographic Coordinates</span>
                    <span className={styles.metaValue}>
                      {location.lat.toFixed(4)}° N, {location.lng.toFixed(4)}° E ({location.region})
                    </span>
                  </div>
                </div>

                <div className={styles.metaItem}>
                  <Clock size={14} color="#0891b2" />
                  <div>
                    <span className={styles.metaLabel}>Telemetry Source</span>
                    <span className={styles.metaValue}>Open-Meteo Forecast API (CC BY 4.0)</span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Architecture Card: Active Calibrated XGBoost + TreeSHAP Integration */}
            <Card variant="ice" padding="md" className={styles.xaiArchitectureCard}>
              <div className={styles.archHeader}>
                <Sparkles size={16} color="#0284c7" />
                <h4 className={styles.archTitle}>Active XAI Pipeline</h4>
              </div>
              <p className={styles.archText}>
                R.A.I. synthesizes live Open-Meteo telemetry with calibrated XGBoost heavy-rainfall probabilities ($\tau = 1.5\%$) and exact TreeSHAP feature attributions across 35,000+ domain concepts.
              </p>
            </Card>
          </div>
        </div>
      </Container>

      {/* City Location Switcher Modal */}
      <LocationSwitcher
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
      />
    </div>
  );
};
