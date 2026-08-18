import { WeatherSnapshot, RaiWeatherData, HourlyWeatherPoint } from '../types/weather';
import { FarmProfile, FarmerLocation, FarmCrop } from '../types/farmer';

export interface FarmerAiContext {
  readonly farmProfile: FarmProfile;
  readonly farmerLocation: FarmerLocation;
  readonly activeCrop: FarmCrop;
  readonly weatherData: RaiWeatherData | null;
  readonly language?: 'en' | 'hi';
  readonly conversationHistory?: readonly { role: 'user' | 'assistant'; content: string }[];
}

export type FarmerAiIntent =
  | 'CROP_RAINFALL_IMPACT'
  | 'IRRIGATION_DECISION'
  | 'WATERLOGGING_DRAINAGE_RISK'
  | 'CROP_WEATHER_ACTION'
  | 'CROP_STAGE_GUIDANCE'
  | 'SPRAYING_WINDOW'
  | 'INTENSIFIED_RAIN_RISK'
  | 'GENERAL_WEATHER';

class FarmerAiService {
  /**
   * Evaluates user prompt and conversation history to determine the exact agricultural intent.
   */
  public classifyIntent(query: string, history: readonly { role: 'user' | 'assistant'; content: string }[] = []): FarmerAiIntent {
    const q = query.toLowerCase().trim();

    // 1. Check for Intensified Rain Risk Protocol
    if (
      q.includes('if it rains more') ||
      q.includes('heavier') ||
      q.includes('heavier than expected') ||
      q.includes('intensif') ||
      q.includes('extreme') ||
      q.includes('cloudburst') ||
      q.includes('very heavy') ||
      q.includes('zyada barish') ||
      q.includes('tez barish') ||
      q.includes('ज्यादा बारिश')
    ) {
      return 'INTENSIFIED_RAIN_RISK';
    }

    // 2. Check for Irrigation Decisions
    if (
      q.includes('irrigate') ||
      q.includes('irrigation') ||
      q.includes('watering') ||
      q.includes('paani') ||
      q.includes('tubewell') ||
      q.includes('canal') ||
      q.includes('sinchai') ||
      q.includes('सिंचाई') ||
      q.includes('pani dena') ||
      (q.includes('should i') && (q.includes('water') || q.includes('irrigate')))
    ) {
      return 'IRRIGATION_DECISION';
    }

    // 3. Check for Waterlogging / Drainage
    if (
      q.includes('waterlog') ||
      q.includes('drainage') ||
      q.includes('water standing') ||
      q.includes('standing water') ||
      q.includes('ponding') ||
      q.includes('submerg') ||
      q.includes('excess water') ||
      q.includes('paani bharna') ||
      q.includes('जलभराव') ||
      q.includes('जल निकासी')
    ) {
      return 'WATERLOGGING_DRAINAGE_RISK';
    }

    // 4. Check for Spraying Windows
    if (
      q.includes('spray') ||
      q.includes('spraying') ||
      q.includes('pesticide') ||
      q.includes('fungicide') ||
      q.includes('insecticide') ||
      q.includes('foliar') ||
      q.includes('chemical application') ||
      q.includes('छिड़काव') ||
      q.includes('कीटनाशक')
    ) {
      return 'SPRAYING_WINDOW';
    }

    // 5. Check for Crop Stage Guidance
    if (
      (q.includes('stage') || q.includes('vegetative') || q.includes('tillering') || q.includes('flowering') || q.includes('growth') || q.includes('चरण') || q.includes('अवस्था')) &&
      (q.includes('what should i do at') || q.includes('guidance') || q.includes('requirements') || q.includes('care') || q.includes('management') || q.includes('nutrition') || q.includes('how to manage'))
    ) {
      return 'CROP_STAGE_GUIDANCE';
    }

    // 6. Check for Crop Weather Action / Field Operations
    if (
      (q.includes('what should i do') || q.includes('what to do') || q.includes('action') || q.includes('precaution') || q.includes('operations') || q.includes('measures') || q.includes('fertilizer') || q.includes('urea') || q.includes('dap') || q.includes('क्या करें') || q.includes('क्या करना चाहिए')) &&
      (q.includes('rain') || q.includes('weather') || q.includes('wheat') || q.includes('crop') || q.includes('field') || q.includes('khet') || q.includes('fasal') || q.includes('kisan'))
    ) {
      return 'CROP_WEATHER_ACTION';
    }

    // 7. Check for Crop-Rainfall Impact
    if (
      (q.includes('affect') || q.includes('impact') || q.includes('effect') || q.includes('damage') || q.includes('harm') || q.includes('good or bad') || q.includes('safe for') || q.includes('will this rain') || q.includes('risk to') || q.includes('consequence') || q.includes('असर') || q.includes('नुकसान') || q.includes('प्रभाव')) &&
      (q.includes('wheat') || q.includes('crop') || q.includes('plant') || q.includes('paddy') || q.includes('vegetative') || q.includes('field') || q.includes('farm') || q.includes('gehun') || q.includes('fasal') || q.includes('गेहूं') || q.includes('फसल'))
    ) {
      return 'CROP_RAINFALL_IMPACT';
    }

    // 8. Multi-turn Follow-up Context Resolution
    const lastRaiMsg = history.filter((h) => h.role === 'assistant').slice(-1)[0]?.content.toLowerCase() || '';
    const lastUserMsg = history.filter((h) => h.role === 'user').slice(-2, -1)[0]?.content.toLowerCase() || '';

    if (q.includes('what about') || q.includes('and what') || q.includes('how about')) {
      if (q.includes('irrigation') || q.includes('water') || q.includes('sinchai')) return 'IRRIGATION_DECISION';
      if (q.includes('drainage') || q.includes('waterlog') || q.includes('jalbhirav')) return 'WATERLOGGING_DRAINAGE_RISK';
      if (q.includes('spray') || q.includes('pesticide')) return 'SPRAYING_WINDOW';
      if (q.includes('fertilizer') || q.includes('urea')) return 'CROP_WEATHER_ACTION';
      if (lastUserMsg.includes('wheat') || lastUserMsg.includes('crop') || lastRaiMsg.includes('wheat') || q.includes('fasal')) {
        return 'CROP_RAINFALL_IMPACT';
      }
    }

    // 9. Check for General Weather Inquiries
    if (
      q.includes('weather') ||
      q.includes('forecast') ||
      q.includes('temperature') ||
      q.includes('humidity') ||
      q.includes('mausam') ||
      q.includes('how is the weather') ||
      q.includes('current conditions') ||
      q.includes('what is the weather at my farm') ||
      q.includes('rain today') ||
      q.includes('will it rain')
    ) {
      return 'GENERAL_WEATHER';
    }

    // 10. Fallback on explicit crop references
    if (q.includes('wheat') || q.includes('crop')) {
      return 'CROP_RAINFALL_IMPACT';
    }

    return 'GENERAL_WEATHER';
  }

