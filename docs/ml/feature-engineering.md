# R.A.I. Feature Engineering & Leakage Prevention

## 1. Feature Categories (33 Features)

| Category | Features | Physical & Meteorological Meaning |
|---|---|---|
| **Base Surface Observations** | `temperature_2m`, `relative_humidity_2m`, `surface_pressure`, `wind_speed_10m`, `wind_direction_10m`, `cloud_cover`, `precipitation`, `precipitation_probability` | Instantaneous physical state of surface boundary layer at observation time $t$. |
| **Historical Rain Lags** | `rain_1h`, `rain_3h`, `rain_6h`, `rain_12h`, `rain_24h` | Prior precipitation accumulation reflecting antecedent soil saturation and ongoing storm systems ($\le t$). |
| **NASA Satellite Precipitation** | `satellite_rain_30m`, `satellite_rain_3h`, `satellite_rain_24h` | Spaceborne multi-satellite microwave/IR estimates over $0.1^\circ$ grid cell. |
| **Atmospheric Dynamics (3h Change)** | `pressure_change_3h`, `humidity_change_3h`, `temperature_change_3h`, `wind_speed_change_3h` | Rapid pressure drops and humidity spikes identify approaching convective fronts. |
| **Thermodynamic Proxies** | `dew_point_spread`, `convective_energy_proxy` | $T - T_{\text{dew}}$ measures atmospheric moisture saturation. Convective energy index combines buoyancy with pressure deficits. |
| **Forward Numerical Forecasts** | `forecast_rain_3h`, `forecast_rain_6h`, `forecast_rain_12h`, `forecast_rain_24h`, `precipitation_probability_max` | Output from high-resolution NWP ensemble models available at time $t$. |
| **Temporal Harmonics & Coordinates** | `sin_hour`, `cos_hour`, `sin_month`, `cos_month`, `latitude`, `longitude` | Continuous cyclic encoding of diurnal heating and annual Indian monsoon cycles. |

---

## 2. Zero-Leakage Guarantee

At inference time $t$:
- Features **ONLY** access observations from $\tau \le t$ or numerical forecast model outputs computed before $t$.
- Target $y$ (Ground truth 24h heavy rainfall event) evaluates $\tau \in [t, t+24\text{h}]$.
- No future ground-truth rainfall is ever present in the feature matrix $X(t)$.
