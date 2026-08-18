# R.A.I. Training Dataset Specification

## 1. Study Region & Controlled Spatial Grid

The training dataset covers **10 representative meteorological stations** across India's high-risk monsoon corridors and agricultural basins:

1. **Ahmedabad, Gujarat** ($23.0225^\circ\text{N}, 72.5714^\circ\text{E}$) - Western Semi-Arid/Monsoon Convective
2. **Lakhimpur, Uttar Pradesh** ($27.9468^\circ\text{N}, 80.7788^\circ\text{E}$) - Terai Agricultural Belt
3. **Mumbai, Maharashtra** ($19.0760^\circ\text{N}, 72.8777^\circ\text{E}$) - Coastal Konkan Heavy Monsoon
4. **Chennai, Tamil Nadu** ($13.0827^\circ\text{N}, 80.2707^\circ\text{E}$) - Northeast Retreating Monsoon Belt
5. **Kolkata, West Bengal** ($22.5726^\circ\text{N}, 88.3639^\circ\text{E}$) - Gangetic Delta & Tropical Cyclonic
6. **New Delhi, Delhi** ($28.6139^\circ\text{N}, 77.2090^\circ\text{E}$) - Northern Plains Monsoon Inflow
7. **Karnal, Haryana** ($29.6857^\circ\text{N}, 76.9905^\circ\text{E}$) - Intensive Agricultural Plains
8. **Ludhiana, Punjab** ($30.9010^\circ\text{N}, 75.8573^\circ\text{E}$) - Indus Basin Agriculture
9. **Nashik, Maharashtra** ($19.9975^\circ\text{N}, 73.7898^\circ\text{E}$) - Western Ghats Rain Shadow / Horticulture
10. **Patna, Bihar** ($25.5941^\circ\text{N}, 85.1376^\circ\text{E}$) - Middle Ganga Floodplain

---

## 2. Dataset Temporal Span & Partitioning

- **Total Records Ingested**: 175,440 hourly records (2023-01-01 to 2024-12-31).
- **Time Partitions**:
  - **Training Partition (70%)**: 122,800 records (`2023-01-01 00:00:00` to `2024-05-26 15:00:00`)
  - **Validation Partition (15%)**: 26,320 records (`2024-05-26 16:00:00` to `2024-09-13 07:00:00`)
  - **Unseen Future Test Partition (15%)**: 26,320 records (`2024-09-13 08:00:00` to `2024-12-31 23:00:00`)