  /**
   * Generates factual, location-grounded responses tailored to farmer profile and live telemetry.
   * Clean, practical, humanized language without raw asterisk formatting.
   */
  public generateResponse(query: string, context: FarmerAiContext): { text: string; intent: FarmerAiIntent } {
    const history = context.conversationHistory || [];
    const intent = this.classifyIntent(query, history);

    const { farmProfile, farmerLocation, activeCrop, weatherData } = context;
    const curr = weatherData?.current;
    const hourly: readonly HourlyWeatherPoint[] = weatherData?.hourly || [];

    const next24h = hourly.slice(0, 24);
    const rain24hSum = next24h.reduce((sum: number, h: HourlyWeatherPoint) => sum + (h.precipitation || 0), 0);
    const maxProb24h = next24h.reduce((max: number, h: HourlyWeatherPoint) => Math.max(max, h.precipitationProbability || 0), 0);

    const rainHours = next24h.filter((h: HourlyWeatherPoint) => (h.precipitation || 0) > 0 || (h.precipitationProbability || 0) >= 30);
    let peakRainTimeStr = '';
    if (rainHours.length > 0) {
      const peakHour = rainHours.reduce((prev: HourlyWeatherPoint, current: HourlyWeatherPoint) =>
        (current.precipitation || 0) > (prev.precipitation || 0) ? current : prev
      );
      const hourDate = new Date(peakHour.time);
      peakRainTimeStr = hourDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    const weatherCondition = this.getGroundedCondition(curr, rain24hSum);

    const isHindi =
      context.language === 'hi' ||
      /[\u0900-\u097F]/.test(query) ||
      /\b(kya|hogi|hoga|hain|hai|kare|karo|batao|barish|baarish|sinchai|kisan|khatra|fasal|gehun|pani|kab|kitni|kitna|kaise)\b/i.test(query);

    // Missing profile check: do not hallucinate missing crop parameters
    if (
      (!activeCrop || !activeCrop.name || activeCrop.name.trim() === '') &&
      (intent === 'CROP_RAINFALL_IMPACT' || intent === 'CROP_STAGE_GUIDANCE' || intent === 'SPRAYING_WINDOW')
    ) {
      if (isHindi) {
        return {
          text: 'फसल-विशिष्ट और सटीक कृषि सलाह के लिए, कृपया अपनी मुख्य फसल (जैसे गेहूं, धान, सरसों, कपास) और विकास चरण को /farmer/setup पर दर्ज करें या हमें बताएं कि आप कौन सी फसल उगा रहे हैं।',
          intent,
        };
      }
      return {
        text: 'To provide accurate, crop-specific agronomic advice, please configure your active crop, variety, and growth stage at /farmer/setup, or specify which crop you are inquiring about (e.g., Wheat, Rice/Paddy, Mustard, Cotton).',
        intent,
      };
    }

    if (isHindi) {
      return {
        text: this.generateHindiFarmerResponse({
          intent,
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
          peakRainTimeStr,
          weatherCondition,
        }),
        intent,
      };
    }

    let text = '';

    switch (intent) {
      case 'CROP_RAINFALL_IMPACT':
        text = this.generateCropRainfallImpactResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
          peakRainTimeStr,
          weatherCondition,
        });
        break;

      case 'IRRIGATION_DECISION':
        text = this.generateIrrigationResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
          peakRainTimeStr,
        });
        break;

      case 'WATERLOGGING_DRAINAGE_RISK':
        text = this.generateWaterloggingResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
        });
        break;

      case 'CROP_WEATHER_ACTION':
        text = this.generateCropWeatherActionResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
          peakRainTimeStr,
        });
        break;

      case 'CROP_STAGE_GUIDANCE':
        text = this.generateCropStageGuidanceResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
        });
        break;

      case 'SPRAYING_WINDOW':
        text = this.generateSprayingWindowResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
        });
        break;

      case 'INTENSIFIED_RAIN_RISK':
        text = this.generateIntensifiedRainResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
        });
        break;

      case 'GENERAL_WEATHER':
      default:
        text = this.generateGeneralWeatherResponse({
          farmProfile,
          farmerLocation,
          activeCrop,
          curr,
          rain24hSum,
          maxProb24h,
          peakRainTimeStr,
          weatherCondition,
        });
        break;
    }

    return { text, intent };
  }

  private getGroundedCondition(curr?: WeatherSnapshot, rain24hSum: number = 0): string {
    if (!curr) return 'Clear to Partly Cloudy';

    const cond = curr.weatherCondition || '';
    if (cond.toLowerCase().includes('hail') || cond.toLowerCase().includes('severe thunderstorm')) {
      if (curr.precipitation < 2.0 && curr.windSpeed < 25) {
        return curr.precipitation > 0 ? 'Overcast with Rain Showers' : 'Overcast with Rain Potential';
      }
    }

    if (cond && cond !== 'Atmospheric Conditions') return cond;

    if (curr.precipitation > 4.0) return 'Heavy Rain';
    if (curr.precipitation > 0.5) return 'Moderate Rain';
    if (curr.precipitation > 0) return 'Light Rain';
    if (curr.cloudCover > 80) return 'Overcast';
    if (curr.cloudCover > 40) return 'Partly Cloudy';
    if (rain24hSum > 5.0) return 'Cloudy with Rain Expected';

    return 'Mainly Clear';
  }

  private generateCropRainfallImpactResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
    peakRainTimeStr: string;
    weatherCondition: string;
  }): string {
    const { farmProfile, farmerLocation, activeCrop, curr, rain24hSum, maxProb24h, peakRainTimeStr } = data;
    const isModerateOrHighRain = rain24hSum >= 5.0;

    const fieldName = activeCrop.fieldName || 'North Plot';
    const tolerance = (activeCrop.maxWaterTolerance || 'moderate').toLowerCase();

    let response = `Rainfall impact assessment for ${activeCrop.name} (${activeCrop.currentStage}) at ${farmerLocation.village}, ${farmerLocation.district}:\n\n`;

    response += `Current field weather:\n`;
    response += `• Expected 24h rain: ${rain24hSum.toFixed(1)} mm (Rain chance: ${maxProb24h}%${peakRainTimeStr ? ` around ${peakRainTimeStr}` : ''})\n`;
    response += `• Temperature: ${curr?.temperature.toFixed(1) || 28}°C | Humidity: ${curr?.humidity || 85}%\n`;
    response += `• Soil type: ${farmProfile.soilType} (${fieldName})\n\n`;

    response += `What this means for your wheat:\n`;
    if (isModerateOrHighRain) {
      response += `• Soil moisture: ${rain24hSum.toFixed(1)} mm will recharge root-zone moisture, so hold off on tubewell or canal irrigation.\n`;
      response += `• Waterlogging: Wheat at the vegetative stage has ${tolerance} waterlogging tolerance. Ensure standing water does not stay over 12–24 hours.\n`;
      response += `• Fertilizer: Do not broadcast urea right now to prevent leaching and nutrient wash-off.\n\n`;
      response += `What to do:\n`;
      response += `• Keep field drainage furrows in ${fieldName} clear of blockages.\n`;
      response += `• Postpone any fertilizer top-dressing until the soil surface dries.`;
    } else {
      response += `• Stable growing conditions: Minimal rainfall (${rain24hSum.toFixed(1)} mm) poses zero waterlogging risk.\n`;
      response += `• Growth: Root development and tillering can proceed normally.\n\n`;
      response += `What to do:\n`;
      response += `• Regular irrigation and field maintenance can continue as scheduled.`;
    }

    return response;
  }

  private generateIrrigationResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
    peakRainTimeStr: string;
  }): string {
    const { farmProfile, activeCrop, curr, rain24hSum, maxProb24h, peakRainTimeStr } = data;
    const fieldName = activeCrop.fieldName || 'North Plot';
    const shouldHold = rain24hSum >= 4.0 || maxProb24h >= 45 || (curr?.precipitation || 0) > 0;

    if (shouldHold) {
      let response = `I'd hold off on irrigation for the next 24–48 hours.\n\n`;

      response += `Why:\n`;
      response += `• Rain is expected: ${rain24hSum.toFixed(1)} mm (Rain chance: ${maxProb24h}%${peakRainTimeStr ? ` near ${peakRainTimeStr}` : ''})\n`;
      response += `• Humidity is high: ${curr?.humidity || 90}%\n`;
      response += `• Your crop: ${activeCrop.name} (${activeCrop.currentStage})\n`;
      response += `• Soil type: ${farmProfile.soilType} (${fieldName})\n\n`;

      response += `What to do:\n`;
      response += `• Hold irrigation for now to save water and electricity.\n`;
      response += `• Keep field drainage outlets clear.\n`;
      response += `• Check topsoil moisture again after the rain before deciding to irrigate.`;

      return response;
    }

    let response = `You can proceed with scheduled irrigation.\n\n`;

    response += `Why:\n`;
    response += `• 24-hour rainfall forecast is minimal: ${rain24hSum.toFixed(1)} mm (${maxProb24h}% chance)\n`;
    response += `• Your crop: ${activeCrop.name} (${activeCrop.currentStage})\n`;
    response += `• Soil moisture need: Wheat at tillering stage requires steady moisture (60–70% field capacity).\n\n`;

    response += `What to do:\n`;
    response += `• Apply uniform light irrigation across ${fieldName}.\n`;
    response += `• Best timing is early morning or late afternoon.`;

    return response;
  }

  private generateWaterloggingResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
  }): string {
    const { farmProfile, farmerLocation, activeCrop, rain24hSum, maxProb24h } = data;
    const fieldName = activeCrop.fieldName || 'North Plot';
    const tolerance = (activeCrop.maxWaterTolerance || 'moderate').toLowerCase();

    let response = `Waterlogging and drainage assessment for ${fieldName} (${farmerLocation.village}, ${farmerLocation.district}):\n\n`;

    response += `Field context:\n`;
    response += `• Expected 24h rain: ${rain24hSum.toFixed(1)} mm (Rain chance: ${maxProb24h}%)\n`;
    response += `• Crop tolerance: ${activeCrop.name} has ${tolerance} tolerance to standing water.\n`;
    response += `• Soil type: ${farmProfile.soilType}\n\n`;

    if (rain24hSum >= 15.0) {
      response += `Drainage status: ELEVATED DRAINAGE RISK\n\n`;
      response += `What this means:\n`;
      response += `• ${farmProfile.soilType} will absorb rain steadily, but a ${rain24hSum.toFixed(1)} mm shower can cause temporary surface ponding in low spots.\n`;
      response += `• Wheat roots undergo oxygen stress if submerged longer than 12–24 hours.\n\n`;
      response += `What to do:\n`;
      response += `• Clear field perimeter drainage outlets in ${activeCrop.fieldName}.\n`;
      response += `• Cut shallow release furrows in low sectors to channel runoff into farm ditches.`;
    } else {
      response += `Drainage status: LOW WATERLOGGING RISK\n\n`;
      response += `What this means:\n`;
      response += `• The projected ${rain24hSum.toFixed(1)} mm rain will easily infiltrate your ${farmProfile.soilType} without standing water.\n\n`;
      response += `What to do:\n`;
      response += `• Maintain standard field bunds as usual.`;
    }

    return response;
  }

  private generateCropWeatherActionResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
    peakRainTimeStr: string;
  }): string {
    const { farmProfile, farmerLocation, activeCrop, curr, rain24hSum, maxProb24h, peakRainTimeStr } = data;

    const fieldName = activeCrop.fieldName || 'North Plot';
    let response = `Recommended actions for ${activeCrop.name} at ${farmerLocation.village}, ${farmerLocation.district}:\n\n`;

    response += `Weather outlook:\n`;
    response += `• Expected rain: ${rain24hSum.toFixed(1)} mm (${maxProb24h}% chance${peakRainTimeStr ? ` around ${peakRainTimeStr}` : ''})\n`;
    response += `• Wind: ${curr?.windSpeed.toFixed(1) || 10} km/h | Humidity: ${curr?.humidity || 85}%\n\n`;

    response += `Priority actions:\n`;
    response += `• Fertilizer: Do not apply urea or top-dress nitrogen right before or during rain on ${farmProfile.soilType} to avoid nutrient wash-off.\n`;
    response += `• Drainage: Check that outlet channels in ${fieldName} are open and clear.\n`;
    response += `• Spraying: Postpone any pesticide or foliar spray until 24–48 hours after rain.\n`;
    response += `• Field check: Inspect soil aeration 48 hours after rainfall.`;

    return response;
  }

  private generateCropStageGuidanceResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
  }): string {
    const { farmProfile, farmerLocation, activeCrop, curr, rain24hSum } = data;
    const fieldName = activeCrop.fieldName || 'North Plot';

    let response = `Crop guidance for ${activeCrop.name} at ${activeCrop.currentStage} stage (${farmerLocation.village}, ${farmerLocation.district}):\n\n`;

    response += `Field context:\n`;
    response += `• Field: ${fieldName} (${farmProfile.soilType})\n`;
    response += `• 24h expected rain: ${rain24hSum.toFixed(1)} mm\n`;
    response += `• Humidity: ${curr?.humidity || 80}%\n\n`;

    response += `Key stage recommendations:\n`;
    response += `• Root health: Crown roots are actively expanding. Maintain moist soil without waterlogging.\n`;
    response += `• Nutrition: First split of nitrogen (Urea @ 30–35 kg/acre) is recommended only after heavy rain passes.\n`;
    response += `• Disease watch: High humidity favors early leaf blight and weeds—scout the crop once leaves dry.`;

    return response;
  }

  private generateSprayingWindowResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
  }): string {
    const { farmerLocation, activeCrop, curr, rain24hSum, maxProb24h } = data;
    const isSafe = rain24hSum < 1.0 && maxProb24h < 30 && (curr?.windSpeed || 0) < 18 && (curr?.precipitation || 0) === 0;

    let response = `Spraying window assessment for ${activeCrop.name} in ${farmerLocation.village}:\n\n`;

    response += `Current conditions:\n`;
    response += `• Rain forecast: ${rain24hSum.toFixed(1)} mm (${maxProb24h}% chance)\n`;
    response += `• Wind speed: ${curr?.windSpeed.toFixed(1) || 12} km/h (safe limit: under 15 km/h)\n\n`;

    if (isSafe) {
      response += `Status: SUITABLE FOR SPRAYING\n\n`;
      response += `What to do:\n`;
      response += `• Conditions are dry and wind is calm. Spraying can be conducted in morning or late afternoon.`;
    } else {
      response += `Status: NOT RECOMMENDED (POSTPONE SPRAYING)\n\n`;
      response += `Why:\n`;
      response += `• Upcoming rain (${rain24hSum.toFixed(1)} mm, ${maxProb24h}% chance) will wash off chemical sprays before leaves absorb them.\n\n`;
      response += `What to do:\n`;
      response += `• Wait until rain clears and leaves have been dry for at least 4–6 hours.`;
    }

    return response;
  }

  private generateIntensifiedRainResponse(data: {
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
  }): string {
    const { farmProfile, farmerLocation, activeCrop } = data;
    const fieldName = activeCrop.fieldName || 'North Plot';

    let response = `Heavy rain action protocol for ${activeCrop.name} in ${farmerLocation.village}:\n\n`;

    response += `If rainfall intensifies beyond current forecasts into a heavy deluge:\n\n`;
    response += `What to do:\n`;
    response += `• Clear field runoff ditches to prevent water ponding past 12 hours.\n`;
    response += `• Check bunds in ${fieldName} to stop topsoil erosion on ${farmProfile.soilType}.\n`;
    response += `• Apply a light foliar spray of 1–2% urea after the soil drains to revive root nutrient uptake.\n`;
    response += `• Scout the field within 48 hours for root rot or fungal symptoms.`;

    return response;
  }

  private generateGeneralWeatherResponse(data: {
    farmProfile?: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
    peakRainTimeStr: string;
    weatherCondition: string;
  }): string {
    const { farmerLocation, activeCrop, curr, rain24hSum, maxProb24h, peakRainTimeStr, weatherCondition } = data;
    const fieldName = activeCrop.fieldName || 'North Plot';

    let response = `Weather summary for your farm in ${farmerLocation.village}, ${farmerLocation.district}:\n\n`;

    response += `Current conditions:\n`;
    response += `• Weather: ${weatherCondition} (${curr?.temperature.toFixed(1) || 30}°C)\n`;
    response += `• Rain right now: ${curr?.precipitation || 0} mm/h\n`;
    response += `• Humidity: ${curr?.humidity || 65}% | Wind: ${curr?.windSpeed.toFixed(1) || 10} km/h\n\n`;

    response += `Rain outlook (next 24 hours):\n`;
    response += `• Expected rain: ${rain24hSum.toFixed(1)} mm\n`;
    response += `• Rain chance: ${maxProb24h}%${peakRainTimeStr ? ` near ${peakRainTimeStr}` : ''}\n\n`;

    if (rain24hSum > 5.0) {
      response += `What to do:\n`;
      response += `• Rain is expected over the next 24 hours. Hold off on irrigation and keep drainage furrows in ${fieldName} clear.`;
    } else {
      response += `What to do:\n`;
      response += `• Conditions are mild. Regular field operations for your ${activeCrop.name} can proceed as normal.`;
    }

    return response;
  }

  private generateHindiFarmerResponse(data: {
    intent: FarmerAiIntent;
    farmProfile: FarmProfile;
    farmerLocation: FarmerLocation;
    activeCrop: FarmCrop;
    curr?: WeatherSnapshot;
    rain24hSum: number;
    maxProb24h: number;
    peakRainTimeStr: string;
    weatherCondition: string;
  }): string {
    const { intent, farmProfile, farmerLocation, activeCrop, curr, rain24hSum, maxProb24h, peakRainTimeStr } = data;
    const fieldName = activeCrop.fieldName || 'North Plot';

    switch (intent) {
      case 'IRRIGATION_DECISION': {
        const holdIrrigation = rain24hSum >= 3.0 || maxProb24h >= 45;
        let resp = `सिंचाई निर्णय सलाह (${activeCrop.name} - ${activeCrop.currentStage}) • ${farmerLocation.village}, ${farmerLocation.district}:\n\n`;
        resp += `खेत का मौसम अवलोकन:\n`;
        resp += `• 24 घंटे में अनुमानित बारिश: ${rain24hSum.toFixed(1)} मिमी (संभावना: ${maxProb24h}%${peakRainTimeStr ? `, समय: ${peakRainTimeStr}` : ''})\n`;
        resp += `• मिट्टी का प्रकार: ${farmProfile.soilType} (${fieldName})\n\n`;
        resp += `कृषि निर्देश:\n`;
        resp += `• यह करें (अनुशंसित):\n  ${holdIrrigation ? 'अगले 24–48 घंटों तक ट्यूबवेल या नहर की सिंचाई रोकें ताकि प्राकृतिक वर्षा जल का लाभ मिले।' : 'सिंचाई की योजना सामान्य रूप से बनाई जा सकती है क्योंकि बारिश की संभावना कम है।'}\n`;
        resp += `• यह न करें (जोखिम):\n  ${holdIrrigation ? 'बारिश से ठीक पहले खेत में अत्यधिक पानी न भरें, इससे मिट्टी में हवा का प्रवाह रुक सकता है।' : 'खेत को आवश्यकता से अधिक सूखा न रहने दें।'}\n`;
        resp += `• बाद में जांचें:\n  बारिश के 24 घंटे बाद मिट्टी में 5 सेमी गहराई पर नमी की जांच करें और उसी के बाद अगली सिंचाई का निर्णय लें।`;
        return resp;
      }

      case 'WATERLOGGING_DRAINAGE_RISK': {
        let resp = `जलभराव एवं जल निकासी प्रबंधन (${activeCrop.name}) • ${farmerLocation.village}:\n\n`;
        resp += `खेत की स्थिति:\n`;
        resp += `• अनुमानित वर्षा: ${rain24hSum.toFixed(1)} मिमी (संभावना: ${maxProb24h}%)\n`;
        resp += `• मिट्टी: ${farmProfile.soilType} (${fieldName})\n\n`;
        resp += `कृषि निर्देश:\n`;
        resp += `• यह करें (अनुशंसित):\n  खेत के कोनों की नालियों और जल निकासी रास्तों को तुरंत साफ रखें ताकि अतिरिक्त पानी आसानी से बाहर निकल सके।\n`;
        resp += `• यह न करें (जोखिम):\n  खेत के निचले हिस्सों में 12–24 घंटे से अधिक समय तक पानी जमा न रहने दें, इससे जड़ों के गलने का खतरा होता है।\n`;
        resp += `• बाद में जांचें:\n  बारिश रुकने के बाद खेत के निचले भागों का निरीक्षण करें और जरूरत पड़ने पर अस्थायी निकास बनाएं।`;
        return resp;
      }

      case 'SPRAYING_WINDOW': {
        const canSpray = rain24hSum < 1.0 && maxProb24h < 30 && (curr?.windSpeed || 10) < 15;
        let resp = `कीटनाशक एवं पोषण छिड़काव खिड़की (${activeCrop.name}) • ${farmerLocation.village}:\n\n`;
        resp += `मौसम स्थिति:\n`;
        resp += `• बारिश की संभावना: ${maxProb24h}% | अनुमानित बारिश: ${rain24hSum.toFixed(1)} मिमी\n`;
        resp += `• हवा की गति: ${curr?.windSpeed.toFixed(1) || 10} km/h\n\n`;
        resp += `कृषि निर्देश:\n`;
        resp += `• यह करें (अनुशंसित):\n  ${canSpray ? 'आज छिड़काव के लिए अनुकूल समय है। हवा की गति कम होने पर छिड़काव करें।' : 'छिड़काव को 24 घंटे के लिए टालें ताकि बारिश में दवा धुल न जाए।'}\n`;
        resp += `• यह न करें (जोखिम):\n  तेज हवा या बारिश की आशंका के दौरान कभी भी पत्तों पर स्प्रे न करें।\n`;
        resp += `• बाद में जांचें:\n  मौसम साफ होने और धूप खिलने के बाद ही नया स्प्रे शेड्यूल निर्धारित करें।`;
        return resp;
      }

      case 'CROP_STAGE_GUIDANCE': {
        let resp = `फसल विकास चरण मार्गदर्शन (${activeCrop.name} - ${activeCrop.currentStage}) • ${farmerLocation.village}:\n\n`;
        resp += `• फसल: ${activeCrop.name} (${activeCrop.variety})\n`;
        resp += `• वर्तमान चरण: ${activeCrop.currentStage} | मिट्टी: ${farmProfile.soilType}\n\n`;
        resp += `कृषि निर्देश:\n`;
        resp += `• यह करें (अनुशंसित):\n  इस चरण में मिट्टी में पर्याप्त नमी बनाए रखें और खरपतवार नियंत्रण पर ध्यान दें।\n`;
        resp += `• यह न करें (जोखिम):\n  असंतुलित उर्वरकों का प्रयोग न करें और बारिश से पहले नाइट्रोजन न डालें।\n`;
        resp += `• बाद में जांचें:\n  फसल के तने और पत्तियों का नियमित निरीक्षण करें ताकि कीटों के प्रकोप का समय पर पता चल सके।`;
        return resp;
      }

      case 'INTENSIFIED_RAIN_RISK': {
        let resp = `अत्यधिक भारी बारिश आपातकालीन प्रोटोकॉल (${activeCrop.name}) • ${farmerLocation.village}:\n\n`;
        resp += `यदि बारिश पूर्वानुमान से अधिक तीव्र हो जाती है:\n\n`;
        resp += `कृषि निर्देश:\n`;
        resp += `• यह करें (अनुशंसित):\n  ${fieldName} में मुख्य जल निकासी चैनल को पूरी तरह खोल दें और मेड़ों को मजबूत करें।\n`;
        resp += `• यह न करें (जोखिम):\n  जलभराव के दौरान कोई भी भारी मशीनरी या ट्रैक्टर खेत में न चलाएं जिससे मिट्टी सख्त न हो।\n`;
        resp += `• बाद में जांचें:\n  पानी निकलने के बाद जड़ों के पुनरुद्धार के लिए 1–2% यूरिया का हल्का पर्णीय छिड़काव (Foliar spray) करें।`;
        return resp;
      }

      case 'CROP_RAINFALL_IMPACT':
      case 'CROP_WEATHER_ACTION':
      case 'GENERAL_WEATHER':
      default: {
        let resp = `खेत मौसम व फसल प्रभाव सारांश (${activeCrop.name} - ${activeCrop.currentStage}) • ${farmerLocation.village}, ${farmerLocation.district}:\n\n`;
        resp += `खेत का वर्तमान मौसम:\n`;
        resp += `• 24 घंटे में अनुमानित बारिश: ${rain24hSum.toFixed(1)} मिमी (संभावना: ${maxProb24h}%${peakRainTimeStr ? `, सबसे तेज: ${peakRainTimeStr}` : ''})\n`;
        resp += `• वर्तमान तापमान: ${curr?.temperature.toFixed(1) || 28}°C | नमी: ${curr?.humidity || 85}%\n`;
        resp += `• मिट्टी: ${farmProfile.soilType} (${fieldName})\n\n`;
        resp += `आपकी फसल के लिए मुख्य कृषि निर्देश:\n`;
        resp += `• यह करें (अनुशंसित):\n  ${rain24hSum >= 5.0 ? 'खेत की जल निकासी नालियों को खुला रखें और बारिश के पानी के प्रबंधन पर ध्यान दें।' : 'खेत के सामान्य कृषि कार्य जारी रखें।'}\n`;
        resp += `• यह न करें (जोखिम):\n  ${rain24hSum >= 5.0 ? 'बारिश से पहले सिंचाई न करें और उर्वरक का छिड़काव रोक कर रखें।' : 'खेत में अनावश्यक पानी का ठहराव न होने दें।'}\n`;
        resp += `• बाद में जांचें:\n  बारिश के बाद खेत की नमी देखकर ही अगली सिंचाई का निर्णय लें।`;
        return resp;
      }
    }
  }
}

export const farmerAiService = new FarmerAiService();
